import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { play, word } from '../../domain/testing.ts';
import type { TurnInput } from '../../domain/types.ts';
import { create, mount } from '../testing.ts';
import './ss-turn-form.ts';
import type { SaveTurnEvent, SsTurnForm } from './ss-turn-form.ts';

const lettersField = (legend = 'Main word') =>
  page.getByRole('group', { name: legend, exact: true }).getByRole('textbox', { name: 'Letters' });
const kindRadio = (name: string) => page.getByRole('radio', { name });
const button = (name: string | RegExp) => page.getByRole('button', { name });
const bingoBox = () => page.getByRole('checkbox', { name: /Bingo/ });

/**
 * A word-square choice, clicked by its label as a player would: the radio
 * itself is visually hidden behind the styled label.
 */
const squareChoice = (legend: string, label: string) =>
  page.getByRole('group', { name: legend }).getByText(label, { exact: true });

/** The text of the turn total output. */
const total = (form: SsTurnForm) =>
  form.shadowRoot?.querySelector('.total output')?.textContent?.trim();

const focusedId = (form: SsTurnForm) => form.shadowRoot?.activeElement?.id;

const mountForm = (turn?: TurnInput) => mount(create('ss-turn-form', { turn }));

/** Listens for save-turn and returns a spy called with each saved turn. */
const listenForSave = (form: SsTurnForm) => {
  const saved = vi.fn<(turn: TurnInput) => void>();
  form.addEventListener('save-turn', (event: SaveTurnEvent) => saved(event.turn));
  return saved;
};

