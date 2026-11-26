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

function newGame(): Game {
  return createGame({ id: 'g1', at: T0, players });
}

/** Adds a turn with a predictable id (t1, t2, ...) and time. */
function addTurn(game: Game, turn: TurnInput): Game {
  const n = game.turns.length + 1;
  return reduce(game, { type: 'addTurn', id: `t${n}`, at: `at-${n}`, turn });
}

/** A new game with these turns played in order: Ann, Bob, Cat, Ann, ... */
function withTurns(...turns: TurnInput[]): Game {
  return turns.reduce(addTurn, newGame());
}

function finish(game: Game, endGame: EndGame = noTilesLeft): Game {
  return reduce(game, { type: 'finishGame', at: 'end', endGame });
}

describe('createGame', () => {
  it('starts an active game with no turns', () => {
    // Act
    const game = newGame();

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

    // Act
    const game = createGame({ id: 'g', at: T0, players: input });
    input.pop();

    // Assert
    expect(game.players).toHaveLength(3);
  });

  it('validates the players', () => {
    // Act & Assert
    expect(() => createGame({ id: 'g', at: T0, players: [players[0]!] })).toThrow(GameError);
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
    // Act
    const round = roundOf(index, playerCount);

    // Assert
    expect(round).toBe(expected);
  });
});

describe('nextPlayer and currentRound', () => {
  it('start with the first player in round 1', () => {
    // Arrange
    const game = newGame();

    // Act & Assert
    expect(nextPlayer(game).id).toBe('a');
    expect(currentRound(game)).toBe(1);
  });

  it('move to the next player after a turn', () => {
    // Arrange
    const game = withTurns(pass);

    // Act & Assert
    expect(nextPlayer(game).id).toBe('b');
    expect(currentRound(game)).toBe(1);
  });

  it('wrap to the first player and the next round after everyone has played', () => {
    // Arrange
    const game = withTurns(pass, pass, pass);

    // Act & Assert
    expect(nextPlayer(game).id).toBe('a');
    expect(currentRound(game)).toBe(2);
  });

  it('throw if a game somehow has no players', () => {
    // Arrange
    const broken = { ...newGame(), players: [] };

    // Act & Assert
    expect(() => nextPlayer(broken)).toThrow(GameError);
  });
});

describe('reduce: addTurn', () => {
  it('records the turn for the next player with the given id and time', () => {
    // Arrange
    const game = newGame();
    const turn = play([word('CAT')]);

    // Act
    const result = reduce(game, { type: 'addTurn', id: 'x', at: 'later', turn });

    // Assert
    expect(result.turns).toEqual([{ ...turn, id: 'x', playerId: 'a', at: 'later' }]);
  });

  it('sets updatedAt to the action time', () => {
    // Act
    const result = reduce(newGame(), { type: 'addTurn', id: 'x', at: 'later', turn: pass });

    // Assert
    expect(result.updatedAt).toBe('later');
  });

  it('assigns turns to players in order', () => {
    // Act
    const game = withTurns(pass, pass, pass, pass);

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
    // Act & Assert
    expect(() => addTurn(newGame(), play([word('A')]))).toThrow(GameError);
  });

  it('is refused once the game has finished', () => {
    // Arrange
    const finished = finish(newGame());

    // Act & Assert
    expect(() => addTurn(finished, pass)).toThrow(GameError);
  });
});

