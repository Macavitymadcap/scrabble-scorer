import { describe, expect, it } from 'vite-plus/test';
import {
  bestTurn,
  bestWord,
  createGame,
  currentRound,
  nextPlayer,
  playerTotals,
  reduce,
  roundOf,
  scoreboardRounds,
  scoredTurns,
  standings,
  type GameAction,
} from './game.ts';
import { play, word } from './testing.ts';
import { GameError, type EndGame, type Game, type TurnInput } from './types.ts';

const T0 = '2026-11-26T19:00:00.000Z';
const players = [
  { id: 'a', name: 'Ann' },
  { id: 'b', name: 'Bob' },
  { id: 'c', name: 'Cat' },
];
const pass: TurnInput = { kind: 'pass' };
const noTilesLeft: EndGame = { wentOutPlayerId: null, remaining: {} };

const newGame = (): Game => createGame({ id: 'g1', at: T0, players });

/** Adds a turn with a predictable id (t1, t2, ...) and time (at-1, at-2, ...). */
const addTurn = (game: Game, turn: TurnInput): Game => {
  const n = game.turns.length + 1;
  return reduce(game, { type: 'addTurn', id: `t${n}`, at: `at-${n}`, turn });
};

/** A new game with these turns played in order: Ann, Bob, Cat, Ann, ... */
const withTurns = (...turns: TurnInput[]): Game => turns.reduce(addTurn, newGame());

const finish = (game: Game, endGame: EndGame = noTilesLeft): Game =>
  reduce(game, { type: 'finishGame', at: 'end', endGame });

describe('createGame', () => {
  it('starts an active game with no turns', () => {
    // Arrange
    const input = { id: 'g1', at: T0, players };

    // Act
    const game = createGame(input);

    // Assert
    expect(game).toEqual({
      schemaVersion: 1,
      id: 'g1',
      createdAt: T0,
      updatedAt: T0,
      players,
      turns: [],
      status: 'active',
    });
  });

  it('trims player names', () => {
    // Arrange
    const untrimmed = [
      { id: 'a', name: '  Ann ' },
      { id: 'b', name: 'Bob' },
    ];

    // Act
    const game = createGame({ id: 'g', at: T0, players: untrimmed });

    // Assert
    expect(game.players.map((p) => p.name)).toEqual(['Ann', 'Bob']);
  });

  it('does not share the players array passed in', () => {
    // Arrange
    const input = [...players];
    const game = createGame({ id: 'g', at: T0, players: input });

    // Act
    input.pop();

    // Assert
    expect(game.players).toHaveLength(3);
  });

  it('validates the players', () => {
    // Arrange
    const onePlayer = { id: 'g', at: T0, players: [{ id: 'a', name: 'Ann' }] };

    // Act
    const act = () => createGame(onePlayer);

    // Assert
    expect(act).toThrow(GameError);
  });
});

describe('roundOf', () => {
  it.each([
    [0, 3, 1],
    [2, 3, 1],
    [3, 3, 2],
    [7, 2, 4],
    [3, 4, 1],
    [4, 4, 2],
  ])('turn index %i with %i players is round %i', (index, playerCount, expected) => {
    // Arrange
    const turnIndex = index;

    // Act
    const round = roundOf(turnIndex, playerCount);

    // Assert
    expect(round).toBe(expected);
  });
});

describe('nextPlayer', () => {
  it('is the first player in a new game', () => {
    // Arrange
    const game = newGame();

    // Act
    const player = nextPlayer(game);

    // Assert
    expect(player.id).toBe('a');
  });

  it('moves on after a turn', () => {
    // Arrange
    const game = withTurns(pass);

    // Act
    const player = nextPlayer(game);

    // Assert
    expect(player.id).toBe('b');
  });

  it('wraps back to the first player after everyone has played', () => {
    // Arrange
    const game = withTurns(pass, pass, pass);

    // Act
    const player = nextPlayer(game);

    // Assert
    expect(player.id).toBe('a');
  });

  it('throws if a game somehow has no players', () => {
    // Arrange
    const broken = { ...newGame(), players: [] };

    // Act
    const act = () => nextPlayer(broken);

    // Assert
    expect(act).toThrow(GameError);
  });
});

