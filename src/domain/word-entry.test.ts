import { describe, expect, it } from 'vite-plus/test';
import { word } from './testing.ts';
import type { TilePlay } from './types.ts';
import {
  NEXT_MARK,
  canHaveSquares,
  cycleTile,
  emptyWord,
  normaliseWordText,
  retile,
  tileMark,
  withMark,
  wordLetters,
} from './word-entry.ts';

const plainQ: TilePlay = { letter: 'Q', blank: false, premium: 'none' };

describe('tileMark', () => {
  it('is "none" for a plain tile', () => {
    // Arrange
    const tile = plainQ;

    // Act
    const mark = tileMark(tile);

    // Assert
    expect(mark).toBe('none');
  });

  it('is the premium for a tile on a letter square', () => {
    // Arrange
    const tile: TilePlay = { ...plainQ, premium: 'TL' };

    // Act
    const mark = tileMark(tile);

    // Assert
    expect(mark).toBe('TL');
  });

  it('is "blank" for a blank, whatever its premium', () => {
    // Arrange
    const tile: TilePlay = { ...plainQ, blank: true, premium: 'DL' };

    // Act
    const mark = tileMark(tile);

    // Assert
    expect(mark).toBe('blank');
  });
});

describe('withMark', () => {
  it('sets a letter premium and clears blank', () => {
    // Arrange
    const blankQ: TilePlay = { ...plainQ, blank: true };

    // Act
    const tile = withMark(blankQ, 'DL');

    // Assert
    expect(tile).toEqual({ letter: 'Q', blank: false, premium: 'DL' });
  });

  it('marks a blank with no letter premium', () => {
    // Arrange
    const tripleQ: TilePlay = { ...plainQ, premium: 'TL' };

    // Act
    const tile = withMark(tripleQ, 'blank');

    // Assert
    expect(tile).toEqual({ letter: 'Q', blank: true, premium: 'none' });
  });

  it('does not change the tile passed in', () => {
    // Arrange
    const tile = { ...plainQ };

    // Act
    withMark(tile, 'TL');

    // Assert
    expect(tile).toEqual(plainQ);
  });
});

describe('cycleTile', () => {
  it.each([
    ['none', 'DL'],
    ['DL', 'TL'],
    ['TL', 'blank'],
    ['blank', 'none'],
  ] as const)('moves a %s tile to %s', (from, to) => {
    // Arrange
    const tile = withMark(plainQ, from);

    // Act
    const next = cycleTile(tile);

    // Assert
    expect(tileMark(next)).toBe(to);
  });

  it('returns to the start after four taps', () => {
    // Arrange
    const taps = 4;

    // Act
    const result = Array.from({ length: taps }).reduce<TilePlay>((tile) => cycleTile(tile), plainQ);

    // Assert
    expect(result).toEqual(plainQ);
  });

  it('keeps the letter', () => {
    // Arrange
    const tile = plainQ;

    // Act
    const next = cycleTile(tile);

    // Assert
    expect(next.letter).toBe('Q');
  });
});

describe('NEXT_MARK', () => {
  it('visits every mark once in a full cycle', () => {
    // Arrange
    const start = 'none';

    // Act
    const visited = [
      NEXT_MARK[start],
      NEXT_MARK[NEXT_MARK[start]],
      NEXT_MARK[NEXT_MARK[NEXT_MARK[start]]],
    ];

    // Assert
    expect(new Set([start, ...visited]).size).toBe(4);
  });
});

describe('normaliseWordText', () => {
  it('upper-cases letters', () => {
    // Arrange
    const typed = 'quiz';

    // Act
    const text = normaliseWordText(typed);

    // Assert
    expect(text).toBe('QUIZ');
  });

  it('drops spaces, digits and punctuation', () => {
    // Arrange
    const typed = " q-u i'z 2 ";

    // Act
    const text = normaliseWordText(typed);

    // Assert
    expect(text).toBe('QUIZ');
  });

  it('drops accented letters', () => {
    // Arrange
    const typed = 'café';

    // Act
    const text = normaliseWordText(typed);

    // Assert
    expect(text).toBe('CAF');
  });

  it('keeps at most 15 letters', () => {
    // Arrange
    const typed = 'A'.repeat(20);

    // Act
    const text = normaliseWordText(typed);

    // Assert
    expect(text).toHaveLength(15);
  });

  it('turns an empty string into an empty string', () => {
    // Arrange
    const typed = '';

    // Act
    const text = normaliseWordText(typed);

    // Assert
    expect(text).toBe('');
  });
});