describe('reduce: editTurn', () => {
  it("replaces the turn's content but keeps its id, player, time and position", () => {
    // Arrange
    const game = withTurns(play([word('CAT')]), play([word('DOG')]));

    // Act
    const result = reduce(game, {
      type: 'editTurn',
      turnId: 't1',
      at: 'edit-time',
      turn: play([word('CART')]),
    });

    // Assert
    expect(result.turns[0]).toEqual({
      ...play([word('CART')]),
      id: 't1',
      playerId: 'a',
      at: 'at-1',
    });
    expect(result.turns[1]).toBe(game.turns[1]);
  });

  it('sets updatedAt to the edit time', () => {
    // Arrange
    const game = withTurns(pass);

    // Act
    const result = reduce(game, { type: 'editTurn', turnId: 't1', at: 'edit-time', turn: pass });

    // Assert
    expect(result.updatedAt).toBe('edit-time');
  });

  it('can turn a play into a pass, dropping its words', () => {
    // Arrange
    const game = withTurns(play([word('CAT')]));

    // Act
    const result = reduce(game, { type: 'editTurn', turnId: 't1', at: 'x', turn: pass });

    // Assert
    expect(result.turns[0]?.kind).toBe('pass');
    expect(result.turns[0]).not.toHaveProperty('words');
  });

  it('does not change whose turn is next', () => {
    // Arrange
    const game = withTurns(pass, pass);

    // Act
    const result = reduce(game, {
      type: 'editTurn',
      turnId: 't1',
      at: 'x',
      turn: play([word('AT')]),
    });

    // Assert
    expect(nextPlayer(result).id).toBe('c');
  });

  it('rejects an unknown turn id', () => {
    // Arrange
    const game = withTurns(pass);

    // Act & Assert
    expect(() => reduce(game, { type: 'editTurn', turnId: 'nope', at: 'x', turn: pass })).toThrow(
      GameError,
    );
  });

  it('validates the new turn', () => {
    // Arrange
    const game = withTurns(pass);

    // Act & Assert
    expect(() => reduce(game, { type: 'editTurn', turnId: 't1', at: 'x', turn: play([]) })).toThrow(
      GameError,
    );
  });

  it('is refused once the game has finished', () => {
    // Arrange
    const finished = finish(withTurns(pass));

    // Act & Assert
    expect(() => reduce(finished, { type: 'editTurn', turnId: 't1', at: 'x', turn: pass })).toThrow(
      GameError,
    );
  });
});

describe('reduce: undoTurn', () => {
  it('removes the last turn and hands the turn back', () => {
    // Arrange
    const game = withTurns(pass, pass);

    // Act
    const result = reduce(game, { type: 'undoTurn', at: 'undo-time' });

    // Assert
    expect(result.turns.map((t) => t.id)).toEqual(['t1']);
    expect(nextPlayer(result).id).toBe('b');
    expect(result.updatedAt).toBe('undo-time');
  });

  it('can undo back to the very first turn', () => {
    // Arrange
    const game = withTurns(pass);

    // Act
    const result = reduce(game, { type: 'undoTurn', at: 'x' });

    // Assert
    expect(result.turns).toEqual([]);
    expect(nextPlayer(result).id).toBe('a');
  });

  it('rejects undo when there are no turns', () => {
    // Act & Assert
    expect(() => reduce(newGame(), { type: 'undoTurn', at: 'x' })).toThrow(GameError);
  });

  it('is refused once the game has finished', () => {
    // Arrange
    const finished = finish(withTurns(pass));

    // Act & Assert
    expect(() => reduce(finished, { type: 'undoTurn', at: 'x' })).toThrow(GameError);
  });
});

describe('reduce: finishGame', () => {
  it('marks the game finished and stores the end game', () => {
    // Arrange
    const endGame = { wentOutPlayerId: null, remaining: { a: 'E' } };

    // Act
    const result = reduce(withTurns(pass), { type: 'finishGame', at: 'end', endGame });

    // Assert
    expect(result.status).toBe('finished');
    expect(result.endGame).toEqual(endGame);
    expect(result.updatedAt).toBe('end');
  });

  it('can finish a game with no turns', () => {
    // Act
    const result = finish(newGame());

    // Assert
    expect(result.status).toBe('finished');
  });

  it('validates the end game', () => {
    // Arrange
    const endGame = { wentOutPlayerId: 'nobody', remaining: {} };

    // Act & Assert
    expect(() => finish(newGame(), endGame)).toThrow(GameError);
  });

  it('rejects finishing twice', () => {
    // Arrange
    const finished = finish(newGame());

    // Act & Assert
    expect(() => finish(finished)).toThrow(GameError);
  });
});