describe('currentRound', () => {
  it('is round 1 in a new game', () => {
    // Arrange
    const game = newGame();

    // Act
    const round = currentRound(game);

    // Assert
    expect(round).toBe(1);
  });

  it('stays the same until everyone has played', () => {
    // Arrange
    const game = withTurns(pass, pass);

    // Act
    const round = currentRound(game);

    // Assert
    expect(round).toBe(1);
  });

  it('moves on once everyone has played', () => {
    // Arrange
    const game = withTurns(pass, pass, pass);

    // Act
    const round = currentRound(game);

    // Assert
    expect(round).toBe(2);
  });
});

describe('reduce: addTurn', () => {
  it('records the turn for the next player with the given id and time', () => {
    // Arrange
    const game = newGame();
    const turn = play([word('CAT')]);
    const action: GameAction = { type: 'addTurn', id: 'x', at: 'later', turn };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.turns).toEqual([{ ...turn, id: 'x', playerId: 'a', at: 'later' }]);
  });

  it('sets updatedAt to the action time', () => {
    // Arrange
    const game = newGame();
    const action: GameAction = { type: 'addTurn', id: 'x', at: 'later', turn: pass };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.updatedAt).toBe('later');
  });

  it('assigns turns to players in order', () => {
    // Arrange
    const turns = [pass, pass, pass, pass];

    // Act
    const game = withTurns(...turns);

    // Assert
    expect(game.turns.map((t) => t.playerId)).toEqual(['a', 'b', 'c', 'a']);
  });

  it('does not change the game it was given', () => {
    // Arrange
    const before = newGame();
    const snapshot = structuredClone(before);

    // Act
    addTurn(before, play([word('CAT')]));

    // Assert
    expect(before).toEqual(snapshot);
  });

  it('validates the turn', () => {
    // Arrange
    const game = newGame();
    const oneLetterWord = play([word('A')]);

    // Act
    const act = () => addTurn(game, oneLetterWord);

    // Assert
    expect(act).toThrow(GameError);
  });

  it('is refused once the game has finished', () => {
    // Arrange
    const finished = finish(newGame());

    // Act
    const act = () => addTurn(finished, pass);

    // Assert
    expect(act).toThrow(GameError);
  });
});

describe('reduce: editTurn', () => {
  it("replaces the turn's content but keeps its id, player and time", () => {
    // Arrange
    const game = withTurns(play([word('CAT')]), play([word('DOG')]));
    const newContent = play([word('CART')]);
    const action: GameAction = {
      type: 'editTurn',
      turnId: 't1',
      at: 'edit-time',
      turn: newContent,
    };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.turns[0]).toEqual({ ...newContent, id: 't1', playerId: 'a', at: 'at-1' });
  });

  it('leaves the other turns untouched', () => {
    // Arrange
    const game = withTurns(play([word('CAT')]), play([word('DOG')]));
    const action: GameAction = { type: 'editTurn', turnId: 't1', at: 'x', turn: pass };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.turns[1]).toBe(game.turns[1]);
  });

  it('sets updatedAt to the edit time', () => {
    // Arrange
    const game = withTurns(pass);
    const action: GameAction = { type: 'editTurn', turnId: 't1', at: 'edit-time', turn: pass };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.updatedAt).toBe('edit-time');
  });

  it('can turn a play into a pass, dropping its words', () => {
    // Arrange
    const game = withTurns(play([word('CAT')]));
    const action: GameAction = { type: 'editTurn', turnId: 't1', at: 'x', turn: pass };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.turns[0]).toEqual({ kind: 'pass', id: 't1', playerId: 'a', at: 'at-1' });
  });

  it('does not change whose turn is next', () => {
    // Arrange
    const game = withTurns(pass, pass);
    const action: GameAction = {
      type: 'editTurn',
      turnId: 't1',
      at: 'x',
      turn: play([word('AT')]),
    };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(nextPlayer(result).id).toBe('c');
  });

  it('rejects an unknown turn id', () => {
    // Arrange
    const game = withTurns(pass);
    const action: GameAction = { type: 'editTurn', turnId: 'nope', at: 'x', turn: pass };

    // Act
    const act = () => reduce(game, action);

    // Assert
    expect(act).toThrow(GameError);
  });

  it('validates the new turn', () => {
    // Arrange
    const game = withTurns(pass);
    const action: GameAction = { type: 'editTurn', turnId: 't1', at: 'x', turn: play([]) };

    // Act
    const act = () => reduce(game, action);

    // Assert
    expect(act).toThrow(GameError);
  });

  it('is refused once the game has finished', () => {
    // Arrange
    const finished = finish(withTurns(pass));
    const action: GameAction = { type: 'editTurn', turnId: 't1', at: 'x', turn: pass };

    // Act
    const act = () => reduce(finished, action);

    // Assert
    expect(act).toThrow(GameError);
  });
});

