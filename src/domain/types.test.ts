import { describe, expect, it } from 'vite-plus/test';
import { play, word } from './testing.ts';
import { GameError, byTurnKind, type TurnInput, type TurnStrategies } from './types.ts';

describe('byTurnKind', () => {
  const describeTurn: TurnStrategies<string> = {
    play: (turn) => `play of ${turn.words.length} word(s)`,
    pass: () => 'pass',
    exchange: () => 'exchange',
    withdrawn: () => 'withdrawn',
  };

  it('runs the strategy for a play, passing the narrowed turn', () => {
    // Arrange
    const turn = play([word('CAT'), word('AT')]);

    // Act
    const result = byTurnKind(describeTurn, turn);

    // Assert
    expect(result).toBe('play of 2 word(s)');
  });

  it('runs the strategy for a non-scoring turn', () => {
    // Arrange
    const turn: TurnInput = { kind: 'exchange' };

    // Act
    const result = byTurnKind(describeTurn, turn);

    // Assert
    expect(result).toBe('exchange');
  });
});

describe('GameError', () => {
  it('is an Error with its own name', () => {
    // Arrange
    const message = 'Nope.';

    // Act
    const error = new GameError(message);

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('GameError');
    expect(error.message).toBe(message);
  });
});
