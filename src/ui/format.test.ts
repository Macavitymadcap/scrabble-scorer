import { describe, expect, it } from 'vite-plus/test';
import { UNKNOWN_DATE, formatPlayedAt, joinNames, signed } from './format.ts';

describe('signed', () => {
  it('adds a plus to a positive number', () => {
    // Arrange
    const value = 11;

    // Act
    const text = signed(value);

    // Assert
    expect(text).toBe('+11');
  });

  it('keeps the minus on a negative number', () => {
    // Arrange
    const value = -8;

    // Act
    const text = signed(value);

    // Assert
    expect(text).toBe('-8');
  });

  it('shows zero without a sign', () => {
    // Arrange
    const value = 0;

    // Act
    const text = signed(value);

    // Assert
    expect(text).toBe('0');
  });
});

describe('formatPlayedAt', () => {
  it('shows the date and time in UK style', () => {
    // Arrange
    const iso = '2026-11-27T19:30:00.000Z';

    // Act
    const text = formatPlayedAt(iso, 'UTC');

    // Assert
    expect(text).toBe('27 Nov 2026, 19:30');
  });

  it('uses the given time zone', () => {
    // Arrange
    const iso = '2026-07-01T23:30:00.000Z';

    // Act
    const text = formatPlayedAt(iso, 'Europe/London');

    // Assert
    expect(text).toBe('2 Jul 2026, 00:30');
  });
});

describe('formatPlayedAt with a bad timestamp', () => {
  it('shows an unknown date rather than throwing', () => {
    // Arrange
    const notADate = 't1';

    // Act
    const text = formatPlayedAt(notADate);

    // Assert
    expect(text).toBe(UNKNOWN_DATE);
  });

  it('treats an empty timestamp as unknown', () => {
    // Arrange
    const empty = '';

    // Act
    const text = formatPlayedAt(empty);

    // Assert
    expect(text).toBe(UNKNOWN_DATE);
  });
});

describe('joinNames', () => {
  it('returns a single name as it is', () => {
    // Arrange
    const names = ['Ann'];

    // Act
    const text = joinNames(names);

    // Assert
    expect(text).toBe('Ann');
  });

  it('joins two names with "and"', () => {
    // Arrange
    const names = ['Ann', 'Bob'];

    // Act
    const text = joinNames(names);

    // Assert
    expect(text).toBe('Ann and Bob');
  });

  it('uses commas before the last "and"', () => {
    // Arrange
    const names = ['Ann', 'Bob', 'Cat'];

    // Act
    const text = joinNames(names);

    // Assert
    expect(text).toBe('Ann, Bob and Cat');
  });

  it('is empty for no names', () => {
    // Arrange
    const names: string[] = [];

    // Act
    const text = joinNames(names);

    // Assert
    expect(text).toBe('');
  });
});