describe('reduce: undoTurn', () => {
  it('removes the last turn', () => {
    // Arrange
    const game = withTurns(pass, pass);
    const action: GameAction = { type: 'undoTurn', at: 'x' };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.turns.map((t) => t.id)).toEqual(['t1']);
  });

  it('hands the turn back to the player who was undone', () => {
    // Arrange
    const game = withTurns(pass, pass);
    const action: GameAction = { type: 'undoTurn', at: 'x' };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(nextPlayer(result).id).toBe('b');
  });

  it('sets updatedAt to the undo time', () => {
    // Arrange
    const game = withTurns(pass);
    const action: GameAction = { type: 'undoTurn', at: 'undo-time' };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.updatedAt).toBe('undo-time');
  });

  it('can undo the very first turn', () => {
    // Arrange
    const game = withTurns(pass);
    const action: GameAction = { type: 'undoTurn', at: 'x' };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.turns).toEqual([]);
  });

  it('rejects undo when there are no turns', () => {
    // Arrange
    const game = newGame();
    const action: GameAction = { type: 'undoTurn', at: 'x' };

    // Act
    const act = () => reduce(game, action);

    // Assert
    expect(act).toThrow(GameError);
  });

  it('is refused once the game has finished', () => {
    // Arrange
    const finished = finish(withTurns(pass));
    const action: GameAction = { type: 'undoTurn', at: 'x' };

    // Act
    const act = () => reduce(finished, action);

    // Assert
    expect(act).toThrow(GameError);
  });
});

describe('reduce: finishGame', () => {
  it('marks the game finished', () => {
    // Arrange
    const game = withTurns(pass);
    const action: GameAction = { type: 'finishGame', at: 'end', endGame: noTilesLeft };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.status).toBe('finished');
  });

  it('stores the end game', () => {
    // Arrange
    const game = withTurns(pass);
    const endGame: EndGame = { wentOutPlayerId: null, remaining: { a: 'E' } };
    const action: GameAction = { type: 'finishGame', at: 'end', endGame };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.endGame).toEqual(endGame);
  });

  it('sets updatedAt to the finish time', () => {
    // Arrange
    const game = withTurns(pass);
    const action: GameAction = { type: 'finishGame', at: 'end', endGame: noTilesLeft };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.updatedAt).toBe('end');
  });

  it('can finish a game with no turns', () => {
    // Arrange
    const game = newGame();
    const action: GameAction = { type: 'finishGame', at: 'end', endGame: noTilesLeft };

    // Act
    const result = reduce(game, action);

    // Assert
    expect(result.status).toBe('finished');
  });

  it('validates the end game', () => {
    // Arrange
    const game = newGame();
    const unknownPlayer: EndGame = { wentOutPlayerId: 'nobody', remaining: {} };
    const action: GameAction = { type: 'finishGame', at: 'end', endGame: unknownPlayer };

    // Act
    const act = () => reduce(game, action);

    // Assert
    expect(act).toThrow(GameError);
  });

  it('rejects finishing twice', () => {
    // Arrange
    const finished = finish(newGame());
    const action: GameAction = { type: 'finishGame', at: 'again', endGame: noTilesLeft };

    // Act
    const act = () => reduce(finished, action);

    // Assert
    expect(act).toThrow(GameError);
  });
});

