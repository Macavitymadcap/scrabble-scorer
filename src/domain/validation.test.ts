import { describe, expect, it } from 'vite-plus/test';
import { play, word } from './testing.ts';
import { GameError, type EndGame, type Player, type WordPlay } from './types.ts';
import { validateEndGame, validatePlayers, validateTurnInput } from './validation.ts';

function makePlayers(...names: string[]): Player[] {
  return names.map((name, i) => ({ id: `p${i}`, name }));
}

/** A word with a single raw tile letter, bypassing the helper's upper-casing. */
function wordWithLetter(letter: string): WordPlay {
  return {
    tiles: [
      { letter, blank: false, premium: 'none' },
      { letter: 'A', blank: false, premium: 'none' },
    ],
    doubleWords: 0,
    tripleWords: 0,
  };
}

describe('validatePlayers', () => {
  describe('accepts', () => {
    it('the minimum of 2 players', () => {
      // Act & Assert
      expect(() => validatePlayers(makePlayers('Ann', 'Bob'))).not.toThrow();
    });

    it('the maximum of 4 players', () => {
      // Act & Assert
      expect(() => validatePlayers(makePlayers('Ann', 'Bob', 'Cat', 'Dan'))).not.toThrow();
    });

    it('names with surrounding spaces', () => {
      // Act & Assert
      expect(() => validatePlayers(makePlayers(' Ann ', 'Bob'))).not.toThrow();
    });
  });

  describe('rejects', () => {
    it('no players', () => {
      // Act & Assert
      expect(() => validatePlayers([])).toThrow(GameError);
    });

    it('a single player', () => {
      // Act & Assert
      expect(() => validatePlayers(makePlayers('Ann'))).toThrow(GameError);
    });

    it('5 players', () => {
      // Arrange
      const five = makePlayers('Ann', 'Bob', 'Cat', 'Dan', 'Eve');

      // Act & Assert
      expect(() => validatePlayers(five)).toThrow(GameError);
    });

    it('an empty name', () => {
      // Act & Assert
      expect(() => validatePlayers(makePlayers('Ann', ''))).toThrow(GameError);
    });

    it('a name of only spaces', () => {
      // Act & Assert
      expect(() => validatePlayers(makePlayers('Ann', '   '))).toThrow(GameError);
    });

    it('the same name twice', () => {
      // Act & Assert
      expect(() => validatePlayers(makePlayers('Ann', 'Ann'))).toThrow(GameError);
    });

    it('the same name in a different case or with spaces', () => {
      // Act & Assert
      expect(() => validatePlayers(makePlayers('Ann', ' aNN '))).toThrow(GameError);
    });

    it('the same id twice', () => {
      // Arrange
      const players = [
        { id: 'x', name: 'Ann' },
        { id: 'x', name: 'Bob' },
      ];

      // Act & Assert
      expect(() => validatePlayers(players)).toThrow(GameError);
    });
  });

  it('explains the problem in the error message', () => {
    // Act & Assert
    expect(() => validatePlayers(makePlayers('Ann', 'ann'))).toThrow(
      'Two players are called "ann".',
    );
  });
});

