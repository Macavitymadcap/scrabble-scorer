import { describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { create, mount } from '../../testing.ts';
import './ss-confirm-dialog.ts';
import type { ConfirmOptions } from './ss-confirm-dialog.ts';

const OPTIONS: ConfirmOptions = {
  heading: 'Undo turn?',
  message: "This removes Bob's turn.",
  confirmLabel: 'Undo turn',
  tone: 'danger',
};

const openDialog = async (options: ConfirmOptions = OPTIONS) => {
  const element = await mount(create('ss-confirm-dialog'));
  const answer = element.ask(options);
  await element.updateComplete;
  return { element, answer };
};

describe('ss-confirm-dialog', () => {
  it('is closed until asked', async () => {
    // Arrange
    const element = await mount(create('ss-confirm-dialog'));

    // Act
    const { open } = element.dialog;

    // Assert
    expect(open).toBe(false);
  });

  it('opens as a modal named by its heading', async () => {
    // Arrange
    await openDialog();

    // Act
    const dialog = page.getByRole('dialog', { name: 'Undo turn?' });

    // Assert
    await expect.element(dialog).toBeVisible();
  });

  it('shows the message as its description', async () => {
    // Arrange
    await openDialog();

    // Act
    const dialog = page.getByRole('dialog');

    // Assert
    await expect.element(dialog).toHaveAccessibleDescription("This removes Bob's turn.");
  });

  it('focuses Cancel, the safe choice, when it opens', async () => {
    // Arrange
    const { element } = await openDialog();

    // Act
    // Focus inside a shadow root shows on the shadow root, not the document.
    const focused = element.shadowRoot?.activeElement;

    // Assert
    expect(focused?.textContent).toBe('Cancel');
  });

  it('resolves true when the confirm button is pressed', async () => {
    // Arrange
    const { answer } = await openDialog();

    // Act
    await userEvent.click(page.getByRole('button', { name: 'Undo turn' }));

    // Assert
    await expect(answer).resolves.toBe(true);
  });

  it('resolves false when Cancel is pressed', async () => {
    // Arrange
    const { answer } = await openDialog();

    // Act
    await userEvent.click(page.getByRole('button', { name: 'Cancel' }));

    // Assert
    await expect(answer).resolves.toBe(false);
  });

  it('resolves false when closed with Escape', async () => {
    // Arrange
    const { answer } = await openDialog();

    // Act
    await userEvent.keyboard('{Escape}');

    // Assert
    await expect(answer).resolves.toBe(false);
  });

  it('closes after an answer', async () => {
    // Arrange
    const { element, answer } = await openDialog();
    await userEvent.click(page.getByRole('button', { name: 'Cancel' }));
    await answer;

    // Act
    const { open } = element.dialog;

    // Assert
    expect(open).toBe(false);
  });

  it('does not carry a confirmation over to the next question', async () => {
    // Arrange
    const { element, answer } = await openDialog();
    await userEvent.click(page.getByRole('button', { name: 'Undo turn' }));
    await answer;
    const second = element.ask(OPTIONS);
    await element.updateComplete;

    // Act
    await userEvent.keyboard('{Escape}');

    // Assert
    await expect(second).resolves.toBe(false);
  });

  it('answers an unanswered question with false when asked again', async () => {
    // Arrange
    const { element, answer } = await openDialog();
    element.dialog.close();

    // Act
    void element.ask({ ...OPTIONS, heading: 'Again?' });

    // Assert
    await expect(answer).resolves.toBe(false);
  });

  it('uses the primary style when no tone is given', async () => {
    // Arrange
    const { tone: _tone, ...withoutTone } = OPTIONS;
    await openDialog(withoutTone);

    // Act
    const confirm = page.getByRole('button', { name: 'Undo turn' });

    // Assert
    await expect.element(confirm).toHaveClass('primary');
  });
});
