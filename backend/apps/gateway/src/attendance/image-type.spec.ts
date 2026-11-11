import { describe, expect, it } from 'vitest';
import { detectImageType } from './image-type';

const JPEG_START = [0xff, 0xd8, 0xff, 0xe0];
const PNG_START = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe('detectImageType', () => {
  it('recognises a JPEG by its first three bytes', () => {
    expect(detectImageType(Buffer.from([...JPEG_START, 0x00, 0x10]))).toBe(
      'image/jpeg',
    );
  });

  it('recognises a PNG by its eight-byte signature', () => {
    expect(detectImageType(Buffer.from([...PNG_START, 0x00]))).toBe(
      'image/png',
    );
  });

  it('rejects content that is not an image, whatever the file was called', () => {
    expect(detectImageType(Buffer.from('this is not an image'))).toBeNull();
  });

  it('rejects other image formats such as GIF', () => {
    expect(detectImageType(Buffer.from('GIF89a'))).toBeNull();
  });

  it('rejects a PNG signature that is cut short', () => {
    expect(detectImageType(Buffer.from(PNG_START.slice(0, 7)))).toBeNull();
  });

  it('rejects an empty file', () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});
