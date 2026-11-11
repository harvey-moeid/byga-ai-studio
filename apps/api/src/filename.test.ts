import { describe, expect, it } from 'vitest';
import { headerFilename, safeFilename } from './filename';

describe('safeFilename', () => {
  it('keeps ordinary names and extensions intact', () => {
    expect(safeFilename('Foto Produk 01.png')).toBe('Foto Produk 01.png');
    expect(safeFilename('laporan-final_v2.pdf')).toBe('laporan-final_v2.pdf');
  });

  it('keeps unicode letters', () => {
    expect(safeFilename('Laporan Café 日本.pdf')).toBe('Laporan Café 日本.pdf');
  });

  it('replaces path separators, control characters and other symbols', () => {
    expect(safeFilename('../a\\b/c\u0001.txt')).toBe('.._a_b_c_.txt');
    expect(safeFilename('a"b<c>d?.png')).toBe('a_b_c_d_.png');
  });

  it('falls back to a default name for empty or dot-only names', () => {
    expect(safeFilename('')).toBe('asset');
    expect(safeFilename('   ')).toBe('asset');
    expect(safeFilename('..')).toBe('asset');
  });

  it('limits the name to 120 characters', () => {
    expect(safeFilename('a'.repeat(300))).toHaveLength(120);
  });
});

describe('headerFilename', () => {
  it('keeps normal names unchanged', () => {
    expect(headerFilename('Foto Produk 01.png')).toBe('Foto Produk 01.png');
    expect(headerFilename('render_final.mp4')).toBe('render_final.mp4');
  });

  it('replaces quotes, backslashes and line breaks only', () => {
    expect(headerFilename('a"b\r\nc\\d.png')).toBe('a_b__c_d.png');
  });
});
