import { describe, expect, it } from 'vite-plus/test';
import { play, word } from './testing.ts';

describe('word (test helper)', () => {
  it('builds plain tiles with no premiums', () => {
    // Arrange
    const notation = 'AT';

    // Act
    const result = word(notation);

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
    // Arrange
    const notation = 'qI';

    // Act
    const [firstTile] = word(notation).tiles;

    // Assert
    expect(firstTile).toEqual({ letter: 'Q', blank: true, premium: 'none' });
  });

  it('applies 2 and 3 to the letter before them', () => {
    // Arrange
    const notation = 'A2T3E';

    // Act
    const premiums = word(notation).tiles.map((tile) => tile.premium);

    // Assert
    expect(premiums).toEqual(['DL', 'TL', 'none']);
  });

  it('sets the double word count', () => {
    // Arrange
    const options = { dw: 1 };

    // Act
    const result = word('AT', options);

    // Assert
    expect(result.doubleWords).toBe(1);
  });

  it('sets the triple word count', () => {
    // Arrange
    const options = { tw: 2 };

    // Act
    const result = word('AT', options);

    // Assert
    expect(result.tripleWords).toBe(2);
  });

  it('throws for a premium marker with no letter before it', () => {
    // Arrange
    const notation = '2AT';

    // Act
    const act = () => word(notation);

    // Assert
    expect(act).toThrow();
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
    // Arrange
    const words = [word('RETAINS')];

    // Act
    const result = play(words, true);

    // Assert
    expect(result).toEqual({ kind: 'play', words, bingo: true });
  });
});
