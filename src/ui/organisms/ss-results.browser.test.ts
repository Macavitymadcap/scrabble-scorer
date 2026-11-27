import { describe, expect, it } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser/context';
import { createGame, reduce } from '../../domain/game.ts';
import { play, word } from '../../domain/testing.ts';
import type { EndGame, Game, TurnInput } from '../../domain/types.ts';
import { create, mount } from '../testing.ts';
import './ss-results.ts';
import { outcomeText } from './ss-results.ts';

const PLAYERS = [
  { id: 'a', name: 'Ann' },
  { id: 'b', name: 'Bob' },
];

/** A finished game with these turns (Ann, Bob, Ann, ...) and end game. */
const finished = (
  turns: TurnInput[],
  endGame: EndGame = { wentOutPlayerId: null, remaining: {} },
): Game => {
  const played = turns.reduce(
    (game, turn, i) => reduce(game, { type: 'addTurn', id: `t${i}`, at: `at${i}`, turn }),
    createGame({ id: 'g', at: 'start', players: PLAYERS }),
  );
  return reduce(played, { type: 'finishGame', at: 'end', endGame });
};

// Ann: QUIZ on the star (44). Bob: CAT (5). Ann went out; Bob has Q and E left (11).
const annWins = () =>
  finished([play([word('QUIZ', { dw: 1 })]), play([word('CAT')])], {
    wentOutPlayerId: 'a',
    remaining: { b: 'QE' },
  });

const rowTexts = (results: HTMLElement) =>
  [...(results.shadowRoot?.querySelectorAll<HTMLTableRowElement>('tbody tr') ?? [])].map((row) =>
    [...row.cells].map((cell) => cell.textContent?.trim()),
  );

describe('outcomeText', () => {
  it('names a single winner with their score', () => {
    // Arrange
    const game = annWins();

    // Act
    const text = outcomeText(game);

    // Assert
    expect(text).toBe('Ann wins with 55 points.');
  });

  it('names every player in a tie', () => {
    // Arrange
    const game = finished([play([word('CAT')]), play([word('ACT')])]);

    // Act
    const text = outcomeText(game);

    // Assert
    expect(text).toBe('Ann and Bob tie on 5 points.');
  });
});

describe('ss-results', () => {
  it('renders nothing without a game', async () => {
    // Arrange
    const results = await mount(create('ss-results'));

    // Act
    const table = results.shadowRoot?.querySelector('table');

    // Assert
    expect(table).toBeNull();
  });

  it('states the outcome', async () => {
    // Arrange
    await mount(create('ss-results', { game: annWins() }));

    // Act
    const outcome = page.getByText('Ann wins with 55 points.');

    // Assert
    await expect.element(outcome).toBeVisible();
  });

  it('is a table captioned "Final scores"', async () => {
    // Arrange
    await mount(create('ss-results', { game: annWins() }));

    // Act
    const table = page.getByRole('table', { name: 'Final scores' });

    // Assert
    await expect.element(table).toBeVisible();
  });

  it('ranks players with turn points, adjustment and total', async () => {
    // Arrange
    const results = await mount(create('ss-results', { game: annWins() }));

    // Act
    const rows = rowTexts(results);

    // Assert
    expect(rows).toEqual([
      ['Ann', '44', '+11', '55'],
      ['Bob', '5', '-11', '-6'],
    ]);
  });

  it('highlights the winner', async () => {
    // Arrange
    const results = await mount(create('ss-results', { game: annWins() }));

    // Act
    const winners = results.shadowRoot?.querySelectorAll('tr.winner th');

    // Assert
    expect([...(winners ?? [])].map((th) => th.textContent)).toEqual(['Ann']);
  });

  it('highlights every player in a tie', async () => {
    // Arrange
    const game = finished([play([word('CAT')]), play([word('ACT')])]);
    const results = await mount(create('ss-results', { game }));

    // Act
    const winners = results.shadowRoot?.querySelectorAll('tr.winner');

    // Assert
    expect(winners).toHaveLength(2);
  });

  it('shows the best turn with player and round', async () => {
    // Arrange
    await mount(create('ss-results', { game: annWins() }));

    // Act
    const best = page.getByText('Ann, round 1: 44 points');

    // Assert
    await expect.element(best).toBeVisible();
  });

  it('shows the best word, with blanks in lower case', async () => {
    // Arrange
    const game = finished([play([word('qUIZ', { tw: 1 })]), { kind: 'pass' }]);
    await mount(create('ss-results', { game }));

    // Act
    const best = page.getByText('qUIZ by Ann: 36 points');

    // Assert
    await expect.element(best).toBeVisible();
  });

  it('says so when nobody scored', async () => {
    // Arrange
    const game = finished([{ kind: 'pass' }, { kind: 'pass' }]);
    await mount(create('ss-results', { game }));

    // Act
    const none = page.getByText('No scoring turns');

    // Assert
    await expect.element(none).toBeVisible();
  });
});
