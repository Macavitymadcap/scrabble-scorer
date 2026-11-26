import { describe, expect, it } from 'vite-plus/test';
import { play, word } from './testing.ts';

describe('word (test helper)', () => {
  it('builds plain tiles with no premiums', () => {
    // Act
    const result = word('AT');

    // Assert
    expect(result).toEqual({
      tiles: [
        { letter: 'A', blank: false, premium: 'none' },
        { letter: 'T', blank: false, premium: 'none' },
      ],
      doubleWords: 0,
      tripleWords: 0,
    });
  });

  it('marks a lower-case letter as a blank, stored in upper case', () => {
    // Act
    const [tile] = word('qI').tiles;

    // Assert
    expect(tile).toEqual({ letter: 'Q', blank: true, premium: 'none' });
  });

  it('applies 2 and 3 to the letter before them', () => {
    // Act
    const tiles = word('A2T3E').tiles;

    // Assert
    expect(tiles.map((t) => t.premium)).toEqual(['DL', 'TL', 'none']);
  });

  it('sets the word multiplier counts', () => {
    // Act
    const result = word('AT', { dw: 1, tw: 2 });

    // Assert
    expect(result.doubleWords).toBe(1);
    expect(result.tripleWords).toBe(2);
  });

  it('throws for a premium marker with no letter before it', () => {
    // Act & Assert
    expect(() => word('2AT')).toThrow();
  });
});

describe('play (test helper)', () => {
  it('builds a play that is not a bingo by default', () => {
    // Arrange
    const words = [word('AT')];

    // Act
    const result = play(words);

    // Assert
    expect(result).toEqual({ kind: 'play', words, bingo: false });
  });

  it('builds a bingo when asked', () => {
    // Act
    const result = play([word('RETAINS')], true);

    // Assert
    expect(result).toMatchObject({ kind: 'play', bingo: true });
  });
});