describe('reduce: reopenGame', () => {
  it('makes the game active again', () => {
    // Arrange
    const finished = finish(withTurns(pass));
    const action: GameAction = { type: 'reopenGame', at: 'again' };

    // Act
    const result = reduce(finished, action);

    // Assert
    expect(result.status).toBe('active');
  });

  it('drops the end game', () => {
    // Arrange
    const finished = finish(withTurns(pass), { wentOutPlayerId: null, remaining: { a: 'E' } });
    const action: GameAction = { type: 'reopenGame', at: 'again' };

    // Act
    const result = reduce(finished, action);

    // Assert
    expect(result).not.toHaveProperty('endGame');
  });

  it('sets updatedAt to the reopen time', () => {
    // Arrange
    const finished = finish(withTurns(pass));
    const action: GameAction = { type: 'reopenGame', at: 'again' };

    // Act
    const result = reduce(finished, action);

    // Assert
    expect(result.updatedAt).toBe('again');
  });

  it('keeps the turns, so play can continue with the next player', () => {
    // Arrange
    const reopened = reduce(finish(withTurns(pass, pass)), { type: 'reopenGame', at: 'x' });

    // Act
    const result = addTurn(reopened, pass);

    // Assert
    expect(result.turns.map((t) => t.playerId)).toEqual(['a', 'b', 'c']);
  });

  it('rejects reopening a game that is still active', () => {
    // Arrange
    const game = newGame();
    const action: GameAction = { type: 'reopenGame', at: 'x' };

    // Act
    const act = () => reduce(game, action);

    // Assert
    expect(act).toThrow(GameError);
  });
});

