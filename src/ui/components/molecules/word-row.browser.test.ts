import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { word } from '../../../domain/testing.ts';
import type { WordPlay } from '../../../domain/types.ts';
import { renderTemplate } from '../../testing.ts';
import { renderWordRow, wordLegend, type WordRowOptions } from './word-row.ts';

const renderRow = (overrides: Partial<WordRowOptions> = {}) => {
  const options: WordRowOptions = {
    word: word('CAT'),
    index: 0,
    removable: false,
    onText: vi.fn(),
    onBlur: vi.fn(),
    onTile: vi.fn(),
    onSquares: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  const container = renderTemplate(renderWordRow(options));
  return { container, options };
};

const radio = (legend: string, label: string) =>
  page.getByRole('group', { name: legend }).getByRole('radio', { name: label, exact: true });

describe('wordLegend', () => {
  it('calls the first word the main word', () => {
    // Arrange
    const index = 0;

    // Act
    const legend = wordLegend(index);

    // Assert
    expect(legend).toBe('Main word');
  });

  it('numbers the cross-words from 1', () => {
    // Arrange
    const index = 2;

    // Act
    const legend = wordLegend(index);

    // Assert
    expect(legend).toBe('Cross-word 2');
  });
});

describe('renderWordRow', () => {
  it('groups the row under its legend', async () => {
    // Arrange
    renderRow({ index: 1 });

    // Act
    const group = page.getByRole('group', { name: 'Cross-word 1' });

    // Assert
    await expect.element(group).toBeVisible();
  });

  it("shows the word's letters in the text field", async () => {
    // Arrange
    renderRow({ word: word('qUIZ') });

    // Act
    const field = page.getByRole('textbox', { name: 'Letters' });

    // Assert
    await expect.element(field).toHaveValue('QUIZ');
  });

  it('reports typed text', async () => {
    // Arrange
    const { options } = renderRow({ word: word('CA') });

    // Act
    await userEvent.type(page.getByRole('textbox', { name: 'Letters' }), 't');

    // Assert
    expect(options.onText).toHaveBeenLastCalledWith('CAt');
  });

  it('reports leaving the text field', async () => {
    // Arrange
    const { options } = renderRow();
    await userEvent.click(page.getByRole('textbox', { name: 'Letters' }));

    // Act
    await userEvent.tab();

    // Assert
    expect(options.onBlur).toHaveBeenCalledOnce();
  });

  it('shows a tile button for each letter', () => {
    // Arrange
    const { container } = renderRow({ word: word('CAT') });

    // Act
    const tiles = container.querySelectorAll('.tile');

    // Assert
    expect(tiles).toHaveLength(3);
  });

  it('explains how to mark tiles', async () => {
    // Arrange
    renderRow();

    // Act
    const tiles = page.getByRole('group', { name: 'Main word tiles' });

    // Assert
    await expect
      .element(tiles)
      .toHaveAccessibleDescription('Tap a tile to mark it DL, TL or blank.');
  });

  it('shows no tiles before any letters are typed', () => {
    // Arrange
    const empty: WordPlay = { tiles: [], doubleWords: 0, tripleWords: 0 };
    const { container } = renderRow({ word: empty });

    // Act
    const tiles = container.querySelector('.tiles');

    // Assert
    expect(tiles).toBeNull();
  });

  it('reports which tile was pressed', async () => {
    // Arrange
    const { options } = renderRow({ word: word('CAT') });

    // Act
    await userEvent.click(page.getByRole('button', { name: /^A,/ }));

    // Assert
    expect(options.onTile).toHaveBeenCalledWith(1);
  });

  it('checks the current number of double word squares', async () => {
    // Arrange
    renderRow({ word: word('CAT', { dw: 2 }) });

    // Act
    const two = radio('Double word squares', '2');

    // Assert
    await expect.element(two).toBeChecked();
  });

  it('checks "None" when the word covers no triple word squares', async () => {
    // Arrange
    renderRow();

    // Act
    const none = radio('Triple word squares', 'None');

    // Assert
    await expect.element(none).toBeChecked();
  });

  it('reports a change of word squares', async () => {
    // Arrange
    const { options } = renderRow();

    // Act
    await userEvent.click(radio('Triple word squares', '1'));

    // Assert
    expect(options.onSquares).toHaveBeenCalledWith('tripleWords', 1);
  });

  it('disables counts that would go over 3 word squares in total', async () => {
    // Arrange
    renderRow({ word: word('CAT', { tw: 2 }) });

    // Act
    const two = radio('Double word squares', '2');

    // Assert
    await expect.element(two).toBeDisabled();
  });

  it('keeps counts within the limit enabled', async () => {
    // Arrange
    renderRow({ word: word('CAT', { tw: 2 }) });

    // Act
    const one = radio('Double word squares', '1');

    // Assert
    await expect.element(one).toBeEnabled();
  });

  it("shows the word's score", () => {
    // Arrange
    const { container } = renderRow({ word: word('QUIZ', { dw: 1 }) });

    // Act
    const score = container.querySelector('output')?.textContent;

    // Assert
    expect(score).toBe('44');
  });

  it('shows an error linked to the text field', async () => {
    // Arrange
    renderRow({ error: 'Enter the word.' });

    // Act
    const field = page.getByRole('textbox', { name: 'Letters' });

    // Assert
    await expect.element(field).toHaveAccessibleDescription('Enter the word.');
    await expect.element(field).toHaveAttribute('aria-invalid', 'true');
  });

  it('is not removable unless asked', async () => {
    // Arrange
    renderRow({ index: 0, removable: false });

    // Act
    const remove = page.getByRole('button', { name: /^Remove/ });

    // Assert
    await expect.element(remove).not.toBeInTheDocument();
  });

  it('reports removal of a removable cross-word', async () => {
    // Arrange
    const { options } = renderRow({ index: 1, removable: true });

    // Act
    await userEvent.click(page.getByRole('button', { name: 'Remove cross-word 1' }));

    // Assert
    expect(options.onRemove).toHaveBeenCalledOnce();
  });
});
