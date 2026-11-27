import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { create, mount } from '../../testing.ts';
import { NOT_PERSISTENT_WARNING, UPDATE_MESSAGE } from './ss-app-shell.ts';
import './ss-app-shell.ts';

describe('ss-app-shell', () => {
  it('links the app name to the home page', async () => {
    // Arrange
    await mount(create('ss-app-shell'));

    // Act
    const link = page.getByRole('link', { name: 'Scrabble Scorer' });

    // Assert
    await expect.element(link).toHaveAttribute('href', '#/');
  });

  it('links to help and settings from the main navigation', async () => {
    // Arrange
    await mount(create('ss-app-shell'));

    // Act
    const nav = page.getByRole('navigation', { name: 'Main' });

    // Assert
    await expect.element(nav.getByRole('link', { name: 'Help' })).toHaveAttribute('href', '#/help');
    await expect
      .element(nav.getByRole('link', { name: 'Settings' }))
      .toHaveAttribute('href', '#/settings');
  });

  it('marks the link for the current page', async () => {
    // Arrange
    await mount(create('ss-app-shell', { page: 'ss-page-help' }));

    // Act
    const help = page.getByRole('link', { name: 'Help' });

    // Assert
    await expect.element(help).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark links for other pages', async () => {
    // Arrange
    await mount(create('ss-app-shell', { page: 'ss-page-help' }));

    // Act
    const settings = page.getByRole('link', { name: 'Settings' });

    // Assert
    await expect.element(settings).not.toHaveAttribute('aria-current');
  });

  it('shows its content in the main landmark', async () => {
    // Arrange
    const shell = create('ss-app-shell');
    shell.innerHTML = '<p>Page content</p>';
    await mount(shell);

    // Act
    const slot = shell.shadowRoot?.querySelector('main slot') as HTMLSlotElement | null;

    // Assert
    expect(slot?.assignedElements().map((el) => el.textContent)).toEqual(['Page content']);
  });

  it('shows no notice by default', async () => {
    // Arrange
    await mount(create('ss-app-shell'));

    // Act
    const dismiss = page.getByRole('button', { name: 'Dismiss' });

    // Assert
    await expect.element(dismiss).not.toBeInTheDocument();
  });

  it('shows a notice in a status region', async () => {
    // Arrange
    await mount(create('ss-app-shell', { notice: 'Your game could not be read.' }));

    // Act
    const status = page.getByRole('status').element();

    // Assert
    expect(status.textContent).toContain('Your game could not be read.');
  });

  it('fires dismiss-notice when Dismiss is pressed', async () => {
    // Arrange
    const shell = await mount(create('ss-app-shell', { notice: 'Saved games were skipped.' }));
    const listener = vi.fn();
    shell.addEventListener('dismiss-notice', listener);

    // Act
    await userEvent.click(page.getByRole('button', { name: 'Dismiss' }));

    // Assert
    expect(listener).toHaveBeenCalledOnce();
  });

  describe('new version', () => {
    it('is not mentioned by default', async () => {
      // Arrange
      await mount(create('ss-app-shell'));

      // Act
      const reload = page.getByRole('button', { name: 'Reload' });

      // Assert
      await expect.element(reload).not.toBeInTheDocument();
    });

    it('is announced when one is waiting', async () => {
      // Arrange
      await mount(create('ss-app-shell', { updateAvailable: true }));

      // Act
      const status = page.getByRole('status').element();

      // Assert
      expect(status.textContent).toContain(UPDATE_MESSAGE);
    });

    it('fires reload-app when Reload is pressed', async () => {
      // Arrange
      const shell = await mount(create('ss-app-shell', { updateAvailable: true }));
      const listener = vi.fn();
      shell.addEventListener('reload-app', listener);

      // Act
      await userEvent.click(page.getByRole('button', { name: 'Reload' }));

      // Assert
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  it('warns when games cannot be saved', async () => {
    // Arrange
    await mount(create('ss-app-shell', { persistent: false }));

    // Act
    const status = page.getByRole('status');

    // Assert
    await expect.element(status).toHaveTextContent(NOT_PERSISTENT_WARNING);
  });
});
