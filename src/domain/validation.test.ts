import { describe, expect, it } from 'vite-plus/test';
import { play, word } from './testing.ts';
import { GameError, type EndGame, type Player, type TurnInput, type WordPlay } from './types.ts';
import { validateEndGame, validatePlayers, validateTurnInput } from './validation.ts';

const makePlayers = (...names: string[]): Player[] =>
  names.map((name, i) => ({ id: `p${i}`, name }));

/** A word with a single raw tile letter, bypassing the helper's upper-casing. */
const wordWithLetter = (letter: string): WordPlay => ({
  tiles: [
    { letter, blank: false, premium: 'none' },
    { letter: 'A', blank: false, premium: 'none' },
  ],
  doubleWords: 0,
  tripleWords: 0,
});

describe('validatePlayers', () => {
  describe('accepts', () => {
    it('the minimum of 2 players', () => {
      // Arrange
      const twoPlayers = makePlayers('Ann', 'Bob');

      // Act
      const act = () => validatePlayers(twoPlayers);

      // Assert
      expect(act).not.toThrow();
    });

    it('the maximum of 4 players', () => {
      // Arrange
      const fourPlayers = makePlayers('Ann', 'Bob', 'Cat', 'Dan');

      // Act
      const act = () => validatePlayers(fourPlayers);

      // Assert
      expect(act).not.toThrow();
    });

    it('names with surrounding spaces', () => {
      // Arrange
      const paddedName = makePlayers(' Ann ', 'Bob');

      // Act
      const act = () => validatePlayers(paddedName);

      // Assert
      expect(act).not.toThrow();
    });
  });

  describe('rejects', () => {
    it('no players', () => {
      // Arrange
      const noPlayers: Player[] = [];

      // Act
      const act = () => validatePlayers(noPlayers);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a single player', () => {
      // Arrange
      const onePlayer = makePlayers('Ann');

      // Act
      const act = () => validatePlayers(onePlayer);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('5 players', () => {
      // Arrange
      const fivePlayers = makePlayers('Ann', 'Bob', 'Cat', 'Dan', 'Eve');

      // Act
      const act = () => validatePlayers(fivePlayers);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('an empty name', () => {
      // Arrange
      const emptyName = makePlayers('Ann', '');

      // Act
      const act = () => validatePlayers(emptyName);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a name of only spaces', () => {
      // Arrange
      const spacesName = makePlayers('Ann', '   ');

      // Act
      const act = () => validatePlayers(spacesName);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('the same name twice', () => {
      // Arrange
      const sameName = makePlayers('Ann', 'Ann');

      // Act
      const act = () => validatePlayers(sameName);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('the same name in a different case or with spaces', () => {
      // Arrange
      const sameNameDifferentCase = makePlayers('Ann', ' aNN ');

      // Act
      const act = () => validatePlayers(sameNameDifferentCase);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('the same id twice', () => {
      // Arrange
      const sameId = [
        { id: 'x', name: 'Ann' },
        { id: 'x', name: 'Bob' },
      ];

      // Act
      const act = () => validatePlayers(sameId);

      // Assert
      expect(act).toThrow(GameError);
    });
  });

  it('explains a duplicate name in the error message', () => {
    // Arrange
    const sameName = makePlayers('Ann', 'ann');

    // Act
    const act = () => validatePlayers(sameName);

    // Assert
    expect(act).toThrow('Two players are called "ann".');
  });
});

describe('validateTurnInput', () => {
  describe('accepts', () => {
    it('a pass', () => {
      // Arrange
      const pass: TurnInput = { kind: 'pass' };

      // Act
      const act = () => validateTurnInput(pass);

      // Assert
      expect(act).not.toThrow();
    });

    it('an exchange', () => {
      // Arrange
      const exchange: TurnInput = { kind: 'exchange' };

      // Act
      const act = () => validateTurnInput(exchange);

      // Assert
      expect(act).not.toThrow();
    });

    it('a withdrawn word', () => {
      // Arrange
      const withdrawn: TurnInput = { kind: 'withdrawn' };

      // Act
      const act = () => validateTurnInput(withdrawn);

      // Assert
      expect(act).not.toThrow();
    });

    it('a two-letter word (the shortest)', () => {
      // Arrange
      const twoLetters = play([word('QI')]);

      // Act
      const act = () => validateTurnInput(twoLetters);

      // Assert
      expect(act).not.toThrow();
    });

    it('a 15-letter word (the width of the board)', () => {
      // Arrange
      const fifteenLetters = play([word('A'.repeat(15))]);

      // Act
      const act = () => validateTurnInput(fifteenLetters);

      // Assert
      expect(act).not.toThrow();
    });

    it('8 words (the main word plus 7 cross-words)', () => {
      // Arrange
      const eightWords = play(Array.from({ length: 8 }, () => word('AT')));

      // Act
      const act = () => validateTurnInput(eightWords);

      // Assert
      expect(act).not.toThrow();
    });

    it('3 word squares in one word', () => {
      // Arrange
      const threeWordSquares = play([word('A'.repeat(15), { dw: 1, tw: 2 })]);

      // Act
      const act = () => validateTurnInput(threeWordSquares);

      // Assert
      expect(act).not.toThrow();
    });

    it('blanks and letter premiums', () => {
      // Arrange
      const blankAndPremiums = play([word('qU2I3Z')]);

      // Act
      const act = () => validateTurnInput(blankAndPremiums);

      // Assert
      expect(act).not.toThrow();
    });

    it('a bingo with a 7-letter word', () => {
      // Arrange
      const bingo = play([word('RETAINS')], true);

      // Act
      const act = () => validateTurnInput(bingo);

      // Assert
      expect(act).not.toThrow();
    });

    it('a bingo whose long word is not the first one entered', () => {
      // Arrange
      const bingoLongWordSecond = play([word('AT'), word('RETAINS')], true);

      // Act
      const act = () => validateTurnInput(bingoLongWordSecond);

      // Assert
      expect(act).not.toThrow();
    });
  });

  describe('rejects', () => {
    it('a play with no words', () => {
      // Arrange
      const noWords = play([]);

      // Act
      const act = () => validateTurnInput(noWords);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a one-letter word', () => {
      // Arrange
      const oneLetter = play([word('A')]);

      // Act
      const act = () => validateTurnInput(oneLetter);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a word with no tiles', () => {
      // Arrange
      const emptyWord = play([{ tiles: [], doubleWords: 0, tripleWords: 0 }]);

      // Act
      const act = () => validateTurnInput(emptyWord);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a 16-letter word', () => {
      // Arrange
      const sixteenLetters = play([word('A'.repeat(16))]);

      // Act
      const act = () => validateTurnInput(sixteenLetters);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('9 words', () => {
      // Arrange
      const nineWords = play(Array.from({ length: 9 }, () => word('AT')));

      // Act
      const act = () => validateTurnInput(nineWords);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a digit as a letter', () => {
      // Arrange
      const digit = play([wordWithLetter('1')]);

      // Act
      const act = () => validateTurnInput(digit);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a lower-case letter (blanks use the blank flag, not case)', () => {
      // Arrange
      const lowerCase = play([wordWithLetter('a')]);

      // Act
      const act = () => validateTurnInput(lowerCase);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('an empty letter', () => {
      // Arrange
      const emptyLetter = play([wordWithLetter('')]);

      // Act
      const act = () => validateTurnInput(emptyLetter);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('two letters on one tile', () => {
      // Arrange
      const twoLetters = play([wordWithLetter('AB')]);

      // Act
      const act = () => validateTurnInput(twoLetters);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('the blank symbol as a letter', () => {
      // Arrange
      const blankSymbol = play([wordWithLetter('?')]);

      // Act
      const act = () => validateTurnInput(blankSymbol);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('an accented letter', () => {
      // Arrange
      const accented = play([wordWithLetter('É')]);

      // Act
      const act = () => validateTurnInput(accented);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('4 word squares in one word', () => {
      // Arrange
      const fourWordSquares = play([word('A'.repeat(15), { dw: 2, tw: 2 })]);

      // Act
      const act = () => validateTurnInput(fourWordSquares);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a negative word square count', () => {
      // Arrange
      const negative = play([word('CAT', { dw: -1 })]);

      // Act
      const act = () => validateTurnInput(negative);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a fractional word square count', () => {
      // Arrange
      const fractional = play([word('CAT', { tw: 0.5 })]);

      // Act
      const act = () => validateTurnInput(fractional);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a word square count that is not a number', () => {
      // Arrange
      const notANumber = play([word('CAT', { dw: Number.NaN })]);

      // Act
      const act = () => validateTurnInput(notANumber);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('a bingo with only 6-letter words', () => {
      // Arrange
      const shortBingo = play([word('RETAIN')], true);

      // Act
      const act = () => validateTurnInput(shortBingo);

      // Assert
      expect(act).toThrow(GameError);
    });
  });

  it('names the word at fault in the error message', () => {
    // Arrange
    const secondWordTooShort = play([word('CAT'), word('A')]);

    // Act
    const act = () => validateTurnInput(secondWordTooShort);

    // Assert
    expect(act).toThrow('Word 2 must be 2-15 letters long.');
  });
});

describe('validateEndGame', () => {
  const players = makePlayers('Ann', 'Bob');

  describe('accepts', () => {
    it('nobody going out with no tiles entered', () => {
      // Arrange
      const endGame: EndGame = { wentOutPlayerId: null, remaining: {} };

      // Act
      const act = () => validateEndGame(players, endGame);

      // Assert
      expect(act).not.toThrow();
    });

    it('a player going out while others have tiles left', () => {
      // Arrange
      const endGame: EndGame = { wentOutPlayerId: 'p0', remaining: { p1: 'QE' } };

      // Act
      const act = () => validateEndGame(players, endGame);

      // Assert
      expect(act).not.toThrow();
    });

    it('an empty string for the player who went out', () => {
      // Arrange
      const endGame: EndGame = { wentOutPlayerId: 'p0', remaining: { p0: '', p1: 'E' } };

      // Act
      const act = () => validateEndGame(players, endGame);

      // Assert
      expect(act).not.toThrow();
    });

    it('a full rack of 7 including a blank', () => {
      // Arrange
      const endGame: EndGame = { wentOutPlayerId: null, remaining: { p0: 'ABCDEF?' } };

      // Act
      const act = () => validateEndGame(players, endGame);

      // Assert
      expect(act).not.toThrow();
    });
  });

  describe('rejects', () => {
    it('tiles for an unknown player', () => {
      // Arrange
      const endGame: EndGame = { wentOutPlayerId: null, remaining: { nobody: 'A' } };

      // Act
      const act = () => validateEndGame(players, endGame);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('an unknown player going out', () => {
      // Arrange
      const endGame: EndGame = { wentOutPlayerId: 'nobody', remaining: {} };

      // Act
      const act = () => validateEndGame(players, endGame);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('tiles left for the player who went out', () => {
      // Arrange
      const endGame: EndGame = { wentOutPlayerId: 'p0', remaining: { p0: 'E' } };

      // Act
      const act = () => validateEndGame(players, endGame);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('8 tiles on one rack', () => {
      // Arrange
      const endGame: EndGame = { wentOutPlayerId: null, remaining: { p0: 'EEEEEEEE' } };

      // Act
      const act = () => validateEndGame(players, endGame);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('lower-case letters', () => {
      // Arrange
      const endGame: EndGame = { wentOutPlayerId: null, remaining: { p0: 'qe' } };

      // Act
      const act = () => validateEndGame(players, endGame);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('digits', () => {
      // Arrange
      const endGame: EndGame = { wentOutPlayerId: null, remaining: { p0: 'E1' } };

      // Act
      const act = () => validateEndGame(players, endGame);

      // Assert
      expect(act).toThrow(GameError);
    });

    it('spaces', () => {
      // Arrange
      const endGame: EndGame = { wentOutPlayerId: null, remaining: { p0: 'Q E' } };

      // Act
      const act = () => validateEndGame(players, endGame);

      // Assert
      expect(act).toThrow(GameError);
    });
  });
});
