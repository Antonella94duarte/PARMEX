import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import {
  createRecipient, readPublicKey, seal, openPackage, createTrackingCode, hashCode,
  normalizeCode, normalizeFolio, sameSecret, MAX_ATTACHMENT, MAX_PACKAGE
} from './crypto.mjs';

const sample = {
  answers: { situacion: 'Otra situación', ambito: 'Municipal o alcaldía', continua: 'No estoy seguro' },
  story: 'Caso ficticio en Valle Inventado.\n<em>Texto literal</em> y acentos.',
  name: 'evidencia-ficticia-á.txt',
  bytes: new TextEncoder().encode('Bytes de prueba: á\r\n\0'),
  code: 'ABCDEFGHJK'
};
let authority;
let other;
let publicKey;
let packet;

before(async () => {
  [authority, other] = await Promise.all([createRecipient(), createRecipient()]);
  publicKey = await readPublicKey(authority.publicFile);
  packet = await seal(sample, publicKey);
});

test('la clave pública conserva la huella y la privada no se puede exportar', async () => {
  assert.deepEqual(Object.keys(JSON.parse(authority.publicFile)), ['version', 'spki']);
  assert.equal(publicKey.keyId, authority.keyId);
  assert.equal(authority.privateKey.extractable, false);
  await assert.rejects(crypto.subtle.exportKey('pkcs8', authority.privateKey), { name: 'InvalidAccessError' });
  await assert.rejects(readPublicKey('{"version":1,"spki":"AA=="}'), /inválida/);
});

test('el relato, las respuestas, el nombre, los bytes y el código se recuperan sin cambios', async () => {
  const result = await openPackage(JSON.stringify(packet), authority);
  assert.deepEqual(result, { folio: packet.folio, ...sample });
});

test('el archivo solo contiene los campos públicos previstos', () => {
  assert.deepEqual(Object.keys(packet), ['version', 'folio', 'keyId', 'nonce', 'wrappedKey', 'ciphertext']);
  const json = JSON.stringify(packet);
  for (const value of [...Object.values(sample.answers), sample.story, sample.name, sample.code,
    Buffer.from(sample.bytes).toString('base64'), 'privateKey']) assert.ok(!json.includes(value));
});

test('una clave distinta falla con o sin el identificador esperado', async () => {
  await assert.rejects(openPackage(JSON.stringify(packet), other), /otra clave receptora/);
  await assert.rejects(openPackage(JSON.stringify(packet), {
    privateKey: other.privateKey, keyId: authority.keyId
  }), /No se pudo autenticar/);
});

test('alterar el contenido cifrado, el folio o el identificador autenticado falla', async () => {
  const bytes = Buffer.from(packet.ciphertext, 'base64');
  bytes[0] ^= 1;
  const changes = [
    { ciphertext: bytes.toString('base64') },
    { folio: (packet.folio[0] === '0' ? '1' : '0') + packet.folio.slice(1) },
    { keyId: other.keyId }
  ];
  for (const change of changes) {
    const altered = { ...packet, ...change };
    await assert.rejects(openPackage(JSON.stringify(altered), { ...authority, keyId: altered.keyId }),
      /No se pudo autenticar/);
  }
});

test('rechaza JSON malformado, versión incompatible, Base64 inválida y paquete sobredimensionado', async () => {
  await assert.rejects(openPackage('{', authority), /JSON válido/);
  await assert.rejects(openPackage(JSON.stringify({ ...packet, version: 2 }), authority), /incompatible/);
  await assert.rejects(openPackage(JSON.stringify({ ...packet, nonce: '%' }), authority), /binarios inválidos/);
  await assert.rejects(openPackage(' '.repeat(MAX_PACKAGE + 1), authority), /2 MiB/);
});

test('acepta 1 MiB exacto y rechaza un byte adicional', async () => {
  const bytes = new Uint8Array(MAX_ATTACHMENT);
  bytes[0] = 255;
  bytes[bytes.length - 1] = 127;
  const payload = { ...sample, bytes, story: '\0'.repeat(12000) };
  const large = JSON.stringify(await seal(payload, publicKey));
  assert.ok(Buffer.byteLength(large) < MAX_PACKAGE);
  assert.deepEqual((await openPackage(large, authority)).bytes, bytes);
  await assert.rejects(seal({ ...sample, bytes: new Uint8Array(MAX_ATTACHMENT + 1) }, publicKey), /1 MiB/);
});

test('dos cifrados del mismo contenido generan folios, nonces y claves AES distintas', async () => {
  const second = await seal(sample, publicKey);
  assert.notEqual(second.folio, packet.folio);
  assert.notEqual(second.nonce, packet.nonce);
  async function unwrap({ wrappedKey }) {
    return new Uint8Array(await crypto.subtle.decrypt('RSA-OAEP', authority.privateKey, Buffer.from(wrappedKey, 'base64')));
  }
  assert.notDeepEqual(await unwrap(second), await unwrap(packet));
});

test('el código de seguimiento usa el alfabeto previsto y no se repite', () => {
  const codes = new Set();
  for (let index = 0; index < 300; index += 1) {
    const code = createTrackingCode();
    assert.match(code, /^[A-HJ-NP-Z2-9]{10}$/);
    codes.add(code);
  }
  assert.ok(codes.size > 290, 'se esperaban códigos distintos');
  assert.equal(normalizeCode('abcde-fghjk'), 'ABCDEFGHJK');
  assert.equal(normalizeCode(' ABCD EFGH JK '), 'ABCDEFGHJK');
  assert.equal(normalizeFolio('ABCDEF0123456789ABCDEF0123456789'), 'abcdef0123456789abcdef0123456789');
});

test('el verificador depende del código y del folio, y nunca es el código', async () => {
  const folio = 'a'.repeat(32);
  const first = await hashCode(sample.code, folio);
  const second = await hashCode(sample.code, folio);
  const otherFolio = await hashCode(sample.code, 'b'.repeat(32));
  assert.equal(first, second);
  assert.notEqual(first, otherFolio);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.ok(!first.includes(sample.code));
  await assert.rejects(hashCode('abc', folio), /formato/);
  await assert.rejects(hashCode(sample.code, 'zz'), /formato/);
});

test('la comparación del código acepta solo el verificador exacto', async () => {
  const folio = packet.folio;
  const expected = await hashCode(sample.code, folio);
  assert.equal(sameSecret(expected, await hashCode(sample.code, folio)), true);
  assert.equal(sameSecret(expected, await hashCode('Z'.repeat(10), folio)), false);
  assert.equal(sameSecret(expected, expected.slice(0, 63)), false);
  assert.equal(sameSecret(expected, ''), false);
});

test('el expediente sin código de seguimiento se rechaza', async () => {
  const { code, ...withoutCode } = sample;
  assert.equal(code, sample.code);
  await assert.rejects(seal(withoutCode, publicKey), /código de seguimiento/);
  await assert.rejects(seal({ ...sample, code: 'abcdefghjk' }, publicKey), /código de seguimiento/);
});
