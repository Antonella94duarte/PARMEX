import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectFormat, sanitizeAttachment, stripJpeg, stripPng, stripWebp } from './metadata.mjs';

const encoder = new TextEncoder();
const bytesOf = text => [...encoder.encode(text)];

function jpegSegment(marker, payload) {
  const length = payload.length + 2;
  return [0xFF, marker, length >> 8, length & 0xFF, ...payload];
}

function jpeg({ metadata = true } = {}) {
  const parts = [0xFF, 0xD8, ...jpegSegment(0xE0, bytesOf('JFIF\0'))];
  if (metadata) {
    parts.push(...jpegSegment(0xE1, bytesOf('Exif\0\0GPS 19.4326,-99.1332 Juan Perez')));
    parts.push(...jpegSegment(0xED, bytesOf('Photoshop IPTC')));
  }
  parts.push(...jpegSegment(0xDB, [0x00, 0x11, 0x22]));
  parts.push(...jpegSegment(0xDA, [0x01, 0x02, 0x03]));
  parts.push(0x12, 0x34, 0x56, 0xFF, 0xD9);
  return Uint8Array.from(parts);
}

function pngChunk(type, data) {
  const length = data.length;
  return [length >>> 24, (length >>> 16) & 255, (length >>> 8) & 255, length & 255,
    ...bytesOf(type), ...data, 0, 0, 0, 0];
}

function png() {
  return Uint8Array.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    ...pngChunk('IHDR', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
    ...pngChunk('tEXt', bytesOf('Author\0Juan Perez')),
    ...pngChunk('gAMA', [0x00, 0x00, 0xB1, 0x8F]),
    ...pngChunk('IDAT', [9, 8, 7]),
    ...pngChunk('IEND', [])
  ]);
}

function webpChunk(fourcc, data) {
  const size = data.length;
  const out = [...bytesOf(fourcc), size & 255, (size >>> 8) & 255, (size >>> 16) & 255, (size >>> 24) & 255, ...data];
  if (size % 2 === 1) out.push(0);
  return out;
}

function webp() {
  const body = [...webpChunk('VP8 ', [1, 2, 3, 4]), ...webpChunk('EXIF', bytesOf('GPS 19.4326'))];
  const riff = 4 + body.length;
  return Uint8Array.from([0x52, 0x49, 0x46, 0x46, riff & 255, (riff >>> 8) & 255,
    (riff >>> 16) & 255, (riff >>> 24) & 255, 0x57, 0x45, 0x42, 0x50, ...body]);
}

const text = bytes => new TextDecoder('latin1').decode(bytes);

test('detecta el formato por la firma, no por la extensión', () => {
  assert.equal(detectFormat(jpeg()), 'jpeg');
  assert.equal(detectFormat(png()), 'png');
  assert.equal(detectFormat(webp()), 'webp');
  assert.equal(detectFormat(Uint8Array.from(bytesOf('%PDF-1.7'))), null);
  assert.equal(detectFormat(new Uint8Array(0)), null);
});

test('JPEG: quita EXIF, IPTC y comentarios, y conserva el resto de los segmentos', () => {
  const original = jpeg();
  const clean = stripJpeg(original);
  assert.ok(clean);
  assert.equal(clean[0], 0xFF);
  assert.equal(clean[1], 0xD8);
  assert.equal(clean[clean.length - 2], 0xFF);
  assert.equal(clean[clean.length - 1], 0xD9);
  assert.ok(!text(clean).includes('GPS'));
  assert.ok(!text(clean).includes('Juan Perez'));
  assert.ok(!text(clean).includes('Photoshop IPTC'));
  assert.ok(text(clean).includes('JFIF'));
  assert.equal(clean[2], 0xFF);
  assert.equal(clean[3], 0xE0);
  assert.ok(clean.length < original.length);
});

test('JPEG: sin metadatos no cambia y se informa', () => {
  const original = jpeg({ metadata: false });
  const result = sanitizeAttachment({ name: 'foto.jpg', bytes: original });
  assert.equal(result.changed, false);
  assert.deepEqual(result.bytes, original);
  assert.match(result.note, /no contenía metadatos/);
  assert.equal(result.name, 'evidencia-1.jpg');
});

test('JPEG truncado: no se toca y se advierte', () => {
  const result = sanitizeAttachment({ name: 'rota.jpg', bytes: jpeg().subarray(0, 10) });
  assert.equal(result.changed, false);
  assert.match(result.note, /No se pudo revisar/);
});

test('PNG: quita los chunks de texto y de fecha y conserva IHDR, gAMA, IDAT e IEND', () => {
  const original = png();
  const clean = stripPng(original);
  assert.ok(clean);
  assert.ok(!text(clean).includes('Juan Perez'));
  assert.ok(!text(clean).includes('tEXt'));
  for (const type of ['IHDR', 'gAMA', 'IDAT', 'IEND']) assert.ok(text(clean).includes(type));
  assert.ok(clean.length < original.length);
  assert.equal(clean.length, original.length - (12 + 'Author\0Juan Perez'.length));
});

test('WebP: quita EXIF y recalcula el tamaño RIFF', () => {
  const original = webp();
  const clean = stripWebp(original);
  assert.ok(clean);
  assert.ok(!text(clean).includes('EXIF'));
  assert.ok(text(clean).includes('VP8 '));
  const size = clean[4] | (clean[5] << 8) | (clean[6] << 16) | (clean[7] << 24);
  assert.equal(size, clean.length - 8);
  assert.equal(size, 4 + original.length - 12 - (8 + 'GPS 19.4326'.length + 1));
});

test('un formato no soportado se envía igual, con nombre seguro y aviso', () => {
  const original = Uint8Array.from(bytesOf('%PDF-1.7 contenido'));
  const result = sanitizeAttachment({ name: 'mi denuncia.pdf', bytes: original });
  assert.equal(result.changed, false);
  assert.deepEqual(result.bytes, original);
  assert.equal(result.name, 'evidencia-1.pdf');
  assert.match(result.note, /no permite limpiar metadatos/);
});

test('renombra siempre y no conserva el nombre original', () => {
  const result = sanitizeAttachment({ name: 'Juan_Perez_GPS.jpeg', bytes: jpeg() });
  assert.equal(result.name, 'evidencia-1.jpg');
  assert.ok(!JSON.stringify(result.note).includes('Juan_Perez'));
  const noExtension = sanitizeAttachment({ name: 'sin-extension', bytes: Uint8Array.from(bytesOf('%PDF')) });
  assert.equal(noExtension.name, 'evidencia-1');
});

test('el resultado nunca crece y conserva la firma', () => {
  for (const original of [jpeg(), png(), webp()]) {
    const result = sanitizeAttachment({ name: 'x.bin', bytes: original });
    assert.ok(result.bytes.length <= original.length);
    assert.deepEqual([...result.bytes.subarray(0, 2)], [...original.subarray(0, 2)]);
  }
});
