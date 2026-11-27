import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { create, mount } from '../../testing.ts';
import './ss-new-game-form.ts';
import type { SsNewGameForm, StartGameEvent } from './ss-new-game-form.ts';

const nameField = (position: number) => page.getByRole('textbox', { name: `Player ${position}` });
const button = (name: string) => page.getByRole('button', { name, exact: true });

/** The element focused inside the form's shadow root. */
const focusedIn = (form: SsNewGameForm) => form.shadowRoot?.activeElement;

const mountForm = (initialNames: string[] = []) =>
  mount(create('ss-new-game-form', { initialNames }));

/** Listens for start-game and returns the names from each event. */
const listenForStart = (form: SsNewGameForm) => {
  const started = vi.fn<(names: string[]) => void>();
  form.addEventListener('start-game', (event: StartGameEvent) => started(event.names));
  return started;
};

describe('ss-new-game-form', () => {
  describe('starting rows', () => {
    it('has two empty name fields', async () => {
      // Arrange
      const form = await mountForm();

      // Act
      const names = form.rows.map((row) => row.name);

      // Assert
      expect(names).toEqual(['', '']);
    });

    it('fills in the initial names', async () => {
      // Arrange
      await mountForm(['Ann', 'Bob', 'Cat']);

      // Act
      const third = nameField(3);

      // Assert
      await expect.element(third).toHaveValue('Cat');
    });

    it('adds an empty row when only one initial name is given', async () => {
      // Arrange
      const form = await mountForm(['Ann']);

      // Act
      const names = form.rows.map((row) => row.name);

      // Assert
      expect(names).toEqual(['Ann', '']);
    });

    it('uses at most four initial names', async () => {
      // Arrange
      const form = await mountForm(['A', 'B', 'C', 'D', 'E']);

      // Act
      const count = form.rows.length;

      // Assert
      expect(count).toBe(4);
    });

    it('labels the list as the players in turn order', async () => {
      // Arrange
      await mountForm();

      // Act
      const group = page.getByRole('group', { name: 'Players, in turn order' });

      // Assert
      await expect.element(group).toBeVisible();
    });
  });

  describe('adding players', () => {
    it('adds an empty row', async () => {
      // Arrange
      const form = await mountForm();

      // Act
      await userEvent.click(button('Add player'));

      // Assert
      expect(form.rows).toHaveLength(3);
    });

    it("focuses the new row's name field", async () => {
      // Arrange
      const form = await mountForm();

      // Act
      await userEvent.click(button('Add player'));

      // Assert
      expect(focusedIn(form)?.id).toBe(`player-${form.rows[2]?.key}`);
    });

    it('stops offering to add players at four', async () => {
      // Arrange
      await mountForm(['A', 'B', 'C', 'D']);

      // Act
      const add = button('Add player');

      // Assert
      await expect.element(add).not.toBeInTheDocument();
    });
  });

  describe('removing players', () => {
    it('is not offered with only two players', async () => {
      // Arrange
      await mountForm(['Ann', 'Bob']);

      // Act
      const remove = button('Remove Ann');

      // Assert
      await expect.element(remove).not.toBeInTheDocument();
    });

    it('removes the row', async () => {
      // Arrange
      const form = await mountForm(['Ann', 'Bob', 'Cat']);

      // Act
      await userEvent.click(button('Remove Bob'));

      // Assert
      expect(form.rows.map((row) => row.name)).toEqual(['Ann', 'Cat']);
    });

    it("moves focus to the next row's name field", async () => {
      // Arrange
      const form = await mountForm(['Ann', 'Bob', 'Cat']);

      // Act
      await userEvent.click(button('Remove Bob'));

      // Assert
      expect((focusedIn(form) as HTMLInputElement | null)?.value).toBe('Cat');
    });

    it('moves focus to the previous row when removing the last', async () => {
      // Arrange
      const form = await mountForm(['Ann', 'Bob', 'Cat']);

      // Act
      await userEvent.click(button('Remove Cat'));

      // Assert
      expect((focusedIn(form) as HTMLInputElement | null)?.value).toBe('Bob');
    });

    it('announces the removal', async () => {
      // Arrange
      const form = await mountForm(['Ann', 'Bob', 'Cat']);

      // Act
      await userEvent.click(button('Remove Bob'));

      // Assert
      expect(form.status).toBe('Bob removed.');
    });

    it('names an unnamed player by position', async () => {
      // Arrange
      const form = await mountForm(['Ann', 'Bob', '']);

      // Act
      await userEvent.click(button('Remove player 3'));

      // Assert
      expect(form.status).toBe('Player 3 removed.');
    });
  });

  describe('reordering players', () => {
    it('moves a player down', async () => {
      // Arrange
      const form = await mountForm(['Ann', 'Bob', 'Cat']);

      // Act
      await userEvent.click(button('Move Ann down'));

      // Assert
      expect(form.rows.map((row) => row.name)).toEqual(['Bob', 'Ann', 'Cat']);
    });

    it('moves a player up', async () => {
      // Arrange
      const form = await mountForm(['Ann', 'Bob', 'Cat']);

      // Act
      await userEvent.click(button('Move Cat up'));

      // Assert
      expect(form.rows.map((row) => row.name)).toEqual(['Ann', 'Cat', 'Bob']);
    });

    it('keeps focus on the pressed button after the row moves', async () => {
      // Arrange
      const form = await mountForm(['Ann', 'Bob', 'Cat']);

      // Act
      await userEvent.click(button('Move Ann down'));

      // Assert
      expect(focusedIn(form)?.getAttribute('aria-label')).toBe('Move Ann down');
    });

    it('moves focus to the other button when the row reaches the end', async () => {
      // Arrange
      const form = await mountForm(['Ann', 'Bob', 'Cat']);

      // Act
      await userEvent.click(button('Move Bob up'));

      // Assert
      expect(focusedIn(form)?.getAttribute('aria-label')).toBe('Move Bob down');
    });

    it('announces the new position', async () => {
      // Arrange
      const form = await mountForm(['Ann', 'Bob']);

      // Act
      await userEvent.click(button('Move Bob up'));

      // Assert
      expect(form.status).toBe('Bob moved to position 1.');
    });

    it('disables moving the first player up', async () => {
      // Arrange
      await mountForm(['Ann', 'Bob']);

      // Act
      const up = button('Move Ann up');

      // Assert
      await expect.element(up).toBeDisabled();
    });

    it('disables moving the last player down', async () => {
      // Arrange
      await mountForm(['Ann', 'Bob']);

      // Act
      const down = button('Move Bob down');

      // Assert
      await expect.element(down).toBeDisabled();
    });

    it('keeps typed names with their rows', async () => {
      // Arrange
      await mountForm();
      await userEvent.fill(nameField(1), 'Ann');
      await userEvent.fill(nameField(2), 'Bob');

      // Act
      await userEvent.click(button('Move Bob up'));

      // Assert
      await expect.element(nameField(1)).toHaveValue('Bob');
    });
  });

  describe('validation', () => {
    it('does not show an error before a field is edited', async () => {
      // Arrange
      await mountForm();
      await userEvent.click(nameField(1));

      // Act
      await userEvent.tab();

      // Assert
      await expect.element(nameField(1)).toHaveAttribute('aria-invalid', 'false');
    });

    it('shows an error when an edited field is left empty', async () => {
      // Arrange
      await mountForm(['Ann', 'Bob']);
      await userEvent.clear(nameField(1));

      // Act
      await userEvent.tab();

      // Assert
      await expect.element(nameField(1)).toHaveAccessibleDescription('Enter a name for player 1.');
    });

    it('marks the invalid field', async () => {
      // Arrange
      await mountForm(['Ann', 'Bob']);
      await userEvent.clear(nameField(1));

      // Act
      await userEvent.tab();

      // Assert
      await expect.element(nameField(1)).toHaveAttribute('aria-invalid', 'true');
    });

    it('clears the error as soon as the player types', async () => {
      // Arrange
      await mountForm(['Ann', 'Bob']);
      await userEvent.clear(nameField(1));
      await userEvent.tab();

      // Act
      await userEvent.type(nameField(1), 'A');

      // Assert
      await expect.element(nameField(1)).toHaveAttribute('aria-invalid', 'false');
    });

    it('rejects a name already used, ignoring case and spaces', async () => {
      // Arrange
      await mountForm(['Ann', 'Bob']);
      await userEvent.fill(nameField(2), ' ann ');

      // Act
      await userEvent.tab();

      // Assert
      await expect.element(nameField(2)).toHaveAccessibleDescription('ann is already playing.');
    });

    it('does not start the game when a name is missing', async () => {
      // Arrange
      const form = await mountForm(['Ann', '']);
      const started = listenForStart(form);

      // Act
      await userEvent.click(button('Start game'));

      // Assert
      expect(started).not.toHaveBeenCalled();
    });

    it('shows every error on submit', async () => {
      // Arrange
      const form = await mountForm(['', '']);

      // Act
      await userEvent.click(button('Start game'));

      // Assert
      expect(Object.values(form.errors)).toEqual([
        'Enter a name for player 1.',
        'Enter a name for player 2.',
      ]);
    });

    it('moves focus to the first invalid field on submit', async () => {
      // Arrange
      const form = await mountForm(['Ann', '']);

      // Act
      await userEvent.click(button('Start game'));

      // Assert
      expect(focusedIn(form)?.id).toBe(`player-${form.rows[1]?.key}`);
    });
  });

  describe('starting the game', () => {
    it('fires start-game with the trimmed names in turn order', async () => {
      // Arrange
      const form = await mountForm(['  Ann ', 'Bob']);
      const started = listenForStart(form);

      // Act
      await userEvent.click(button('Start game'));

      // Assert
      expect(started).toHaveBeenCalledWith(['Ann', 'Bob']);
    });

    it('can be submitted with Enter from a name field', async () => {
      // Arrange
      const form = await mountForm(['Ann', 'Bob']);
      const started = listenForStart(form);
      await userEvent.click(nameField(2));

      // Act
      await userEvent.keyboard('{Enter}');

      // Assert
      expect(started).toHaveBeenCalledOnce();
    });

    it('shows an error from the store as an alert', async () => {
      // Arrange
      const form = await mountForm();
      const message = 'A game needs 2-4 players.';

      // Act
      form.error = message;
      await form.updateComplete;

      // Assert
      await expect.element(page.getByRole('alert')).toHaveTextContent(message);
    });
  });
});
