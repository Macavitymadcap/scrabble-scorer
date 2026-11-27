import { describe, expect, it } from 'vite-plus/test';
import { britishOnly, formatWordList, mergeWordLists, parseWordList } from './wordlist.ts';

describe('parseWordList', () => {
  it('reads one word per line', () => {
    // Arrange
    const text = 'cat\ndog\n';

    // Act
    const words = parseWordList(text);

    // Assert
    expect([...words]).toEqual(['cat', 'dog']);
  });

  it('accepts Windows line endings', () => {
    // Arrange
    const text = 'cat\r\ndog\r\n';

    // Act
    const words = parseWordList(text);

    // Assert
    expect([...words]).toEqual(['cat', 'dog']);
  });

  it('trims spaces around a word', () => {
    // Arrange
    const text = '  cat  \n';

    // Act
    const words = parseWordList(text);

    // Assert
    expect([...words]).toEqual(['cat']);
  });

  it('drops capitalised words, which are proper nouns', () => {
    // Arrange
    const text = 'London\nlondon\nAnn\n';

    // Act
    const words = parseWordList(text);

    // Assert
    expect([...words]).toEqual(['london']);
  });

  it('drops possessives and other punctuation', () => {
    // Arrange
    const text = "cat's\nre-enter\ncat\n";

    // Act
    const words = parseWordList(text);

    // Assert
    expect([...words]).toEqual(['cat']);
  });

  it('drops accented words', () => {
    // Arrange
    const text = 'café\ncafe\n';

    // Act
    const words = parseWordList(text);

    // Assert
    expect([...words]).toEqual(['cafe']);
  });

  it('drops single letters', () => {
    // Arrange
    const text = 'a\nat\n';

    // Act
    const words = parseWordList(text);

    // Assert
    expect([...words]).toEqual(['at']);
  });

  it('keeps a 15-letter word and drops a 16-letter one', () => {
    // Arrange
    const text = `${'a'.repeat(15)}\n${'b'.repeat(16)}\n`;

    // Act
    const words = parseWordList(text);

    // Assert
    expect([...words]).toEqual(['a'.repeat(15)]);
  });

  it('ignores blank lines and duplicates', () => {
    // Arrange
    const text = 'cat\n\ncat\n\n';

    // Act
    const words = parseWordList(text);

    // Assert
    expect([...words]).toEqual(['cat']);
  });

  it('reads an empty file as no words', () => {
    // Arrange
    const text = '';

    // Act
    const words = parseWordList(text);

    // Assert
    expect(words.size).toBe(0);
  });
});

describe('britishOnly', () => {
  it('keeps words that only the British list has', () => {
    // Arrange
    const british = new Set(['colour', 'cat', 'centre']);
    const american = new Set(['color', 'cat', 'center']);

    // Act
    const result = britishOnly(british, american);

    // Assert
    expect([...result]).toEqual(['colour', 'centre']);
  });

  it('is empty when the lists match', () => {
    // Arrange
    const words = new Set(['cat']);

    // Act
    const result = britishOnly(words, words);

    // Assert
    expect(result.size).toBe(0);
  });
});

describe('mergeWordLists', () => {
  it('combines the lists, sorted, without duplicates', () => {
    // Arrange
    const enable = new Set(['zoo', 'cat']);
    const british = new Set(['colour', 'cat']);

    // Act
    const merged = mergeWordLists(enable, british);

    // Assert
    expect(merged).toEqual(['cat', 'colour', 'zoo']);
  });

  it('is empty with no lists', () => {
    // Arrange
    const lists: ReadonlySet<string>[] = [];

    // Act
    const merged = mergeWordLists(...lists);

    // Assert
    expect(merged).toEqual([]);
  });
});

describe('formatWordList', () => {
  it('writes one word per line with a final newline', () => {
    // Arrange
    const words = ['cat', 'dog'];

    // Act
    const text = formatWordList(words);

    // Assert
    expect(text).toBe('cat\ndog\n');
  });

  it('writes an empty file for no words', () => {
    // Arrange
    const words: string[] = [];

    // Act
    const text = formatWordList(words);

    // Assert
    expect(text).toBe('');
  });

  it('round-trips through parseWordList', () => {
    // Arrange
    const words = ['cat', 'colour', 'zoo'];

    // Act
    const parsed = parseWordList(formatWordList(words));

    // Assert
    expect([...parsed]).toEqual(words);
  });
});
