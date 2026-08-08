const MAX_DIMENSION = 12_000;
const MAX_PIXELS = 40_000_000;

export type SanitizedImage = {
  bytes: Uint8Array;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

function safeDimensions(width: number, height: number) {
  return Number.isInteger(width)
    && Number.isInteger(height)
    && width > 0
    && height > 0
    && width <= MAX_DIMENSION
    && height <= MAX_DIMENSION
    && width * height <= MAX_PIXELS;
}

function join(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function readUint32BE(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 0x1000000
    + (bytes[offset + 1] << 16)
    + (bytes[offset + 2] << 8)
    + bytes[offset + 3]
  ) >>> 0;
}

function readUint32LE(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset]
    + (bytes[offset + 1] << 8)
    + (bytes[offset + 2] << 16)
    + bytes[offset + 3] * 0x1000000
  ) >>> 0;
}

function writeUint32LE(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

const jpegStartOfFrame = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf,
]);

function sanitizeJpeg(input: Uint8Array): Uint8Array | null {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return null;

  const output = [input.slice(0, 2)];
  let offset = 2;
  let scanning = false;
  let dimensionsAreSafe = false;

  while (offset < input.length) {
    if (scanning) {
      let markerStart = offset;
      while (markerStart < input.length) {
        if (input[markerStart] !== 0xff) {
          markerStart += 1;
          continue;
        }
        let markerCode = markerStart + 1;
        while (markerCode < input.length && input[markerCode] === 0xff) markerCode += 1;
        if (markerCode >= input.length) return null;
        const marker = input[markerCode];
        if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
          markerStart = markerCode + 1;
          continue;
        }
        output.push(input.slice(offset, markerStart));
        offset = markerStart;
        scanning = false;
        break;
      }
      if (scanning) return null;
    }

    if (input[offset] !== 0xff) return null;
    const markerStart = offset;
    while (offset < input.length && input[offset] === 0xff) offset += 1;
    if (offset >= input.length) return null;
    const marker = input[offset];
    offset += 1;

    if (marker === 0xd9) {
      output.push(input.slice(markerStart, offset));
      return dimensionsAreSafe ? join(output) : null;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      output.push(input.slice(markerStart, offset));
      continue;
    }
    if (marker === 0x00 || offset + 2 > input.length) return null;

    const segmentLength = (input[offset] << 8) | input[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > input.length) return null;
    const segmentEnd = offset + segmentLength;

    if (jpegStartOfFrame.has(marker)) {
      if (segmentLength < 8) return null;
      const height = (input[offset + 3] << 8) | input[offset + 4];
      const width = (input[offset + 5] << 8) | input[offset + 6];
      if (!safeDimensions(width, height)) return null;
      dimensionsAreSafe = true;
    }

    const isMetadata = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadata) output.push(input.slice(markerStart, segmentEnd));
    offset = segmentEnd;
    scanning = marker === 0xda;
  }

  return null;
}

const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const safePngChunks = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS"]);

function sanitizePng(input: Uint8Array): Uint8Array | null {
  if (input.length < 33 || !pngSignature.every((value, index) => input[index] === value)) return null;

  const output = [input.slice(0, 8)];
  let offset = 8;
  let sawHeader = false;
  let sawImageData = false;

  while (offset + 12 <= input.length) {
    const chunkLength = readUint32BE(input, offset);
    const chunkEnd = offset + 12 + chunkLength;
    if (chunkEnd > input.length) return null;
    const type = ascii(input, offset + 4, 4);
    if (!/^[A-Za-z]{4}$/.test(type)) return null;

    if (type === "IHDR") {
      if (sawHeader || offset !== 8 || chunkLength !== 13) return null;
      const width = readUint32BE(input, offset + 8);
      const height = readUint32BE(input, offset + 12);
      if (!safeDimensions(width, height)) return null;
      sawHeader = true;
    }
    if (type === "IDAT") sawImageData = true;
    if (safePngChunks.has(type)) output.push(input.slice(offset, chunkEnd));

    offset = chunkEnd;
    if (type === "IEND") {
      return sawHeader && sawImageData && chunkLength === 0 ? join(output) : null;
    }
  }

  return null;
}

