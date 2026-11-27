import { describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { create, mount, testStore } from '../../testing.ts';
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
    store.setKeepScreenOn(false);
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
});