describe('emptyWord', () => {
  it('has no tiles and no word squares', () => {
    // Arrange
    const expected = { tiles: [], doubleWords: 0, tripleWords: 0 };

    // Act
    const result = emptyWord();

    // Assert
    expect(result).toEqual(expected);
  });

  it('returns a new word each time', () => {
    // Arrange
    const first = emptyWord();

    // Act
    const second = emptyWord();

    // Assert
    expect(second).not.toBe(first);
  });
});

describe('retile', () => {
  it('builds plain tiles for new text', () => {
    // Arrange
    const start = emptyWord();

    // Act
    const result = retile(start, 'cat');

    // Assert
    expect(result).toEqual(word('CAT'));
  });

  it('keeps marks on letters that did not change', () => {
    // Arrange
    const marked = word('Q3UIz');

    // Act
    const result = retile(marked, 'QUIZZ');

    // Assert
    expect(result.tiles.map(tileMark)).toEqual(['TL', 'none', 'none', 'blank', 'none']);
  });

  it('clears the mark on a letter that changed', () => {
    // Arrange
    const marked = word('C3AT');

    // Act
    const result = retile(marked, 'BAT');

    // Assert
    expect(result.tiles.map(tileMark)).toEqual(['none', 'none', 'none']);
  });

  it('drops the tiles of deleted letters', () => {
    // Arrange
    const marked = word('CAT3S');

    // Act
    const result = retile(marked, 'CAT');

    // Assert
    expect(result.tiles.map(tileMark)).toEqual(['none', 'none', 'TL']);
  });

  it('keeps the word squares', () => {
    // Arrange
    const doubled = word('CAT', { dw: 2 });

    // Act
    const result = retile(doubled, 'CATS');

    // Assert
    expect(result.doubleWords).toBe(2);
  });

  it('normalises the text', () => {
    // Arrange
    const start = emptyWord();

    // Act
    const result = retile(start, ' q1i ');

    // Assert
    expect(wordLetters(result)).toBe('QI');
  });

  it('can empty the word', () => {
    // Arrange
    const start = word('CAT');

    // Act
    const result = retile(start, '');

    // Assert
    expect(result.tiles).toEqual([]);
  });
});

describe('wordLetters', () => {
  it('joins the letters in upper case, blanks included', () => {
    // Arrange
    const withBlank = word('qUIZ');

    // Act
    const letters = wordLetters(withBlank);

    // Assert
    expect(letters).toBe('QUIZ');
  });
});

describe('canHaveSquares', () => {
  it('allows up to 3 double word squares on a word with none', () => {
    // Arrange
    const plain = word('CAT');

    // Act
    const allowed = canHaveSquares(plain, 'doubleWords', 3);

    // Assert
    expect(allowed).toBe(true);
  });

  it('counts the other kind of square towards the limit', () => {
    // Arrange
    const twoTriples = word('CAT', { tw: 2 });

    // Act
    const allowed = canHaveSquares(twoTriples, 'doubleWords', 2);

    // Assert
    expect(allowed).toBe(false);
  });

  it('allows exactly reaching the limit', () => {
    // Arrange
    const oneDouble = word('CAT', { dw: 1 });

    // Act
    const allowed = canHaveSquares(oneDouble, 'tripleWords', 2);

    // Assert
    expect(allowed).toBe(true);
  });

  it('always allows none', () => {
    // Arrange
    const full = word('CAT', { dw: 1, tw: 2 });

    // Act
    const allowed = canHaveSquares(full, 'tripleWords', 0);

    // Assert
    expect(allowed).toBe(true);
  });
});
