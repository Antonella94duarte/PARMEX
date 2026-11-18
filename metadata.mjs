// Limpieza de metadatos en el navegador, sin dependencias y sin recomprimir.
// JPEG: quita APP1 (EXIF/XMP), APP13 (IPTC), APP12 y comentarios COM.
// PNG: quita los chunks de texto y de fecha. WebP: quita los chunks EXIF y XMP.
// El resto de los formatos se envían tal cual y la interfaz lo advierte.

const JPEG_SIGNATURE = [0xFF, 0xD8, 0xFF];
const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];
const PNG_METADATA = new Set(['tEXt', 'zTXt', 'iTXt', 'tIME', 'eXIf']);
const WEBP_METADATA = new Set(['EXIF', 'XMP ']);
const EXTENSIONS = { jpeg: '.jpg', png: '.png', webp: '.webp' };

function startsWith(bytes, signature) {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

function text(bytes, start, end) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

export function detectFormat(bytes) {
  if (!(bytes instanceof Uint8Array)) return null;
  if (startsWith(bytes, JPEG_SIGNATURE)) return 'jpeg';
  if (startsWith(bytes, PNG_SIGNATURE)) return 'png';
  if (startsWith(bytes, RIFF) && bytes.length >= 12 && startsWith(bytes.subarray(8), WEBP)) return 'webp';
  return null;
}

function concatenate(bytes, ranges) {
  const size = ranges.reduce((total, [start, end]) => total + (end - start), 0);
  const out = new Uint8Array(size);
  let at = 0;
  for (const [start, end] of ranges) {
    out.set(bytes.subarray(start, end), at);
    at += end - start;
  }
  return out;
}

// Recorre los segmentos hasta SOS y conserva solo los que no son metadatos.
export function stripJpeg(bytes) {
  const ranges = [[0, 2]];
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xFF) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xD9) {
      ranges.push([offset, offset + 2]);
      return concatenate(bytes, ranges);
    }
    if (marker === 0xDA) {
      ranges.push([offset, bytes.length]);
      return concatenate(bytes, ranges);
    }
    if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      ranges.push([offset, offset + 2]);
      offset += 2;
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) return null;
    const end = offset + 2 + length;
    const metadata = marker === 0xE1 || marker === 0xEC || marker === 0xED || marker === 0xFE;
    if (!metadata) ranges.push([offset, end]);
    offset = end;
  }
  return null;
}

// Cada chunk PNG lleva su propio CRC: quitar el chunk completo no invalida los demás.
export function stripPng(bytes) {
  const ranges = [[0, 8]];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = ((bytes[offset] << 24) | (bytes[offset + 1] << 16)
      | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
    const type = text(bytes, offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > bytes.length || length > bytes.length) return null;
    if (!PNG_METADATA.has(type)) ranges.push([offset, end]);
    offset = end;
    if (type === 'IEND') return concatenate(bytes, ranges);
  }
  return null;
}

// Los chunks WebP van después de "RIFF" + tamaño + "WEBP"; hay que recalcular el tamaño.
export function stripWebp(bytes) {
  const ranges = [];
  let offset = 12;
  let removed = 0;
  while (offset + 8 <= bytes.length) {
    const fourcc = text(bytes, offset, offset + 4);
    const size = (bytes[offset + 4] | (bytes[offset + 5] << 8)
      | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24)) >>> 0;
    const end = offset + 8 + size + (size % 2);
    if (end > bytes.length) return null;
    if (WEBP_METADATA.has(fourcc)) removed += end - offset;
    else ranges.push([offset, end]);
    offset = end;
  }
  const body = concatenate(bytes, ranges);
  const out = new Uint8Array(12 + body.length);
  out.set(bytes.subarray(0, 4), 0);
  const riffSize = 4 + body.length;
  out[4] = riffSize & 0xFF;
  out[5] = (riffSize >>> 8) & 0xFF;
  out[6] = (riffSize >>> 16) & 0xFF;
  out[7] = (riffSize >>> 24) & 0xFF;
  out.set(bytes.subarray(8, 12), 8);
  out.set(body, 12);
  return out;
}

function safeExtension(name) {
  const match = typeof name === 'string' ? /\.([a-z0-9]{1,8})$/i.exec(name) : null;
  return match ? '.' + match[1].toLowerCase() : '';
}

const NOTES = {
  stripped: 'Metadatos eliminados: se quitaron EXIF, GPS, fecha y miniaturas.',
  clean: 'La imagen no contenía metadatos ocultos.',
  unsupported: 'Este formato no permite limpiar metadatos en el navegador. Revisa que el archivo no incluya tus datos.',
  unreadable: 'No se pudo revisar la imagen. Se enviará tal cual; revisa que no incluya tus datos.'
};

export function sanitizeAttachment({ name, bytes }) {
  if (!(bytes instanceof Uint8Array)) throw new Error('El adjunto no es válido.');
  const format = detectFormat(bytes);
  if (!format) {
    return {
      bytes, name: 'evidencia-1' + safeExtension(name),
      changed: false, format: null, note: NOTES.unsupported
    };
  }
  let clean = null;
  try {
    clean = format === 'jpeg' ? stripJpeg(bytes)
      : format === 'png' ? stripPng(bytes) : stripWebp(bytes);
  } catch {
    clean = null;
  }
  const finalName = 'evidencia-1' + EXTENSIONS[format];
  if (!clean) {
    return { bytes, name: finalName, changed: false, format, note: NOTES.unreadable };
  }
  const changed = clean.length < bytes.length;
  return { bytes: clean, name: finalName, changed, format, note: changed ? NOTES.stripped : NOTES.clean };
}