describe('ss-turn-form', () => {
  describe('a new turn', () => {
    it('starts as a play', async () => {
      // Arrange
      await mountForm();

      // Act
      const played = kindRadio('Played a word');

      // Assert
      await expect.element(played).toBeChecked();
    });

    it('starts with one empty main word', async () => {
      // Arrange
      const form = await mountForm();

      // Act
      const { words } = form;

      // Assert
      expect(words).toEqual([{ tiles: [], doubleWords: 0, tripleWords: 0 }]);
    });

    it('starts with a total of 0', async () => {
      // Arrange
      const form = await mountForm();

      // Act
      const shown = total(form);

      // Assert
      expect(shown).toBe('0');
    });

    it('does not let the main word be removed', async () => {
      // Arrange
      await mountForm();

      // Act
      const remove = button(/^Remove/);

      // Assert
      await expect.element(remove).not.toBeInTheDocument();
    });
  });

  describe('turn type', () => {
    it('hides the words for a pass', async () => {
      // Arrange
      await mountForm();

      // Act
      await userEvent.click(kindRadio('Passed'));

      // Assert
      await expect.element(lettersField()).not.toBeInTheDocument();
    });

    it('offers every kind of turn', async () => {
      // Arrange
      await mountForm();

      // Act
      const radios = page.getByRole('radio', { name: /Played|Passed|Exchanged|withdrawn/ });

      // Assert
      expect(radios.elements()).toHaveLength(4);
    });

    it('saves a pass without needing a word', async () => {
      // Arrange
      const form = await mountForm();
      const saved = listenForSave(form);
      await userEvent.click(kindRadio('Passed'));

      // Act
      await userEvent.click(button('Save turn'));

      // Assert
      expect(saved).toHaveBeenCalledWith({ kind: 'pass' });
    });

    it('saves an exchange', async () => {
      // Arrange
      const form = await mountForm();
      const saved = listenForSave(form);
      await userEvent.click(kindRadio('Exchanged tiles'));

      // Act
      await userEvent.click(button('Save turn'));

      // Assert
      expect(saved).toHaveBeenCalledWith({ kind: 'exchange' });
    });

    it('saves a withdrawn word', async () => {
      // Arrange
      const form = await mountForm();
      const saved = listenForSave(form);
      await userEvent.click(kindRadio('Word withdrawn after a challenge'));

      // Act
      await userEvent.click(button('Save turn'));

      // Assert
      expect(saved).toHaveBeenCalledWith({ kind: 'withdrawn' });
    });

    it('keeps the words when switching to a pass and back', async () => {
      // Arrange
      await mountForm();
      await userEvent.fill(lettersField(), 'cat');
      await userEvent.click(kindRadio('Passed'));

      // Act
      await userEvent.click(kindRadio('Played a word'));

      // Assert
      await expect.element(lettersField()).toHaveValue('CAT');
    });
  });

  describe('entering a word', () => {
    it('shows a tile for each letter typed', async () => {
      // Arrange
      const form = await mountForm();

      // Act
      await userEvent.fill(lettersField(), 'cat');

      // Assert
      expect(form.shadowRoot?.querySelectorAll('.tile')).toHaveLength(3);
    });

    it('keeps only letters, in capitals', async () => {
      // Arrange
      await mountForm();

      // Act
      await userEvent.fill(lettersField(), "c-a t'1");

      // Assert
      await expect.element(lettersField()).toHaveValue('CAT');
    });

    it('updates the turn total as letters are typed', async () => {
      // Arrange
      const form = await mountForm();

      // Act
      await userEvent.fill(lettersField(), 'quiz');

      // Assert
      expect(total(form)).toBe('22');
    });

    it('cycles a tile through its marks when tapped', async () => {
      // Arrange
      await mountForm();
      await userEvent.fill(lettersField(), 'quiz');

      // Act
      await userEvent.click(button(/^Z,/));

      // Assert
      await expect.element(button(/^Z,/)).toHaveAccessibleName('Z, 10 points, double letter');
    });

    it('scores a tile marked as a double letter', async () => {
      // Arrange
      const form = await mountForm();
      await userEvent.fill(lettersField(), 'quiz');

      // Act
      await userEvent.click(button(/^Z,/));

      // Assert
      expect(total(form)).toBe(String(22 + 10));
    });

    it('scores a tile marked as a blank as 0', async () => {
      // Arrange
      const form = await mountForm();
      await userEvent.fill(lettersField(), 'quiz');
      const qTile = button(/^Q,/);

      // Act
      await userEvent.click(qTile);
      await userEvent.click(qTile);
      await userEvent.click(qTile);

      // Assert
      expect(total(form)).toBe(String(22 - 10));
    });

    it('announces the new mark of a tapped tile', async () => {
      // Arrange
      const form = await mountForm();
      await userEvent.fill(lettersField(), 'quiz');

      // Act
      await userEvent.click(button(/^Z,/));

      // Assert
      expect(form.status).toBe('Z: double letter.');
    });

    it('keeps marks when a later letter is added', async () => {
      // Arrange
      await mountForm();
      await userEvent.fill(lettersField(), 'qui');
      await userEvent.click(button(/^Q,/));

      // Act
      await userEvent.type(lettersField(), 'z');

      // Assert
      await expect.element(button(/^Q,/)).toHaveAccessibleName('Q, 10 points, double letter');
    });

    it('multiplies the word by its word squares', async () => {
      // Arrange
      const form = await mountForm();
      await userEvent.fill(lettersField(), 'quiz');
      // Act
      await userEvent.click(squareChoice('Double word squares', '1'));

      // Assert
      expect(total(form)).toBe('44');
    });
  });

  describe('cross-words', () => {
    it('adds a cross-word row', async () => {
      // Arrange
      const form = await mountForm();

      // Act
      await userEvent.click(button('Add cross-word'));

      // Assert
      expect(form.words).toHaveLength(2);
    });

    it("focuses the new cross-word's letters", async () => {
      // Arrange
      const form = await mountForm();

      // Act
      await userEvent.click(button('Add cross-word'));

      // Assert
      expect(focusedId(form)).toBe('word-1');
    });

    it('adds every word to the total', async () => {
      // Arrange
      const form = await mountForm();
      await userEvent.fill(lettersField(), 'fax');
      await userEvent.click(button('Add cross-word'));

      // Act
      await userEvent.fill(lettersField('Cross-word 1'), 'xi');

      // Assert
      expect(total(form)).toBe(String(13 + 9));
    });

    it('stops offering cross-words at 8 words', async () => {
      // Arrange
      const turn = play(Array.from({ length: 8 }, () => word('AT')));
      await mountForm(turn);

      // Act
      const add = button('Add cross-word');

      // Assert
      await expect.element(add).not.toBeInTheDocument();
    });

    it('removes a cross-word', async () => {
      // Arrange
      const form = await mountForm(play([word('FAX'), word('XI')]));

      // Act
      await userEvent.click(button('Remove cross-word 1'));

      // Assert
      expect(form.words).toEqual([word('FAX')]);
    });

    it('moves focus to the word above after removing one', async () => {
      // Arrange
      const form = await mountForm(play([word('FAX'), word('XI')]));

      // Act
      await userEvent.click(button('Remove cross-word 1'));

      // Assert
      expect(focusedId(form)).toBe('word-0');
    });

    it('announces the removal', async () => {
      // Arrange
      const form = await mountForm(play([word('FAX'), word('XI')]));

      // Act
      await userEvent.click(button('Remove cross-word 1'));

      // Assert
      expect(form.status).toBe('Cross-word 1 removed.');
    });
  });

  describe('bingo', () => {
    it('adds 50 to the total', async () => {
      // Arrange
      const form = await mountForm(play([word('RETAINS')]));

      // Act
      await userEvent.click(bingoBox());

      // Assert
      expect(total(form)).toBe(String(7 + 50));
    });

    it('is saved with the turn', async () => {
      // Arrange
      const form = await mountForm(play([word('RETAINS')]));
      const saved = listenForSave(form);
      await userEvent.click(bingoBox());

      // Act
      await userEvent.click(button('Save turn'));

      // Assert
      expect(saved).toHaveBeenCalledWith(play([word('RETAINS')], true));
    });

    it('needs a word of at least 7 letters', async () => {
      // Arrange
      await mountForm(play([word('RETAIN')]));
      await userEvent.click(bingoBox());

      // Act
      await userEvent.click(button('Save turn'));

      // Assert
      await expect
        .element(bingoBox())
        .toHaveAccessibleDescription(
          'A bingo uses all 7 tiles, so one word needs at least 7 letters.',
        );
    });

    it('moves focus to the bingo box when only its rule fails', async () => {
      // Arrange
      const form = await mountForm(play([word('RETAIN')]));
      await userEvent.click(bingoBox());

      // Act
      await userEvent.click(button('Save turn'));

      // Assert
      expect(focusedId(form)).toBe('bingo');
    });

    it('clears its error when unticked', async () => {
      // Arrange
      await mountForm(play([word('RETAIN')]));
      await userEvent.click(bingoBox());
      await userEvent.click(button('Save turn'));

      // Act
      await userEvent.click(bingoBox());

      // Assert
      await expect.element(bingoBox()).toHaveAttribute('aria-invalid', 'false');
    });
  });

  describe('validation', () => {
    it('asks for the word when saving an empty play', async () => {
      // Arrange
      await mountForm();

      // Act
      await userEvent.click(button('Save turn'));

      // Assert
      await expect.element(lettersField()).toHaveAccessibleDescription('Enter the word.');
    });

    it('rejects a one-letter word', async () => {
      // Arrange
      await mountForm();
      await userEvent.fill(lettersField(), 'a');

      // Act
      await userEvent.click(button('Save turn'));

      // Assert
      await expect
        .element(lettersField())
        .toHaveAccessibleDescription('A word needs at least 2 letters.');
    });

    it('moves focus to the first word with a problem', async () => {
      // Arrange
      const form = await mountForm(play([word('FAX'), word('XI')]));
      await userEvent.clear(lettersField('Cross-word 1'));

      // Act
      await userEvent.click(button('Save turn'));

      // Assert
      expect(focusedId(form)).toBe('word-1');
    });

    it('does not save an invalid play', async () => {
      // Arrange
      const form = await mountForm();
      const saved = listenForSave(form);

      // Act
      await userEvent.click(button('Save turn'));

      // Assert
      expect(saved).not.toHaveBeenCalled();
    });

    it('checks a word when its field is left after editing', async () => {
      // Arrange
      await mountForm();
      await userEvent.fill(lettersField(), 'a');

      // Act
      await userEvent.tab();

      // Assert
      await expect.element(lettersField()).toHaveAttribute('aria-invalid', 'true');
    });

    it('does not check a word that was never edited', async () => {
      // Arrange
      await mountForm();
      await userEvent.click(lettersField());

      // Act
      await userEvent.tab();

      // Assert
      await expect.element(lettersField()).toHaveAttribute('aria-invalid', 'false');
    });

    it('clears the error as soon as the player types', async () => {
      // Arrange
      await mountForm();
      await userEvent.click(button('Save turn'));

      // Act
      await userEvent.type(lettersField(), 'c');

      // Assert
      await expect.element(lettersField()).toHaveAttribute('aria-invalid', 'false');
    });

    it('shows an error from the store as an alert', async () => {
      // Arrange
      const form = await mountForm();
      const message = 'That turn broke a rule.';

      // Act
      form.error = message;
      await form.updateComplete;

      // Assert
      await expect.element(page.getByRole('alert')).toHaveTextContent(message);
    });
  });

  describe('saving', () => {
    it('saves the words with their marks and squares', async () => {
      // Arrange
      const form = await mountForm();
      const saved = listenForSave(form);
      await userEvent.fill(lettersField(), 'quiz');
      await userEvent.click(button(/^Z,/));
      await userEvent.click(squareChoice('Triple word squares', '1'));

      // Act
      await userEvent.click(button('Save turn'));

      // Assert
      expect(saved).toHaveBeenCalledWith(play([word('QUIZ2', { tw: 1 })]));
    });

    it('can be saved with Enter from a word field', async () => {
      // Arrange
      const form = await mountForm();
      const saved = listenForSave(form);
      await userEvent.fill(lettersField(), 'cat');

      // Act
      await userEvent.keyboard('{Enter}');

      // Assert
      expect(saved).toHaveBeenCalledOnce();
    });

    it('shows content passed into the actions slot', async () => {
      // Arrange
      const form = create('ss-turn-form');
      form.innerHTML = '<a slot="actions" href="#/game">Cancel</a>';

      // Act
      await mount(form);

      // Assert
      await expect.element(page.getByRole('link', { name: 'Cancel' })).toBeVisible();
    });
  });

  describe('editing a turn', () => {
    it('starts from the words of an existing play', async () => {
      // Arrange
      const words = [word('Q3UIZ', { dw: 1 }), word('XI')];

      // Act
      const form = await mountForm(play(words));

      // Assert
      expect(form.words).toEqual(words);
    });

    it("starts from an existing play's bingo", async () => {
      // Arrange
      const turn = play([word('RETAINS')], true);

      // Act
      await mountForm(turn);

      // Assert
      await expect.element(bingoBox()).toBeChecked();
    });

    it('starts from an existing pass, with an empty word ready for a play', async () => {
      // Arrange
      const turn: TurnInput = { kind: 'pass' };

      // Act
      const form = await mountForm(turn);

      // Assert
      expect(form.kind).toBe('pass');
      expect(form.words).toEqual([{ tiles: [], doubleWords: 0, tripleWords: 0 }]);
    });

    it('saves the edited turn', async () => {
      // Arrange
      const form = await mountForm(play([word('CAT')]));
      const saved = listenForSave(form);
      await userEvent.fill(lettersField(), 'cart');

      // Act
      await userEvent.click(button('Save turn'));

      // Assert
      expect(saved).toHaveBeenCalledWith(play([word('CART')]));
    });
  });
});