describe('reduce: reopenGame', () => {
  it('makes the game active again and drops the end game', () => {
    // Arrange
    const finished = finish(withTurns(pass), { wentOutPlayerId: null, remaining: { a: 'E' } });

    // Act
    const result = reduce(finished, { type: 'reopenGame', at: 'again' });

    // Assert
    expect(result.status).toBe('active');
    expect(result).not.toHaveProperty('endGame');
    expect(result.updatedAt).toBe('again');
  });

  it('keeps the turns, so play can continue', () => {
    // Arrange
    const finished = finish(withTurns(pass, pass));

    // Act
    const result = addTurn(reduce(finished, { type: 'reopenGame', at: 'x' }), pass);

    // Assert
    expect(result.turns.map((t) => t.playerId)).toEqual(['a', 'b', 'c']);
  });

  it('rejects reopening a game that is still active', () => {
    // Act & Assert
    expect(() => reduce(newGame(), { type: 'reopenGame', at: 'x' })).toThrow(GameError);
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
    it('scores each turn with its round', () => {
      // Act
      const result = scoredTurns(game);

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
    it('groups turns by round and player', () => {
      // Act
      const rounds = scoreboardRounds(game);

      // Assert
      expect(rounds.map((r) => r.round)).toEqual([1, 2]);
      expect(rounds[0]?.turns.a?.score.total).toBe(44);
      expect(rounds[0]?.turns.b?.score.total).toBe(0);
      expect(rounds[0]?.turns.c?.score.total).toBe(38);
      expect(rounds[1]?.turns.a?.score.total).toBe(66);
    });

    it('leaves players who have not played yet in a round empty', () => {
      // Act
      const [, round2] = scoreboardRounds(game);

      // Assert
      expect(round2?.turns.b).toBeUndefined();
      expect(round2?.turns.c).toBeUndefined();
    });

    it('has no rounds before the first turn', () => {
      // Act
      const rounds = scoreboardRounds(newGame());

      // Assert
      expect(rounds).toEqual([]);
    });
  });

  describe('playerTotals', () => {
    it('totals each player, in turn order', () => {
      // Act
      const totals = playerTotals(game);

      // Assert
      expect(totals.map((t) => [t.player.id, t.total])).toEqual([
        ['a', 110],
        ['b', 0],
        ['c', 38],
      ]);
    });

    it('gives 0 to players who have not played yet', () => {
      // Act
      const totals = playerTotals(newGame());

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
      // Act
      const { ranking } = standings(game);

      // Assert
      expect(ranking.map((t) => t.player.id)).toEqual(['a', 'c', 'b']);
    });

    it('has a single leader when nobody ties', () => {
      // Act
      const { leaders } = standings(game);

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
      // Act
      const { ranking } = standings(newGame());

      // Assert
      expect(ranking.map((t) => t.player.id)).toEqual(['a', 'b', 'c']);
    });

    it('ranks negative totals below zero', () => {
      // Arrange
      const finished = finish(withTurns(pass), { wentOutPlayerId: null, remaining: { b: 'Q' } });

      // Act
      const { ranking, leaders } = standings(finished);

      // Assert
      expect(ranking.at(-1)?.player.id).toBe('b');
      expect(leaders.map((p) => p.id)).toEqual(['a', 'c']);
    });
  });

  describe('bestTurn', () => {
    it('finds the highest-scoring turn', () => {
      // Act
      const best = bestTurn(game);

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
      // Act
      const best = bestWord(game);

      // Assert
      expect(best).toEqual({ word: 'QUIZ', score: 44, playerId: 'a', turnId: 't1' });
    });

    it('considers cross-words, not just the first word', () => {
      // Arrange
      const crossWins = withTurns(play([word('AT'), word('ZAX')]));

      // Act
      const best = bestWord(crossWins);

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