describe('derived scores', () => {
  // Round 1: Ann QUIZ on the star (44), Bob passes, Cat FAX + XI sharing a DL (38).
  // Round 2: Ann RETAINS on a DW with AS, bingo (14 + 2 + 50 = 66).
  const game = withTurns(
    play([word('QUIZ', { dw: 1 })]),
    pass,
    play([word('FAX2'), word('X2I')]),
    play([word('RETAINS', { dw: 1 }), word('AS')], true),
  );

  describe('scoredTurns', () => {
    it('scores each turn and gives its round', () => {
      // Arrange
      const sample = game;

      // Act
      const result = scoredTurns(sample);

      // Assert
      expect(result.map((s) => [s.turn.id, s.round, s.score.total])).toEqual([
        ['t1', 1, 44],
        ['t2', 1, 0],
        ['t3', 1, 38],
        ['t4', 2, 66],
      ]);
    });
  });

  describe('scoreboardRounds', () => {
    it('makes one row per round', () => {
      // Arrange
      const sample = game;

      // Act
      const rounds = scoreboardRounds(sample);

      // Assert
      expect(rounds.map((r) => r.round)).toEqual([1, 2]);
    });

    it("puts each turn under its player in that round's row", () => {
      // Arrange
      const sample = game;

      // Act
      const [round1] = scoreboardRounds(sample);

      // Assert
      expect(round1?.turns.a?.score.total).toBe(44);
      expect(round1?.turns.b?.score.total).toBe(0);
      expect(round1?.turns.c?.score.total).toBe(38);
    });

    it('leaves players who have not played yet in a round empty', () => {
      // Arrange
      const sample = game;

      // Act
      const [, round2] = scoreboardRounds(sample);

      // Assert
      expect(Object.keys(round2?.turns ?? {})).toEqual(['a']);
    });

    it('has no rows before the first turn', () => {
      // Arrange
      const fresh = newGame();

      // Act
      const rounds = scoreboardRounds(fresh);

      // Assert
      expect(rounds).toEqual([]);
    });
  });

  describe('playerTotals', () => {
    it('totals each player, in turn order', () => {
      // Arrange
      const sample = game;

      // Act
      const totals = playerTotals(sample);

      // Assert
      expect(totals.map((t) => [t.player.id, t.total])).toEqual([
        ['a', 110],
        ['b', 0],
        ['c', 38],
      ]);
    });

    it('gives 0 to players who have not played yet', () => {
      // Arrange
      const fresh = newGame();

      // Act
      const totals = playerTotals(fresh);

      // Assert
      expect(totals.map((t) => t.total)).toEqual([0, 0, 0]);
    });

    it('applies end-game adjustments once the game is finished', () => {
      // Arrange
      const finished = finish(game, { wentOutPlayerId: 'c', remaining: { a: 'Q', b: 'E?' } });

      // Act
      const totals = playerTotals(finished);

      // Assert
      expect(totals).toEqual([
        { player: players[0], turns: 110, adjustment: -10, total: 100 },
        { player: players[1], turns: 0, adjustment: -1, total: -1 },
        { player: players[2], turns: 38, adjustment: 11, total: 49 },
      ]);
    });

    it('stops applying adjustments when the game is reopened', () => {
      // Arrange
      const finished = finish(game, { wentOutPlayerId: 'c', remaining: { a: 'Q' } });
      const reopened = reduce(finished, { type: 'reopenGame', at: 'x' });

      // Act
      const totals = playerTotals(reopened);

      // Assert
      expect(totals.map((t) => t.adjustment)).toEqual([0, 0, 0]);
    });

    it('recalculates when an earlier turn is edited', () => {
      // Arrange
      const edited = reduce(game, { type: 'editTurn', turnId: 't1', at: 'x', turn: pass });

      // Act
      const totals = playerTotals(edited);

      // Assert
      expect(totals[0]?.total).toBe(110 - 44);
    });
  });

  describe('standings', () => {
    it('ranks players by total, highest first', () => {
      // Arrange
      const sample = game;

      // Act
      const { ranking } = standings(sample);

      // Assert
      expect(ranking.map((t) => t.player.id)).toEqual(['a', 'c', 'b']);
    });

    it('has a single leader when nobody ties', () => {
      // Arrange
      const sample = game;

      // Act
      const { leaders } = standings(sample);

      // Assert
      expect(leaders.map((p) => p.id)).toEqual(['a']);
    });

    it('lists every player sharing the top score as leaders', () => {
      // Arrange
      const tied = withTurns(play([word('CAT')]), play([word('ACT')]), pass);

      // Act
      const { leaders } = standings(tied);

      // Assert
      expect(leaders.map((p) => p.id)).toEqual(['a', 'b']);
    });

    it('keeps turn order between tied players', () => {
      // Arrange
      const allZero = newGame();

      // Act
      const { ranking } = standings(allZero);

      // Assert
      expect(ranking.map((t) => t.player.id)).toEqual(['a', 'b', 'c']);
    });

    it('ranks a negative total last', () => {
      // Arrange
      const finished = finish(withTurns(pass), { wentOutPlayerId: null, remaining: { b: 'Q' } });

      // Act
      const { ranking } = standings(finished);

      // Assert
      expect(ranking.map((t) => t.player.id)).toEqual(['a', 'c', 'b']);
    });

    it('can have leaders on 0 when someone else is negative', () => {
      // Arrange
      const finished = finish(withTurns(pass), { wentOutPlayerId: null, remaining: { b: 'Q' } });

      // Act
      const { leaders } = standings(finished);

      // Assert
      expect(leaders.map((p) => p.id)).toEqual(['a', 'c']);
    });
  });

  describe('bestTurn', () => {
    it('finds the highest-scoring turn', () => {
      // Arrange
      const sample = game;

      // Act
      const best = bestTurn(sample);

      // Assert
      expect(best?.turn.id).toBe('t4');
    });

    it('picks the earliest turn on a tie', () => {
      // Arrange
      const tied = withTurns(play([word('CAT')]), play([word('ACT')]));

      // Act
      const best = bestTurn(tied);

      // Assert
      expect(best?.turn.id).toBe('t1');
    });

    it('is undefined before anyone has scored', () => {
      // Arrange
      const quiet = withTurns(pass, { kind: 'exchange' });

      // Act
      const best = bestTurn(quiet);

      // Assert
      expect(best).toBeUndefined();
    });
  });

  describe('bestWord', () => {
    it('finds the highest-scoring single word, ignoring the bingo bonus', () => {
      // Arrange
      const sample = game;

      // Act
      const best = bestWord(sample);

      // Assert
      expect(best).toEqual({ word: 'QUIZ', score: 44, playerId: 'a', turnId: 't1' });
    });

    it('considers cross-words, not just the first word', () => {
      // Arrange
      const crossWordWins = withTurns(play([word('AT'), word('ZAX')]));

      // Act
      const best = bestWord(crossWordWins);

      // Assert
      expect(best?.word).toBe('ZAX');
    });

    it('picks the earliest word on a tie', () => {
      // Arrange
      const tied = withTurns(play([word('CAT')]), play([word('ACT')]));

      // Act
      const best = bestWord(tied);

      // Assert
      expect(best?.word).toBe('CAT');
    });

    it('is undefined before anyone has scored', () => {
      // Arrange
      const quiet = withTurns(pass, play([word('ab')]));

      // Act
      const best = bestWord(quiet);

      // Assert
      expect(best).toBeUndefined();
    });
  });
});
