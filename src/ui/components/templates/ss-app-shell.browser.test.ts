import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { create, mount } from '../../testing.ts';
import { NOT_PERSISTENT_WARNING } from './ss-app-shell.ts';
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

  it('warns when games cannot be saved', async () => {
    // Arrange
    await mount(create('ss-app-shell', { persistent: false }));

    // Act
    const status = page.getByRole('status');

    // Assert
    await expect.element(status).toHaveTextContent(NOT_PERSISTENT_WARNING);
  });
});
