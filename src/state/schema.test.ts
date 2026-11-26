import { describe, expect, it } from 'vite-plus/test';
import { GameError } from '../domain/types.ts';
import { SchemaError, isRecord, parseGame } from './schema.ts';
import { finishedGame, sampleGame } from './testing.ts';

/** A JSON round trip of the sample game, as it would come out of storage. */
const stored = (): Record<string, unknown> => JSON.parse(JSON.stringify(sampleGame()));

describe('isRecord', () => {
  it('accepts a plain object', () => {
    // Arrange
    const value = { a: 1 };

    // Act
    const result = isRecord(value);

    // Assert
    expect(result).toBe(true);
  });

  it('rejects null', () => {
    // Arrange
    const value = null;

    // Act
    const result = isRecord(value);

    // Assert
    expect(result).toBe(false);
  });

  it('rejects an array', () => {
    // Arrange
    const value: unknown[] = [];

    // Act
    const result = isRecord(value);

    // Assert
    expect(result).toBe(false);
  });

  it('rejects a string', () => {
    // Arrange
    const value = 'game';

    // Act
    const result = isRecord(value);

    // Assert
    expect(result).toBe(false);
  });
});

describe('parseGame', () => {
  describe('accepts', () => {
    it('a stored active game, unchanged', () => {
      // Arrange
      const data = stored();

      // Act
      const game = parseGame(data);

      // Assert
      expect(game).toEqual(sampleGame());
    });

    it('a stored finished game with its end game', () => {
      // Arrange
      const data: unknown = JSON.parse(JSON.stringify(finishedGame()));

      // Act
      const game = parseGame(data);

      // Assert
      expect(game.status).toBe('finished');
    });

    it('a game with no turns yet', () => {
      // Arrange
      const data = { ...stored(), turns: [] };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).not.toThrow();
    });
  });

  describe('rejects the wrong shape', () => {
    it('null', () => {
      // Arrange
      const data = null;

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow(SchemaError);
    });

    it('an array', () => {
      // Arrange
      const data = [stored()];

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow(SchemaError);
    });

    it('a different schema version', () => {
      // Arrange
      const data = { ...stored(), schemaVersion: 2 };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('unknown schema version');
    });

    it('a missing id', () => {
      // Arrange
      const { id: _id, ...data } = stored();

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('missing id');
    });

    it('a missing timestamp', () => {
      // Arrange
      const data = { ...stored(), updatedAt: 123 };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('missing timestamps');
    });

    it('players that are not a list', () => {
      // Arrange
      const data = { ...stored(), players: 'Ann, Bob' };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid players');
    });

    it('a player without a name', () => {
      // Arrange
      const data = { ...stored(), players: [{ id: 'a', name: 'Ann' }, { id: 'b' }] };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid players');
    });

    it('turns that are not a list', () => {
      // Arrange
      const data = { ...stored(), turns: {} };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid turns');
    });

    it('a turn of an unknown kind', () => {
      // Arrange
      const data = { ...stored(), turns: [{ id: 't1', playerId: 'a', at: 'x', kind: 'resign' }] };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid turns');
    });

    it('a turn kind inherited from Object, such as toString', () => {
      // Arrange
      const data = { ...stored(), turns: [{ id: 't1', playerId: 'a', at: 'x', kind: 'toString' }] };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid turns');
    });

    it('a turn without an id', () => {
      // Arrange
      const data = { ...stored(), turns: [{ playerId: 'a', at: 'x', kind: 'pass' }] };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid turns');
    });

    it('a play without words', () => {
      // Arrange
      const data = {
        ...stored(),
        turns: [{ id: 't1', playerId: 'a', at: 'x', kind: 'play', bingo: false }],
      };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid turns');
    });

    it('a play whose bingo is not a boolean', () => {
      // Arrange
      const data = {
        ...stored(),
        turns: [{ id: 't1', playerId: 'a', at: 'x', kind: 'play', words: [], bingo: 'no' }],
      };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid turns');
    });

    it('a word without multiplier counts', () => {
      // Arrange
      const data = {
        ...stored(),
        turns: [
          {
            id: 't1',
            playerId: 'a',
            at: 'x',
            kind: 'play',
            bingo: false,
            words: [{ tiles: [] }],
          },
        ],
      };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid turns');
    });

    it('a tile with an unknown premium', () => {
      // Arrange
      const tile = { letter: 'A', blank: false, premium: 'QL' };
      const data = {
        ...stored(),
        turns: [
          {
            id: 't1',
            playerId: 'a',
            at: 'x',
            kind: 'play',
            bingo: false,
            words: [{ tiles: [tile, tile], doubleWords: 0, tripleWords: 0 }],
          },
        ],
      };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid turns');
    });

    it('an unknown status', () => {
      // Arrange
      const data = { ...stored(), status: 'paused' };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid status');
    });

    it('an end game with tiles that are not text', () => {
      // Arrange
      const data = {
        ...stored(),
        status: 'finished',
        endGame: { wentOutPlayerId: null, remaining: { a: 7 } },
      };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid end game');
    });

    it('an end game without wentOutPlayerId', () => {
      // Arrange
      const data = { ...stored(), status: 'finished', endGame: { remaining: {} } };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('invalid end game');
    });
  });

  describe('rejects a well-shaped game that breaks the rules', () => {
    it('only one player', () => {
      // Arrange
      const data = { ...stored(), players: [{ id: 'a', name: 'Ann' }], turns: [] };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a play with a one-letter word', () => {
      // Arrange
      const tile = { letter: 'A', blank: false, premium: 'none' };
      const data = {
        ...stored(),
        turns: [
          {
            id: 't1',
            playerId: 'a',
            at: 'x',
            kind: 'play',
            bingo: false,
            words: [{ tiles: [tile], doubleWords: 0, tripleWords: 0 }],
          },
        ],
      };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a turn played by the wrong player', () => {
      // Arrange
      const data = { ...stored(), turns: [{ id: 't1', playerId: 'b', at: 'x', kind: 'pass' }] };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('turn 1 is out of turn order');
    });

    it('a turn by a player not in the game', () => {
      // Arrange
      const data = { ...stored(), turns: [{ id: 't1', playerId: 'z', at: 'x', kind: 'pass' }] };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow(SchemaError);
    });

    it('a finished game with no end game', () => {
      // Arrange
      const data = { ...stored(), status: 'finished' };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('end game does not match status');
    });

    it('an active game with an end game', () => {
      // Arrange
      const data = { ...stored(), endGame: { wentOutPlayerId: null, remaining: {} } };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow('end game does not match status');
    });

    it('an end game naming an unknown player', () => {
      // Arrange
      const data = {
        ...stored(),
        status: 'finished',
        endGame: { wentOutPlayerId: 'z', remaining: {} },
      };

      // Act
      const act = () => parseGame(data);

      // Assert
      expect(act).toThrow(GameError);
    });
  });
});

describe('SchemaError', () => {
  it('is an Error with its own name', () => {
    // Arrange
    const message = 'Broken.';

    // Act
    const error = new SchemaError(message);

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('SchemaError');
    expect(error.message).toBe(message);
  });
});
