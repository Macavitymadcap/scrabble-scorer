import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { createGame, reduce } from '../../../domain/game.ts';
import { play, word } from '../../../domain/testing.ts';
import type { EndGame, Game } from '../../../domain/types.ts';
import { create, mount } from '../../testing.ts';
import './ss-endgame-form.ts';
import type { FinishGameEvent, SsEndgameForm } from './ss-endgame-form.ts';

/** Ann has played QUIZ (22), Bob has passed, Cat has played CAT (5). */
const sampleGame = (): Game => {
  const players = [
    { id: 'a', name: 'Ann' },
    { id: 'b', name: 'Bob' },
    { id: 'c', name: 'Cat' },
  ];
  const turns = [play([word('QUIZ')]), { kind: 'pass' as const }, play([word('CAT')])];
  return turns.reduce(
    (game, turn, i) => reduce(game, { type: 'addTurn', id: `t${i}`, at: `at${i}`, turn }),
    createGame({ id: 'g', at: 'start', players }),
  );
};

const rackField = (name: string) => page.getByRole('textbox', { name, exact: true });
const wentOutRadio = (name: string) =>
  page.getByRole('group', { name: 'Who went out?' }).getByRole('radio', { name, exact: true });
const finishButton = () => page.getByRole('button', { name: 'Finish game' });

/** The cells of the preview row for a player: turns, end game, total. */
const previewRow = (form: SsEndgameForm, name: string) =>
  [...(form.shadowRoot?.querySelectorAll('tbody tr') ?? [])]
    .find((row) => row.querySelector('th')?.textContent === name)
    ?.querySelectorAll('td');

const cellTexts = (cells: NodeListOf<Element> | undefined) =>
  [...(cells ?? [])].map((cell) => cell.textContent?.trim());

const mountForm = () => mount(create('ss-endgame-form', { game: sampleGame() }));

const listenForFinish = (form: SsEndgameForm) => {
  const finished = vi.fn<(endGame: EndGame) => void>();
  form.addEventListener('finish-game', (event: FinishGameEvent) => finished(event.endGame));
  return finished;
};

