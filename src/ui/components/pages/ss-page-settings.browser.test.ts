import { describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { create, mount, testStore, testWordList, unavailableWordList } from '../../testing.ts';
import './ss-page-settings.ts';

const keepScreenOn = () => page.getByRole('checkbox', { name: 'Keep the screen on during games' });

describe('ss-page-settings', () => {
  it('has "Settings" as its heading', async () => {
    // Arrange
    await mount(create('ss-page-settings', { store: testStore() }));

    // Act
    const heading = page.getByRole('heading', { level: 1 });

    // Assert
    await expect.element(heading).toHaveTextContent('Settings');
  });

  it('keeps the screen on by default', async () => {
    // Arrange
    await mount(create('ss-page-settings', { store: testStore() }));

    // Act
    const checkbox = keepScreenOn();

    // Assert
    await expect.element(checkbox).toBeChecked();
  });

  it('explains the setting', async () => {
    // Arrange
    await mount(create('ss-page-settings', { store: testStore() }));

    // Act
    const checkbox = keepScreenOn();

    // Assert
    await expect.element(checkbox).toHaveAccessibleDescription(/going to sleep between turns/);
  });

  it('turns the setting off in the store', async () => {
    // Arrange
    const store = testStore();
    await mount(create('ss-page-settings', { store }));

    // Act
    await userEvent.click(keepScreenOn());

    // Assert
    expect(store.getState().settings.keepScreenOn).toBe(false);
  });

  it('shows a setting that was already off', async () => {
    // Arrange
    const store = testStore();
    store.updateSettings({ keepScreenOn: false });
    await mount(create('ss-page-settings', { store }));

    // Act
    const checkbox = keepScreenOn();

    // Assert
    await expect.element(checkbox).not.toBeChecked();
  });

  it('shows the default without a store', async () => {
    // Arrange
    await mount(create('ss-page-settings'));

    // Act
    await userEvent.click(keepScreenOn());

    // Assert
    await expect.element(keepScreenOn()).toBeChecked();
  });

  describe('checking words', () => {
    const checkWords = () => page.getByRole('checkbox', { name: 'Check words as I type them' });

    it('is on by default', async () => {
      // Arrange
      await mount(create('ss-page-settings', { store: testStore() }));

      // Act
      const checkbox = checkWords();

      // Assert
      await expect.element(checkbox).toBeChecked();
    });

    it('can be turned off', async () => {
      // Arrange
      const store = testStore();
      await mount(create('ss-page-settings', { store }));

      // Act
      await userEvent.click(checkWords());

      // Assert
      expect(store.getState().settings.checkWords).toBe(false);
    });

    it('leaves the other setting alone', async () => {
      // Arrange
      const store = testStore();
      await mount(create('ss-page-settings', { store }));

      // Act
      await userEvent.click(checkWords());

      // Assert
      expect(store.getState().settings.keepScreenOn).toBe(true);
    });
  });

  describe('downloading the word list', () => {
    const downloadButton = () =>
      page.getByRole('button', { name: 'Download the word list for offline use' });
    const status = (settings: HTMLElement) =>
      settings.shadowRoot?.querySelector('.word-list [role="status"]')?.textContent;

    it('downloads the list', async () => {
      // Arrange
      const wordList = testWordList();
      await mount(create('ss-page-settings', { store: testStore(), wordList }));

      // Act
      await userEvent.click(downloadButton());

      // Assert
      await expect.poll(() => wordList.status).toBe('ready');
    });

    it('says the list is ready for offline use', async () => {
      // Arrange
      const settings = await mount(
        create('ss-page-settings', { store: testStore(), wordList: testWordList() }),
      );

      // Act
      await userEvent.click(downloadButton());

      // Assert
      await expect
        .poll(() => status(settings))
        .toBe('The word list is downloaded, so word checks work offline.');
    });

    it('disables the button once downloaded', async () => {
      // Arrange
      const wordList = testWordList();
      await wordList.load();

      // Act
      await mount(create('ss-page-settings', { store: testStore(), wordList }));

      // Assert
      await expect.element(downloadButton()).toBeDisabled();
    });

    it('says when the download fails', async () => {
      // Arrange
      const settings = await mount(
        create('ss-page-settings', { store: testStore(), wordList: unavailableWordList() }),
      );

      // Act
      await userEvent.click(downloadButton());

      // Assert
      await expect.poll(() => status(settings)).toMatch(/^The word list couldn't be downloaded\./);
    });

    it('does nothing without a word list', async () => {
      // Arrange
      const settings = await mount(create('ss-page-settings', { store: testStore() }));

      // Act
      await userEvent.click(downloadButton());

      // Assert
      expect(status(settings)).toBe('');
    });
  });
});
