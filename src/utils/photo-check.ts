import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { unzlibSync } from 'fflate';

const SAMPLE = 32;
const MIN_BRIGHTNESS = 28;
const MIN_EDGE = 3.5;
const MIN_MOVEMENT = 3.6;

export type PhotoSample = {
  gray: Float32Array;
  mean: number;
  edge: number;
};

export type PhotoVerdict = { ok: true; sample: PhotoSample } | { ok: false; message: string };

export async function readPhotoSample(uri: string): Promise<PhotoSample> {
  return readSample(uri);
}

export async function inspectPhoto(uri: string, previous: PhotoSample | null): Promise<PhotoVerdict> {
  const sample = await readSample(uri);
  if (sample.mean < MIN_BRIGHTNESS) {
    return {
      ok: false,
      message: 'This photo is too dark for a 3D model, so it was discarded. Add light and take it again.',
    };
  }
  if (sample.mean > 245 && sample.edge < 6) {
    return {
      ok: false,
      message: 'This photo is washed out, so it was discarded. Aim away from the glare and take it again.',
    };
  }
  if (sample.edge < MIN_EDGE) {
    return {
      ok: false,
      message: 'This photo has almost no edges, so it was discarded. Include the floor, a window, or furniture and take it again.',
    };
  }
  if (previous && meanDifference(sample.gray, previous.gray) < MIN_MOVEMENT) {
    return {
      ok: false,
      message: 'The camera did not move, so this photo was discarded. Step sideways and take it again.',
    };
  }
  return { ok: true, sample };
}

export function deleteCapturedFile(uri: string) {
  if (!uri.startsWith('file://')) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The cache copy may already be gone.
  }
}

async function readSample(uri: string): Promise<PhotoSample> {
  const rendered = await ImageManipulator.manipulate(uri).resize({ width: SAMPLE, height: SAMPLE }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.PNG });
  try {
    const bytes = new Uint8Array(await new File(saved.uri).arrayBuffer());
    const png = decodePng(bytes);
    return sampleFromPixels(png.data, png.width, png.height, png.channels);
  } finally {
    deleteCapturedFile(saved.uri);
  }
}

function decodePng(bytes: Uint8Array): { data: Uint8Array; width: number; height: number; channels: number } {
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  const parts: Uint8Array[] = [];
  while (offset + 8 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = String.fromCharCode(bytes[offset + 4] ?? 0, bytes[offset + 5] ?? 0, bytes[offset + 6] ?? 0, bytes[offset + 7] ?? 0);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = readUint32(data, 0);
      height = readUint32(data, 4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? -1;
      if ((data[12] ?? 1) !== 0) throw new Error('Interlaced PNG previews are not supported.');
    } else if (type === 'IDAT') {
      parts.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : colorType === 4 ? 2 : 0;
  if (width < 1 || height < 1 || bitDepth !== 8 || channels === 0) {
    throw new Error('This preview image could not be read.');
  }

  const compressed = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let cursor = 0;
  for (const part of parts) {
    compressed.set(part, cursor);
    cursor += part.length;
  }

  const inflated = unzlibSync(compressed);
  const stride = width * channels;
  const raw = new Uint8Array(width * height * channels);
  let source = 0;
  let previous: Uint8Array<ArrayBufferLike> = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[source] ?? 0;
    source += 1;
    const row = inflated.subarray(source, source + stride);
    source += stride;
    const current = unfilterRow(filter, row, previous, channels);
    raw.set(current, y * stride);
    previous = current;
  }
  return { data: raw, width, height, channels };
}

function unfilterRow(
  filter: number,
  row: Uint8Array<ArrayBufferLike>,
  previous: Uint8Array<ArrayBufferLike>,
  bytesPerPixel: number,
): Uint8Array<ArrayBufferLike> {
  const current = new Uint8Array(row.length);
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bytesPerPixel ? (current[index - bytesPerPixel] ?? 0) : 0;
    const up = previous[index] ?? 0;
    const upLeft = index >= bytesPerPixel ? (previous[index - bytesPerPixel] ?? 0) : 0;
    let value = row[index] ?? 0;
    if (filter === 1) value += left;
    else if (filter === 2) value += up;
    else if (filter === 3) value += (left + up) >> 1;
    else if (filter === 4) value += paeth(left, up, upLeft);
    current[index] = value & 255;
  }
  return current;
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  ) >>> 0;
}

function sampleFromPixels(data: Uint8Array, width: number, height: number, channels: number): PhotoSample {
  const count = width * height;
  const gray = new Float32Array(count);
  const step = Math.max(channels, 1);
  for (let index = 0; index < count; index += 1) {
    const offset = index * step;
    const red = data[offset] ?? 0;
    const green = step > 1 ? (data[offset + 1] ?? red) : red;
    const blue = step > 2 ? (data[offset + 2] ?? red) : red;
    gray[index] = 0.299 * red + 0.587 * green + 0.114 * blue;
  }

  let total = 0;
  let edge = 0;
  let edgeSamples = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = gray[y * width + x] ?? 0;
      total += value;
      if (x + 1 < width) {
        edge += Math.abs(value - (gray[y * width + x + 1] ?? value));
        edgeSamples += 1;
      }
      if (y + 1 < height) {
        edge += Math.abs(value - (gray[(y + 1) * width + x] ?? value));
        edgeSamples += 1;
      }
    }
  }

  return {
    gray,
    mean: count === 0 ? 0 : total / count,
    edge: edgeSamples === 0 ? 0 : edge / edgeSamples,
  };
}

function meanDifference(current: Float32Array, previous: Float32Array): number {
  const length = Math.min(current.length, previous.length);
  if (length === 0) return 0;
  let total = 0;
  for (let index = 0; index < length; index += 1) {
    total += Math.abs((current[index] ?? 0) - (previous[index] ?? 0));
  }
  return total / length;
}