describe('ss-endgame-form', () => {
  it('renders nothing without a game', async () => {
    // Arrange
    const form = await mount(create('ss-endgame-form'));

    // Act
    const rendered = form.shadowRoot?.querySelector('form');

    // Assert
    expect(rendered).toBeNull();
  });

  describe('tiles left', () => {
    it('has a field for each player, labelled by name', async () => {
      // Arrange
      await mountForm();

      // Act
      const fields = page
        .getByRole('group', { name: 'Tiles left on each rack' })
        .getByRole('textbox');

      // Assert
      expect(fields.elements()).toHaveLength(3);
    });

    it('keeps only letters and ?, in capitals', async () => {
      // Arrange
      await mountForm();

      // Act
      await userEvent.fill(rackField('Ann'), 'q, e?1');

      // Assert
      await expect.element(rackField('Ann')).toHaveValue('QE?');
    });

    it('shows the value of the tiles typed', async () => {
      // Arrange
      await mountForm();

      // Act
      await userEvent.fill(rackField('Ann'), 'qe?');

      // Assert
      await expect.element(rackField('Ann')).toHaveAccessibleDescription('Tile value: 11');
    });

    it('rejects more than seven tiles once the field is left', async () => {
      // Arrange
      await mountForm();
      await userEvent.fill(rackField('Ann'), 'abcdefgh');

      // Act
      await userEvent.tab();

      // Assert
      await expect.element(rackField('Ann')).toHaveAttribute('aria-invalid', 'true');
    });

    it('clears an error as soon as the player types', async () => {
      // Arrange
      await mountForm();
      await userEvent.fill(rackField('Ann'), 'abcdefgh');
      await userEvent.tab();

      // Act
      await userEvent.fill(rackField('Ann'), 'abc');

      // Assert
      await expect.element(rackField('Ann')).toHaveAttribute('aria-invalid', 'false');
    });
  });

  describe('who went out', () => {
    it('starts with nobody', async () => {
      // Arrange
      await mountForm();

      // Act
      const nobody = wentOutRadio('Nobody');

      // Assert
      await expect.element(nobody).toBeChecked();
    });

    it('picks the only player left with an empty rack', async () => {
      // Arrange
      await mountForm();
      await userEvent.fill(rackField('Ann'), 'q');

      // Act
      await userEvent.fill(rackField('Bob'), 'e');

      // Assert
      await expect.element(wentOutRadio('Cat')).toBeChecked();
    });

    it('stops suggesting once a player is chosen by hand', async () => {
      // Arrange
      await mountForm();
      await userEvent.click(wentOutRadio('Nobody'));
      await userEvent.fill(rackField('Ann'), 'q');

      // Act
      await userEvent.fill(rackField('Bob'), 'e');

      // Assert
      await expect.element(wentOutRadio('Nobody')).toBeChecked();
    });
  });

  describe('preview', () => {
    it('shows turn points, adjustment and total for each player', async () => {
      // Arrange
      const form = await mountForm();
      await userEvent.fill(rackField('Bob'), 'qe');

      // Act
      const bob = cellTexts(previewRow(form, 'Bob'));

      // Assert
      expect(bob).toEqual(['0', '-11', '-11']);
    });

    it("adds everyone's tiles to the player who went out", async () => {
      // Arrange
      const form = await mountForm();
      await userEvent.fill(rackField('Ann'), 'x');
      await userEvent.fill(rackField('Bob'), 'qe');

      // Act
      const cat = cellTexts(previewRow(form, 'Cat'));

      // Assert
      expect(cat).toEqual(['5', '+19', '24']);
    });
  });

  describe('finishing', () => {
    it('fires finish-game with the racks and who went out', async () => {
      // Arrange
      const form = await mountForm();
      const finished = listenForFinish(form);
      await userEvent.fill(rackField('Ann'), 'x');
      await userEvent.fill(rackField('Bob'), 'qe');

      // Act
      await userEvent.click(finishButton());

      // Assert
      expect(finished).toHaveBeenCalledWith({
        wentOutPlayerId: 'c',
        remaining: { a: 'X', b: 'QE' },
      });
    });

    it('can finish with nobody going out and no tiles entered', async () => {
      // Arrange
      const form = await mountForm();
      const finished = listenForFinish(form);

      // Act
      await userEvent.click(finishButton());

      // Assert
      expect(finished).toHaveBeenCalledWith({ wentOutPlayerId: null, remaining: {} });
    });

    it('rejects tiles left for the player who went out', async () => {
      // Arrange
      await mountForm();
      await userEvent.click(wentOutRadio('Ann'));
      await userEvent.fill(rackField('Ann'), 'q');

      // Act
      await userEvent.click(finishButton());

      // Assert
      await expect
        .element(rackField('Ann'))
        .toHaveAccessibleDescription(/Ann went out, so their rack must be empty\./);
    });

    it('does not finish when a rack is invalid', async () => {
      // Arrange
      const form = await mountForm();
      const finished = listenForFinish(form);
      await userEvent.fill(rackField('Ann'), 'abcdefgh');

      // Act
      await userEvent.click(finishButton());

      // Assert
      expect(finished).not.toHaveBeenCalled();
    });

    it('moves focus to the first invalid rack', async () => {
      // Arrange
      const form = await mountForm();
      await userEvent.fill(rackField('Bob'), 'abcdefgh');

      // Act
      await userEvent.click(finishButton());

      // Assert
      expect(form.shadowRoot?.activeElement?.id).toBe('rack-b');
    });

    it('shows an error from the store as an alert', async () => {
      // Arrange
      const form = await mountForm();
      const message = 'That end game broke a rule.';

      // Act
      form.error = message;
      await form.updateComplete;

      // Assert
      await expect.element(page.getByRole('alert')).toHaveTextContent(message);
    });
  });
});
