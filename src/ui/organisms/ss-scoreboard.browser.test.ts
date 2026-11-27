import { describe, expect, it } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser/context';
import { reduce } from '../../domain/game.ts';
import { play, word } from '../../domain/testing.ts';
import type { Game, TurnInput } from '../../domain/types.ts';
import { finishedGame, sampleGame } from '../../state/testing.ts';
import { create, mount } from '../testing.ts';
import './ss-scoreboard.ts';

const withTurn = (game: Game, turn: TurnInput, id: string): Game =>
  reduce(game, { type: 'addTurn', id, at: id, turn });

/** The text of each cell in a row, header first. */
const rowText = (row: HTMLTableRowElement | null | undefined): string[] =>
  [...(row?.cells ?? [])].map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '');

const table = (board: HTMLElement) => board.shadowRoot?.querySelector('table');

describe('ss-scoreboard', () => {
  it('renders nothing without a game', async () => {
    // Arrange
    const board = await mount(create('ss-scoreboard'));

    // Act
    const rendered = table(board);

    // Assert
    expect(rendered).toBeNull();
  });

  it('is a table captioned "Scores"', async () => {
    // Arrange
    await mount(create('ss-scoreboard', { game: sampleGame() }));

    // Act
    const scores = page.getByRole('table', { name: 'Scores' });

    // Assert
    await expect.element(scores).toBeVisible();
  });

  it('sits in a focusable region named by the caption, so it can be scrolled by keyboard', async () => {
    // Arrange
    await mount(create('ss-scoreboard', { game: sampleGame() }));

    // Act
    const region = page.getByRole('region', { name: 'Scores' });

    // Assert
    await expect.element(region).toHaveAttribute('tabindex', '0');
  });

  it('has a column header for each player, marking who plays next', async () => {
    // Arrange
    const board = await mount(create('ss-scoreboard', { game: sampleGame() }));

    // Act
    const header = rowText(table(board)?.tHead?.rows[0]);

    // Assert
    expect(header).toEqual(['Round', 'Ann (next)', 'Bob']);
  });

  it('uses column headers scoped to their columns', async () => {
    // Arrange
    const board = await mount(create('ss-scoreboard', { game: sampleGame() }));

    // Act
    const scopes = [...(table(board)?.tHead?.rows[0]?.cells ?? [])].map((cell) =>
      cell.getAttribute('scope'),
    );

    // Assert
    expect(scopes).toEqual(['col', 'col', 'col']);
  });

  it('shows each round with its scores, and Pass for a pass', async () => {
    // Arrange
    const board = await mount(create('ss-scoreboard', { game: sampleGame() }));

    // Act
    const round1 = rowText(table(board)?.tBodies[0]?.rows[0]);

    // Assert
    expect(round1).toEqual(['1', '5', 'Pass']);
  });

  it('labels exchanges and withdrawn words', async () => {
    // Arrange
    const game = withTurn(
      withTurn(sampleGame(), { kind: 'exchange' }, 't3'),
      { kind: 'withdrawn' },
      't4',
    );
    const board = await mount(create('ss-scoreboard', { game }));

    // Act
    const round2 = rowText(table(board)?.tBodies[0]?.rows[1]);

    // Assert
    expect(round2).toEqual(['2', 'Exchange', 'Withdrawn']);
  });

  it('marks turns not played yet in the current round', async () => {
    // Arrange
    const game = withTurn(sampleGame(), play([word('DOG')]), 't3');
    const board = await mount(create('ss-scoreboard', { game }));

    // Act
    const round2 = rowText(table(board)?.tBodies[0]?.rows[1]);

    // Assert
    expect(round2).toEqual(['2', '5', '-Not played yet']);
  });

  it('shows totals in the footer', async () => {
    // Arrange
    const game = withTurn(sampleGame(), play([word('QI')]), 't3');
    const board = await mount(create('ss-scoreboard', { game }));

    // Act
    const totals = rowText(table(board)?.tFoot?.rows[0]);

    // Assert
    expect(totals).toEqual(['Total', String(5 + 11), '0']);
  });

  it('has no body rows before the first turn', async () => {
    // Arrange
    const { turns: _turns, ...rest } = sampleGame();
    const board = await mount(create('ss-scoreboard', { game: { ...rest, turns: [] } }));

    // Act
    const rows = table(board)?.tBodies[0]?.rows.length;

    // Assert
    expect(rows).toBe(0);
  });

  it('marks nobody as next once the game has finished', async () => {
    // Arrange
    const board = await mount(create('ss-scoreboard', { game: finishedGame() }));

    // Act
    const header = rowText(table(board)?.tHead?.rows[0]);

    // Assert
    expect(header).toEqual(['Round', 'Ann', 'Bob']);
  });

  it('updates when the game changes', async () => {
    // Arrange
    const board = await mount(create('ss-scoreboard', { game: sampleGame() }));

    // Act
    board.game = withTurn(sampleGame(), play([word('ZA')]), 't3');
    await board.updateComplete;

    // Assert
    expect(rowText(table(board)?.tFoot?.rows[0])).toEqual(['Total', String(5 + 11), '0']);
  });
});