describe('validateTurnInput', () => {
  describe('accepts', () => {
    it('a pass, an exchange and a withdrawn word', () => {
      // Act & Assert
      expect(() => validateTurnInput({ kind: 'pass' })).not.toThrow();
      expect(() => validateTurnInput({ kind: 'exchange' })).not.toThrow();
      expect(() => validateTurnInput({ kind: 'withdrawn' })).not.toThrow();
    });

    it('a two-letter word (the shortest)', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('QI')]))).not.toThrow();
    });

    it('a 15-letter word (the width of the board)', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('A'.repeat(15))]))).not.toThrow();
    });

    it('8 words (the main word plus 7 cross-words)', () => {
      // Arrange
      const words = Array.from({ length: 8 }, () => word('AT'));

      // Act & Assert
      expect(() => validateTurnInput(play(words))).not.toThrow();
    });

    it('3 word squares in one word', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('A'.repeat(15), { dw: 1, tw: 2 })]))).not.toThrow();
    });

    it('blanks and letter premiums', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('qU2I3Z')]))).not.toThrow();
    });

    it('a bingo with a 7-letter word', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('RETAINS')], true))).not.toThrow();
    });

    it('a bingo whose long word is not the first one entered', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('AT'), word('RETAINS')], true))).not.toThrow();
    });
  });

  describe('rejects', () => {
    it('a play with no words', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([]))).toThrow(GameError);
    });

    it('a one-letter word', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('A')]))).toThrow(GameError);
    });

    it('a word with no tiles', () => {
      // Arrange
      const empty: WordPlay = { tiles: [], doubleWords: 0, tripleWords: 0 };

      // Act & Assert
      expect(() => validateTurnInput(play([empty]))).toThrow(GameError);
    });

    it('a 16-letter word', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('A'.repeat(16))]))).toThrow(GameError);
    });

    it('9 words', () => {
      // Arrange
      const words = Array.from({ length: 9 }, () => word('AT'));

      // Act & Assert
      expect(() => validateTurnInput(play(words))).toThrow(GameError);
    });

    it('a digit as a letter', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([wordWithLetter('1')]))).toThrow(GameError);
    });

    it('a lower-case letter (blanks use the blank flag, not case)', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([wordWithLetter('a')]))).toThrow(GameError);
    });

    it('an empty letter', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([wordWithLetter('')]))).toThrow(GameError);
    });

    it('two letters on one tile', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([wordWithLetter('AB')]))).toThrow(GameError);
    });

    it('the blank symbol as a letter', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([wordWithLetter('?')]))).toThrow(GameError);
    });

    it('4 word squares in one word', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('A'.repeat(15), { dw: 2, tw: 2 })]))).toThrow(
        GameError,
      );
    });

    it('a negative word square count', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('CAT', { dw: -1 })]))).toThrow(GameError);
    });

    it('a fractional word square count', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('CAT', { tw: 0.5 })]))).toThrow(GameError);
    });

    it('a word square count that is not a number', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('CAT', { dw: Number.NaN })]))).toThrow(GameError);
    });

    it('a bingo with only 6-letter words', () => {
      // Act & Assert
      expect(() => validateTurnInput(play([word('RETAIN')], true))).toThrow(GameError);
    });
  });

  it('names the word at fault in the error message', () => {
    // Arrange
    const turn = play([word('CAT'), word('A')]);

    // Act & Assert
    expect(() => validateTurnInput(turn)).toThrow('Word 2 must be 2-15 letters long.');
  });
});

describe('validateEndGame', () => {
  const players = makePlayers('Ann', 'Bob');

  function check(endGame: EndGame) {
    return () => validateEndGame(players, endGame);
  }

  describe('accepts', () => {
    it('nobody going out with no tiles entered', () => {
      // Act & Assert
      expect(check({ wentOutPlayerId: null, remaining: {} })).not.toThrow();
    });

    it('a player going out while others have tiles left', () => {
      // Act & Assert
      expect(check({ wentOutPlayerId: 'p0', remaining: { p1: 'QE' } })).not.toThrow();
    });

    it('an empty string for the player who went out', () => {
      // Act & Assert
      expect(check({ wentOutPlayerId: 'p0', remaining: { p0: '', p1: 'E' } })).not.toThrow();
    });

    it('a blank (?) and a full rack of 7', () => {
      // Act & Assert
      expect(check({ wentOutPlayerId: null, remaining: { p0: 'ABCDEF?' } })).not.toThrow();
    });
  });

  describe('rejects', () => {
    it('tiles for an unknown player', () => {
      // Act & Assert
      expect(check({ wentOutPlayerId: null, remaining: { nobody: 'A' } })).toThrow(GameError);
    });

    it('an unknown player going out', () => {
      // Act & Assert
      expect(check({ wentOutPlayerId: 'nobody', remaining: {} })).toThrow(GameError);
    });

    it('tiles left for the player who went out', () => {
      // Act & Assert
      expect(check({ wentOutPlayerId: 'p0', remaining: { p0: 'E' } })).toThrow(GameError);
    });

    it('8 tiles on one rack', () => {
      // Act & Assert
      expect(check({ wentOutPlayerId: null, remaining: { p0: 'EEEEEEEE' } })).toThrow(GameError);
    });

    it('lower-case letters', () => {
      // Act & Assert
      expect(check({ wentOutPlayerId: null, remaining: { p0: 'qe' } })).toThrow(GameError);
    });

    it('digits', () => {
      // Act & Assert
      expect(check({ wentOutPlayerId: null, remaining: { p0: 'E1' } })).toThrow(GameError);
    });

    it('spaces', () => {
      // Act & Assert
      expect(check({ wentOutPlayerId: null, remaining: { p0: 'Q E' } })).toThrow(GameError);
    });
  });
});
