const subtle = globalThis.crypto.subtle;
const encode = new TextEncoder();
const decode = new TextDecoder('utf-8', { fatal: true });
const VERSION = 1;
const RSA = { name: 'RSA-OAEP', hash: 'SHA-256' };
const AES = { name: 'AES-GCM', length: 256 };
const FOLIO = /^[0-9a-f]{32}$/;
const KEY_ID = /^[0-9a-f]{64}$/;
// Sin I, O, 0 ni 1: se confunden al dictarlos o transcribirlos.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE = /^[A-HJ-NP-Z2-9]{10}$/;
const CODE_LENGTH = 10;
const PBKDF2_ITERATIONS = 210000;
export const MAX_ATTACHMENT = 1024 * 1024;
export const MAX_STORY = 12000;
export const MAX_PACKAGE = 2 * 1024 * 1024;
export const MAX_PUBLIC_KEY = 2048;
export const QUESTIONS = [
  { name: 'situacion', label: '¿Qué tipo de situación quieres reportar?', options: [
    'Uso indebido de recursos públicos', 'Solicitud de un pago indebido',
    'Irregularidad en una contratación', 'Favoritismo o conflicto de interés', 'Otra situación', 'No estoy seguro'
  ] },
  { name: 'ambito', label: '¿En qué ámbito de gobierno ocurrió?', options: [
    'Municipal o alcaldía', 'Estatal', 'Federal', 'Otro organismo', 'No estoy seguro'
  ] },
  { name: 'continua', label: '¿El hecho sigue ocurriendo?', options: ['Sí', 'No', 'No estoy seguro'] }
];

function hex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 10 caracteres de 50 bits efectivos: suficiente para un código de seguimiento.
export function createTrackingCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, byte => CODE_ALPHABET[byte & 31]).join('');
}

export function normalizeCode(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z2-9]/g, '');
}

export function normalizeFolio(value) {
  return String(value ?? '').toLowerCase().replace(/[^0-9a-f]/g, '');
}

// Deriva el verificador que guarda la autoridad. El código nunca se almacena.
export async function hashCode(code, folio) {
  if (typeof code !== 'string' || !CODE.test(code)
    || typeof folio !== 'string' || !FOLIO.test(folio)) {
    throw new Error('El folio o el código de seguimiento no tienen el formato esperado.');
  }
  const material = await subtle.importKey('raw', encode.encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({
    name: 'PBKDF2', salt: encode.encode(folio), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256'
  }, material, 256);
  return hex(new Uint8Array(bits));
}

export function sameSecret(expected, received) {
  if (typeof expected !== 'string' || typeof received !== 'string'
    || expected.length !== received.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ received.charCodeAt(index);
  }
  return difference === 0;
}

function base64(bytes) {
  const chunks = [];
  for (let start = 0; start < bytes.length; start += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(start, start + 8192)));
  }
  return btoa(chunks.join(''));
}

function fromBase64(value, max, min = 0) {
  if (typeof value !== 'string' || value.length > 4 * Math.ceil(max / 3)) {
    throw new Error('Campo Base64 fuera de los límites.');
  }
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  if (bytes.length < min || bytes.length > max || base64(bytes) !== value) {
    throw new Error('Campo Base64 inválido.');
  }
  return bytes;
}

function hasFields(value, fields) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === fields.length
    && fields.every(field => Object.hasOwn(value, field));
}

function aad({ version, folio, keyId }) {
  return encode.encode(JSON.stringify([version, folio, keyId]));
}

async function fingerprint(spki) {
  return hex(new Uint8Array(await subtle.digest('SHA-256', spki)));
}

export async function createRecipient() {
  const { publicKey, privateKey } = await subtle.generateKey({
    ...RSA, modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1])
  }, false, ['encrypt', 'decrypt']);
  const spki = await subtle.exportKey('spki', publicKey);
  const keyId = await fingerprint(spki);
  return { privateKey, keyId, publicFile: JSON.stringify({ version: VERSION, spki: base64(new Uint8Array(spki)) }) };
}

export async function readPublicKey(json) {
  try {
    if (typeof json !== 'string' || json.length > MAX_PUBLIC_KEY) throw new Error();
    const data = JSON.parse(json);
    if (!hasFields(data, ['version', 'spki']) || data.version !== VERSION) throw new Error();
    const spki = fromBase64(data.spki, 512, 1);
    const publicKey = await subtle.importKey('spki', spki, RSA, true, ['encrypt']);
    const canonical = new Uint8Array(await subtle.exportKey('spki', publicKey));
    if (publicKey.algorithm.modulusLength !== 3072
      || hex(publicKey.algorithm.publicExponent) !== '010001'
      || base64(canonical) !== data.spki) throw new Error();
    return { publicKey, keyId: await fingerprint(canonical) };
  } catch {
    throw new Error('La clave pública es inválida o incompatible. Usa el archivo exportado por la autoridad.');
  }
}

