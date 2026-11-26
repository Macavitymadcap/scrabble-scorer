import { describe, expect, it } from 'vite-plus/test';
import { BLANK, LETTERS, TILES, letterPoints } from './tiles.ts';

describe('tiles', () => {
  it('defines every letter A-Z', () => {
    expect(Object.keys(TILES).sort()).toEqual(LETTERS);
  });

  it('has 100 tiles including blanks', () => {
    const letters = Object.values(TILES).reduce((sum, t) => sum + t.count, 0);
    expect(letters + BLANK.count).toBe(100);
  });

  it.each([
    ['A', 1],
    ['d', 2],
    ['K', 5],
    ['X', 8],
    ['z', 10],
  ])('scores %s as %i', (letter, points) => {
    expect(letterPoints(letter)).toBe(points);
  });

  it.each(['', '?', 'AB', '1'])('rejects %j', (letter) => {
    expect(() => letterPoints(letter)).toThrow(RangeError);
  });
});
