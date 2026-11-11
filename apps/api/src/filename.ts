// Filename helpers for asset upload/download.
// Unicode letters, marks and numbers are kept; everything else becomes an underscore.
const UNSAFE_NAME_CHARS = /[^\p{L}\p{M}\p{N}._ -]/gu;
const UNSAFE_HEADER_CHARS = /["\\\r\n]/g;

export function safeFilename(value: string): string {
  const name = value.normalize('NFKC').replace(UNSAFE_NAME_CHARS, '_').trim().slice(0, 120);
  return name && name !== '.' && name !== '..' ? name : 'asset';
}

export function headerFilename(value: string): string {
  return value.replace(UNSAFE_HEADER_CHARS, '_');
}