function validateContent(answers, story, name, bytes, code) {
  if (!hasFields(answers, QUESTIONS.map(question => question.name))
    || QUESTIONS.some(question => !question.options.includes(answers[question.name]))) {
    throw new Error('Responde las tres preguntas de orientación.');
  }
  if (typeof story !== 'string' || !story.trim() || story.length > MAX_STORY) {
    throw new Error('Escribe un relato de 1 a 12 000 caracteres.');
  }
  if (typeof name !== 'string' || !name.trim() || name.length > 255 || /[\u0000-\u001f\u007f/\\]/.test(name)) {
    throw new Error('Selecciona un archivo con un nombre válido de hasta 255 caracteres.');
  }
  if (!(bytes instanceof Uint8Array) || bytes.length > MAX_ATTACHMENT) {
    throw new Error('El adjunto debe ocupar como máximo 1 MiB.');
  }
  if (typeof code !== 'string' || !CODE.test(code)) {
    throw new Error('El código de seguimiento no tiene el formato esperado.');
  }
}

export async function seal({ answers, story, name, bytes, code }, { publicKey, keyId }) {
  validateContent(answers, story, name, bytes, code);
  const header = { version: VERSION, folio: hex(crypto.getRandomValues(new Uint8Array(16))), keyId };
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await subtle.generateKey(AES, true, ['encrypt']);
  const raw = await subtle.exportKey('raw', key);
  try {
    const wrappedKey = await subtle.encrypt(RSA, publicKey, raw);
    // El código viaja dentro del sobre cifrado: nunca aparece en claro en el paquete.
    const plaintext = encode.encode(JSON.stringify({ answers, story, name, attachment: base64(bytes), code }));
    const ciphertext = await subtle.encrypt({
      name: AES.name, iv: nonce, additionalData: aad(header), tagLength: 128
    }, key, plaintext);
    return {
      ...header, nonce: base64(nonce),
      wrappedKey: base64(new Uint8Array(wrappedKey)), ciphertext: base64(new Uint8Array(ciphertext))
    };
  } finally {
    new Uint8Array(raw).fill(0);
  }
}

function readPackage(json) {
  if (typeof json !== 'string' || json.length > MAX_PACKAGE) {
    throw new Error('El expediente supera el límite de 2 MiB.');
  }
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('El expediente no contiene un JSON válido.');
  }
  if (!hasFields(data, ['version', 'folio', 'keyId', 'nonce', 'wrappedKey', 'ciphertext'])
    || data.version !== VERSION || typeof data.folio !== 'string' || !FOLIO.test(data.folio)
    || typeof data.keyId !== 'string' || !KEY_ID.test(data.keyId)) {
    throw new Error('El formato o la versión del expediente es incompatible.');
  }
  try {
    return {
      data, nonce: fromBase64(data.nonce, 12, 12), wrappedKey: fromBase64(data.wrappedKey, 384, 384),
      ciphertext: fromBase64(data.ciphertext, Math.floor(MAX_PACKAGE * 3 / 4), 16)
    };
  } catch {
    throw new Error('El expediente contiene campos binarios inválidos.');
  }
}

export async function openPackage(json, { privateKey, keyId }) {
  const { data, nonce, wrappedKey, ciphertext } = readPackage(json);
  if (data.keyId !== keyId) throw new Error('El expediente está destinado a otra clave receptora.');
  let plaintext;
  try {
    const raw = await subtle.decrypt(RSA, privateKey, wrappedKey);
    try {
      if (raw.byteLength !== 32) throw new Error();
      const key = await subtle.importKey('raw', raw, AES, false, ['decrypt']);
      plaintext = await subtle.decrypt({
        name: AES.name, iv: nonce, additionalData: aad(data), tagLength: 128
      }, key, ciphertext);
    } finally {
      new Uint8Array(raw).fill(0);
    }
  } catch {
    throw new Error('No se pudo autenticar el expediente. Puede estar alterado o haberse cifrado con otra clave.');
  }
  try {
    const content = JSON.parse(decode.decode(plaintext));
    if (!hasFields(content, ['answers', 'story', 'name', 'attachment', 'code'])) throw new Error();
    const bytes = fromBase64(content.attachment, MAX_ATTACHMENT);
    validateContent(content.answers, content.story, content.name, bytes, content.code);
    return {
      folio: data.folio, answers: content.answers, story: content.story,
      name: content.name, bytes, code: content.code
    };
  } catch {
    throw new Error('El contenido descifrado tiene un formato incompatible.');
  }
}
