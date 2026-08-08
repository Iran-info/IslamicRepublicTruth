import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeImage } from "../lib/image-sanitizer.ts";

const text = new TextEncoder();

function concat(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function jpegSegment(marker, payload) {
  const length = payload.length + 2;
  return concat(new Uint8Array([0xff, marker, length >> 8, length & 0xff]), payload);
}

function pngChunk(type, payload) {
  const length = payload.length;
  return concat(
    new Uint8Array([length >>> 24, length >>> 16, length >>> 8, length]),
    text.encode(type),
    payload,
    new Uint8Array(4),
  );
}

function webpChunk(type, payload) {
  const padding = payload.length & 1 ? new Uint8Array(1) : new Uint8Array();
  return concat(
    text.encode(type),
    new Uint8Array([payload.length, payload.length >>> 8, payload.length >>> 16, payload.length >>> 24]),
    payload,
    padding,
  );
}

function webp(...chunks) {
  const payload = concat(text.encode("WEBP"), ...chunks);
  return concat(
    text.encode("RIFF"),
    new Uint8Array([payload.length, payload.length >>> 8, payload.length >>> 16, payload.length >>> 24]),
    payload,
  );
}

test("removes JPEG application metadata, comments and trailing bytes", () => {
  const input = concat(
    new Uint8Array([0xff, 0xd8]),
    jpegSegment(0xe1, text.encode("Exif\0\0GPS=secret")),
    jpegSegment(0xfe, text.encode("author=secret")),
    jpegSegment(0xc0, new Uint8Array([8, 0, 100, 0, 200, 1, 1, 0x11, 0])),
    jpegSegment(0xda, new Uint8Array([1, 1, 0, 0, 63, 0])),
    new Uint8Array([1, 2, 0xff, 0x00, 3, 0xff, 0xd9]),
    text.encode("secret-after-eoi"),
  );

  const result = sanitizeImage(input);
  assert.equal(result?.contentType, "image/jpeg");
  const output = new TextDecoder().decode(result?.bytes);
  assert.doesNotMatch(output, /secret|Exif|author|GPS/);
  assert.deepEqual(result?.bytes.slice(-2), new Uint8Array([0xff, 0xd9]));
});

test("keeps only display-critical PNG chunks", () => {
  const header = new Uint8Array(13);
  header.set([0, 0, 0, 200, 0, 0, 0, 100], 0);
  const input = concat(
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("tEXt", text.encode("Author\0secret")),
    pngChunk("eXIf", text.encode("GPS=secret")),
    pngChunk("IDAT", new Uint8Array([1, 2, 3])),
    pngChunk("IEND", new Uint8Array()),
  );

  const result = sanitizeImage(input);
  assert.equal(result?.contentType, "image/png");
  const output = new TextDecoder().decode(result?.bytes);
  assert.doesNotMatch(output, /tEXt|eXIf|secret|Author|GPS/);
  assert.match(output, /IHDR/);
  assert.match(output, /IDAT/);
});

test("removes WebP metadata chunks and clears metadata flags", () => {
  const extendedHeader = new Uint8Array([0x2c, 0, 0, 0, 199, 0, 0, 99, 0, 0]);
  const lossyFrame = new Uint8Array([0, 0, 0, 0x9d, 0x01, 0x2a, 200, 0, 100, 0]);
  const input = webp(
    webpChunk("VP8X", extendedHeader),
    webpChunk("EXIF", text.encode("GPS=secret")),
    webpChunk("XMP ", text.encode("author=secret")),
    webpChunk("VP8 ", lossyFrame),
  );

  const result = sanitizeImage(input);
  assert.equal(result?.contentType, "image/webp");
  const output = new TextDecoder().decode(result?.bytes);
  assert.doesNotMatch(output, /EXIF|XMP |secret|author|GPS/);
  assert.equal(result?.bytes[20] & 0x2c, 0);
});

test("rejects unsafe image dimensions", () => {
  const header = new Uint8Array(13);
  header.set([0, 0, 0x4e, 0x20, 0, 0, 0x00, 0x64], 0);
  const input = concat(
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", new Uint8Array([1])),
    pngChunk("IEND", new Uint8Array()),
  );
  assert.equal(sanitizeImage(input), null);
});
