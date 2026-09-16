import { describe, expect, it } from "vitest";

import { readProjectImageMetadata } from "./image-metadata";
import { MAX_PROJECT_IMAGE_BYTES } from "./project-image-input";

type SupportedMimeType = "image/jpeg" | "image/png" | "image/webp";

function fileFromBytes(bytes: Uint8Array, type: string) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], "project-image", { type });
}

function pngBytes(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([73, 72, 68, 82], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes.set([8, 6, 0, 0, 0], 24);
  return bytes;
}

function pngBytesWithLength(width: number, height: number, byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  bytes.set(pngBytes(width, height));
  return bytes;
}

function jpegBytes(width: number, height: number) {
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    0xc0,
    0x00,
    0x08,
    0x08,
    (height >>> 8) & 0xff,
    height & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    0x00,
    0xff,
    0xd9,
  ]);
}

function webpBytes(
  kind: "VP8 " | "VP8L" | "VP8X",
  width: number,
  height: number,
) {
  let chunk: Uint8Array;

  if (kind === "VP8X") {
    chunk = new Uint8Array(10);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, 0);
    const widthMinusOne = width - 1;
    const heightMinusOne = height - 1;
    chunk.set(
      [
        widthMinusOne & 0xff,
        (widthMinusOne >>> 8) & 0xff,
        (widthMinusOne >>> 16) & 0xff,
        heightMinusOne & 0xff,
        (heightMinusOne >>> 8) & 0xff,
        (heightMinusOne >>> 16) & 0xff,
      ],
      4,
    );
  } else if (kind === "VP8L") {
    chunk = new Uint8Array(5);
    chunk[0] = 0x2f;
    new DataView(chunk.buffer).setUint32(
      1,
      (width - 1) | ((height - 1) << 14),
      true,
    );
  } else {
    chunk = new Uint8Array(10);
    chunk.set([0x9d, 0x01, 0x2a], 3);
    const view = new DataView(chunk.buffer);
    view.setUint16(6, width, true);
    view.setUint16(8, height, true);
  }

  const paddedChunkLength = chunk.length + (chunk.length % 2);
  const bytes = new Uint8Array(20 + paddedChunkLength);
  bytes.set([82, 73, 70, 70], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, bytes.length - 8, true);
  bytes.set([87, 69, 66, 80], 8);
  bytes.set(Array.from(kind, (character) => character.charCodeAt(0)), 12);
  view.setUint32(16, chunk.length, true);
  bytes.set(chunk, 20);
  return bytes;
}

describe("project image metadata", () => {
  it.each<
    [string, Uint8Array, SupportedMimeType, number, number]
  >([
    ["PNG IHDR", pngBytes(1280, 720), "image/png", 1280, 720],
    ["JPEG SOF", jpegBytes(1600, 900), "image/jpeg", 1600, 900],
    ["WebP VP8X", webpBytes("VP8X", 1400, 800), "image/webp", 1400, 800],
    ["WebP VP8L", webpBytes("VP8L", 901, 507), "image/webp", 901, 507],
    ["WebP VP8", webpBytes("VP8 ", 1024, 576), "image/webp", 1024, 576],
  ])(
    "confirms the %s signature and returns exact trusted metadata",
    async (_name, bytes, mimeType, width, height) => {
      await expect(
        readProjectImageMetadata(fileFromBytes(bytes, mimeType)),
      ).resolves.toEqual({
        byteSize: bytes.byteLength,
        height,
        mimeType,
        width,
      });
    },
  );

  it.each([
    ["a truncated PNG", pngBytes(100, 100).slice(0, 23), "image/png"],
    [
      "a JPEG segment extending beyond the bytes",
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x20, 0x00]),
      "image/jpeg",
    ],
    [
      "a WebP chunk extending beyond its RIFF container",
      (() => {
        const bytes = webpBytes("VP8X", 100, 100);
        new DataView(bytes.buffer).setUint32(16, 1000, true);
        return bytes;
      })(),
      "image/webp",
    ],
  ])("rejects %s", async (_name, bytes, mimeType) => {
    await expect(
      readProjectImageMetadata(fileFromBytes(bytes, mimeType)),
    ).rejects.toThrow("The project image data is malformed.");
  });

  it("rejects a declared MIME type that disagrees with the binary signature", async () => {
    await expect(
      readProjectImageMetadata(fileFromBytes(pngBytes(100, 100), "image/jpeg")),
    ).rejects.toThrow(
      "The file contents do not match the selected image type.",
    );
  });

  it("rejects bytes that are not a supported image signature", async () => {
    await expect(
      readProjectImageMetadata(
        fileFromBytes(new Uint8Array([71, 73, 70, 56, 57, 97]), "image/gif"),
      ),
    ).rejects.toThrow("Use a JPEG, PNG, or WebP image.");
  });

  it("rejects a contained VP8X chunk whose fixed payload is oversized", async () => {
    const validBytes = webpBytes("VP8X", 1280, 720);
    const bytes = new Uint8Array(validBytes.byteLength + 2);
    bytes.set(validBytes);
    const view = new DataView(bytes.buffer);
    view.setUint32(4, bytes.byteLength - 8, true);
    view.setUint32(16, 12, true);

    await expect(
      readProjectImageMetadata(fileFromBytes(bytes, "image/webp")),
    ).rejects.toThrow("The project image data is malformed.");
  });

  it.each([
    ["zero", pngBytes(0, 720)],
    ["more than 10,000", pngBytes(10_001, 720)],
  ])("rejects %s pixel dimensions", async (_name, bytes) => {
    await expect(
      readProjectImageMetadata(fileFromBytes(bytes, "image/png")),
    ).rejects.toThrow(
      "Project image dimensions must be between 1 and 10,000 pixels.",
    );
  });

  it("accepts an image whose trusted ArrayBuffer is exactly 10 MiB", async () => {
    const bytes = pngBytesWithLength(1280, 720, MAX_PROJECT_IMAGE_BYTES);

    await expect(
      readProjectImageMetadata(fileFromBytes(bytes, "image/png")),
    ).resolves.toEqual({
      byteSize: MAX_PROJECT_IMAGE_BYTES,
      height: 720,
      mimeType: "image/png",
      width: 1280,
    });
  });

  it("rejects an image whose trusted ArrayBuffer is one byte over 10 MiB", async () => {
    const bytes = pngBytesWithLength(1280, 720, MAX_PROJECT_IMAGE_BYTES + 1);

    await expect(
      readProjectImageMetadata(fileFromBytes(bytes, "image/png")),
    ).rejects.toThrow("Keep project images at 10 MB or smaller.");
  });
});