const safeWebpChunks = new Set(["VP8 ", "VP8L", "VP8X", "ALPH", "ANIM", "ANMF"]);

function webpDimensions(input: Uint8Array, type: string, dataStart: number, length: number) {
  if (type === "VP8X" && length >= 10) {
    return {
      width: 1 + input[dataStart + 4] + (input[dataStart + 5] << 8) + (input[dataStart + 6] << 16),
      height: 1 + input[dataStart + 7] + (input[dataStart + 8] << 8) + (input[dataStart + 9] << 16),
    };
  }
  if (type === "VP8L" && length >= 5 && input[dataStart] === 0x2f) {
    return {
      width: 1 + input[dataStart + 1] + ((input[dataStart + 2] & 0x3f) << 8),
      height: 1 + (input[dataStart + 2] >> 6) + (input[dataStart + 3] << 2) + ((input[dataStart + 4] & 0x0f) << 10),
    };
  }
  if (
    type === "VP8 "
    && length >= 10
    && input[dataStart + 3] === 0x9d
    && input[dataStart + 4] === 0x01
    && input[dataStart + 5] === 0x2a
  ) {
    return {
      width: (input[dataStart + 6] | (input[dataStart + 7] << 8)) & 0x3fff,
      height: (input[dataStart + 8] | (input[dataStart + 9] << 8)) & 0x3fff,
    };
  }
  return null;
}

function sanitizeWebp(input: Uint8Array): Uint8Array | null {
  if (input.length < 20 || ascii(input, 0, 4) !== "RIFF" || ascii(input, 8, 4) !== "WEBP") return null;
  const fileEnd = 8 + readUint32LE(input, 4);
  if (fileEnd < 20 || fileEnd > input.length) return null;

  const chunks: Uint8Array[] = [];
  let offset = 12;
  let dimensionsAreSafe = false;
  let sawImage = false;

  while (offset + 8 <= fileEnd) {
    const type = ascii(input, offset, 4);
    const chunkLength = readUint32LE(input, offset + 4);
    const dataStart = offset + 8;
    const chunkEnd = dataStart + chunkLength;
    const paddedEnd = chunkEnd + (chunkLength & 1);
    if (chunkEnd > fileEnd || paddedEnd > fileEnd) return null;

    const dimensions = webpDimensions(input, type, dataStart, chunkLength);
    if (dimensions) {
      if (!safeDimensions(dimensions.width, dimensions.height)) return null;
      dimensionsAreSafe = true;
    }
    if (type === "VP8 " || type === "VP8L" || type === "ANMF") sawImage = true;

    if (safeWebpChunks.has(type)) {
      const chunk = input.slice(offset, paddedEnd);
      if (type === "VP8X") chunk[8] &= ~0x2c;
      chunks.push(chunk);
    }
    offset = paddedEnd;
  }

  if (offset !== fileEnd || !dimensionsAreSafe || !sawImage) return null;
  const payload = join([new TextEncoder().encode("WEBP"), ...chunks]);
  const output = new Uint8Array(8 + payload.length);
  output.set(new TextEncoder().encode("RIFF"), 0);
  writeUint32LE(output, 4, payload.length);
  output.set(payload, 8);
  return output;
}

export function sanitizeImage(input: Uint8Array): SanitizedImage | null {
  const jpeg = sanitizeJpeg(input);
  if (jpeg) return { bytes: jpeg, contentType: "image/jpeg", extension: "jpg" };

  const png = sanitizePng(input);
  if (png) return { bytes: png, contentType: "image/png", extension: "png" };

  const webp = sanitizeWebp(input);
  if (webp) return { bytes: webp, contentType: "image/webp", extension: "webp" };

  return null;
}
