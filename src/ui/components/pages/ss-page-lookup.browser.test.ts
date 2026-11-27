import { describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { create, mount, testStore, testWordList, unavailableWordList } from '../../testing.ts';
import './ss-page-lookup.ts';
import type { SsPageLookup } from './ss-page-lookup.ts';

const wordField = () => page.getByRole('textbox', { name: 'Word' });
const checkButton = () => page.getByRole('button', { name: 'Check' });
const result = (lookup: SsPageLookup) =>
  lookup.shadowRoot?.querySelector('[role="status"]')?.textContent;

const mountLookup = (wordList = testWordList(['cat', 'quiz'])) =>
  mount(create('ss-page-lookup', { store: testStore(), wordList }));

describe('ss-page-lookup', () => {
  it('has "Check a word" as its heading', async () => {
    // Arrange
    await mountLookup();

    // Act
    const heading = page.getByRole('heading', { level: 1 });

    // Assert
    await expect.element(heading).toHaveTextContent('Check a word');
  });

  it('says a word in the list is in the list', async () => {
    // Arrange
    const lookup = await mountLookup();
    await userEvent.fill(wordField(), 'quiz');

    // Act
    await userEvent.click(checkButton());

    // Assert
    await expect.poll(() => result(lookup)).toBe('QUIZ is in the word list.');
  });

  it("says a missing word isn't in the list, without calling it invalid", async () => {
    // Arrange
    const lookup = await mountLookup();
    await userEvent.fill(wordField(), 'quixe');

    // Act
    await userEvent.click(checkButton());

    // Assert
    await expect
      .poll(() => result(lookup))
      .toMatch(/^QUIXE isn't in the word list\. It may still be allowed/);
  });

  it('can check with Enter', async () => {
    // Arrange
    const lookup = await mountLookup();
    await userEvent.fill(wordField(), 'cat');

    // Act
    await userEvent.keyboard('{Enter}');

    // Assert
    await expect.poll(() => result(lookup)).toBe('CAT is in the word list.');
  });

  it('keeps only letters, in capitals', async () => {
    // Arrange
    await mountLookup();
    await userEvent.fill(wordField(), 'c-a t');

    // Act
    await userEvent.click(checkButton());

    // Assert
    await expect.element(wordField()).toHaveValue('CAT');
  });

  it('asks for at least two letters', async () => {
    // Arrange
    await mountLookup();
    await userEvent.fill(wordField(), 'a');

    // Act
    await userEvent.click(checkButton());

    // Assert
    await expect
      .element(wordField())
      .toHaveAccessibleDescription('Enter a word of 2 to 15 letters.');
  });

  it('clears that error as soon as the player types', async () => {
    // Arrange
    await mountLookup();
    await userEvent.click(checkButton());

    // Act
    await userEvent.type(wordField(), 'c');

    // Assert
    await expect.element(wordField()).toHaveAttribute('aria-invalid', 'false');
  });

  it('says when the list cannot be loaded', async () => {
    // Arrange
    const lookup = await mountLookup(unavailableWordList());
    await userEvent.fill(wordField(), 'cat');

    // Act
    await userEvent.click(checkButton());

    // Assert
    await expect.poll(() => result(lookup)).toMatch(/^The word list couldn't be loaded\./);
  });

  it('does nothing without a word list', async () => {
    // Arrange
    const lookup = await mount(create('ss-page-lookup', { store: testStore() }));
    await userEvent.fill(wordField(), 'cat');

    // Act
    await userEvent.click(checkButton());

    // Assert
    expect(result(lookup)).toBe('');
  });

  it('explains that the list is not Collins', async () => {
    // Arrange
    await mountLookup();

    // Act
    const note = page.getByText(/not the same as, the official Collins Scrabble Words/);

    // Assert
    await expect.element(note).toBeVisible();
  });
});
