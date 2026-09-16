import { MAX_PROJECT_IMAGE_BYTES } from "./project-image-input";

export type ProjectImageMetadata = {
  byteSize: number;
  height: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
};

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;
const MAX_PROJECT_IMAGE_DIMENSION = 10_000;

type ParsedImage = Pick<ProjectImageMetadata, "height" | "mimeType" | "width">;

function bytesMatch(
  bytes: Uint8Array,
  offset: number,
  expected: readonly number[],
) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function malformed(): never {
  throw new Error("The project image data is malformed.");
}

function parsePng(bytes: Uint8Array, view: DataView): ParsedImage {
  if (
    bytes.byteLength < 33 ||
    view.getUint32(8) !== 13 ||
    !bytesMatch(bytes, 12, [73, 72, 68, 82])
  ) {
    return malformed();
  }

  return {
    height: view.getUint32(20),
    mimeType: "image/png",
    width: view.getUint32(16),
  };
}

function isStartOfFrameMarker(marker: number) {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function isStandaloneJpegMarker(marker: number) {
  return (
    marker === 0x01 ||
    marker === 0xd8 ||
    (marker >= 0xd0 && marker <= 0xd7)
  );
}

function parseJpeg(bytes: Uint8Array, view: DataView): ParsedImage {
  let offset = 2;

  while (offset < bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      return malformed();
    }

    while (offset < bytes.byteLength && bytes[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= bytes.byteLength) {
      return malformed();
    }

    const marker = bytes[offset];
    offset += 1;

    if (
      marker === undefined ||
      marker === 0x00 ||
      marker === 0xd9 ||
      marker === 0xda
    ) {
      return malformed();
    }

    if (isStandaloneJpegMarker(marker)) {
      continue;
    }

    if (offset + 2 > bytes.byteLength) {
      return malformed();
    }

    const segmentLength = view.getUint16(offset);
    const segmentEnd = offset + segmentLength;

    if (segmentLength < 2 || segmentEnd > bytes.byteLength) {
      return malformed();
    }

    if (isStartOfFrameMarker(marker)) {
      if (segmentLength < 8) {
        return malformed();
      }

      return {
        height: view.getUint16(offset + 3),
        mimeType: "image/jpeg",
        width: view.getUint16(offset + 5),
      };
    }

    offset = segmentEnd;
  }

  return malformed();
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number) {
  const first = bytes[offset];
  const second = bytes[offset + 1];
  const third = bytes[offset + 2];

  if (first === undefined || second === undefined || third === undefined) {
    return malformed();
  }

  return first | (second << 8) | (third << 16);
}

function parseWebp(bytes: Uint8Array, view: DataView): ParsedImage {
  if (
    bytes.byteLength < 20 ||
    !bytesMatch(bytes, 8, [87, 69, 66, 80]) ||
    view.getUint32(4, true) + 8 !== bytes.byteLength
  ) {
    return malformed();
  }

  const chunkSize = view.getUint32(16, true);
  const paddedChunkSize = chunkSize + (chunkSize % 2);
  if (20 + paddedChunkSize > bytes.byteLength) {
    return malformed();
  }

  if (bytesMatch(bytes, 12, [86, 80, 56, 88])) {
    if (chunkSize !== 10) {
      return malformed();
    }

    return {
      height: readUint24LittleEndian(bytes, 27) + 1,
      mimeType: "image/webp",
      width: readUint24LittleEndian(bytes, 24) + 1,
    };
  }

  if (bytesMatch(bytes, 12, [86, 80, 56, 76])) {
    if (chunkSize < 5 || bytes[20] !== 0x2f) {
      return malformed();
    }

    const dimensionBits = view.getUint32(21, true);
    return {
      height: ((dimensionBits >>> 14) & 0x3fff) + 1,
      mimeType: "image/webp",
      width: (dimensionBits & 0x3fff) + 1,
    };
  }

  if (bytesMatch(bytes, 12, [86, 80, 56, 32])) {
    if (chunkSize < 10 || !bytesMatch(bytes, 23, [0x9d, 0x01, 0x2a])) {
      return malformed();
    }

    return {
      height: view.getUint16(28, true) & 0x3fff,
      mimeType: "image/webp",
      width: view.getUint16(26, true) & 0x3fff,
    };
  }

  return malformed();
}

function parseImage(bytes: Uint8Array): ParsedImage {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (bytesMatch(bytes, 0, PNG_SIGNATURE)) {
    return parsePng(bytes, view);
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return parseJpeg(bytes, view);
  }

  if (bytesMatch(bytes, 0, [82, 73, 70, 70])) {
    return parseWebp(bytes, view);
  }

  throw new Error("Use a JPEG, PNG, or WebP image.");
}

export async function readProjectImageMetadata(
  file: File,
): Promise<ProjectImageMetadata> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_PROJECT_IMAGE_BYTES) {
    throw new Error("Keep project images at 10 MB or smaller.");
  }

  const parsed = parseImage(bytes);

  if (file.type !== parsed.mimeType) {
    throw new Error("The file contents do not match the selected image type.");
  }

  if (
    parsed.width < 1 ||
    parsed.width > MAX_PROJECT_IMAGE_DIMENSION ||
    parsed.height < 1 ||
    parsed.height > MAX_PROJECT_IMAGE_DIMENSION
  ) {
    throw new Error(
      "Project image dimensions must be between 1 and 10,000 pixels.",
    );
  }

  return { byteSize: bytes.byteLength, ...parsed };
}
