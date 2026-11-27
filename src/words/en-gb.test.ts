/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';

// The committed list itself: sanity checks that a rebuild didn't go wrong.
const words = readFileSync(new URL('./en-gb.txt', import.meta.url), 'utf8').split('\n');
const lastLine = words.pop();
const set = new Set(words);

describe('en-gb.txt', () => {
  it('ends with a newline', () => {
    // Arrange
    const end = lastLine;

    // Act
    const isEmpty = end === '';

    // Assert
    expect(isEmpty).toBe(true);
  });

  it('has about 169,000 words', () => {
    // Arrange
    const count = words.length;

    // Act
    const inRange = count > 165_000 && count < 175_000;

    // Assert
    expect(inRange).toBe(true);
  });

  it('only has words of 2-15 letters a-z', () => {
    // Arrange
    const valid = /^[a-z]{2,15}$/;

    // Act
    const invalid = words.filter((word) => !valid.test(word));

    // Assert
    expect(invalid).toEqual([]);
  });

  it('is sorted with no duplicates', () => {
    // Arrange
    const sorted = [...set].sort();

    // Act
    const matches = sorted.length === words.length && sorted.every((word, i) => word === words[i]);

    // Assert
    expect(matches).toBe(true);
  });

  it.each(['colour', 'centre', 'organisation', 'kilometres', 'labourers'])(
    'has the British spelling %s',
    (word) => {
      // Arrange
      const british = word;

      // Act
      const found = set.has(british);

      // Assert
      expect(found).toBe(true);
    },
  );

  it.each(['qi', 'za', 'quiz', 'zyzzyva'])('has %s', (word) => {
    // Arrange
    const expected = word;

    // Act
    const found = set.has(expected);

    // Assert
    expect(found).toBe(true);
  });

  it.each(['london', 'ann', 'cosplay', 'ct'])('does not have %s', (word) => {
    // Arrange
    const unexpected = word;

    // Act
    const found = set.has(unexpected);

    // Assert
    expect(found).toBe(false);
  });
});
