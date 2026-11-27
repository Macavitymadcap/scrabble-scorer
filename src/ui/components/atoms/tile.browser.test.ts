import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import type { TilePlay } from '../../../domain/types.ts';
import { renderTemplate } from '../../testing.ts';
import { MARK_LABELS, renderTile } from './tile.ts';

const plainQ: TilePlay = { letter: 'Q', blank: false, premium: 'none' };

const tileButton = (container: HTMLElement) => container.querySelector('button');

describe('renderTile', () => {
  it('names a plain tile by letter, points and no premium', async () => {
    // Arrange
    renderTemplate(renderTile({ tile: plainQ, onActivate: () => undefined }));

    // Act
    const button = page.getByRole('button', { name: 'Q, 10 points, no premium', exact: true });

    // Assert
    await expect.element(button).toBeVisible();
  });

  it('names a tile on a triple letter square', async () => {
    // Arrange
    const tile: TilePlay = { ...plainQ, premium: 'TL' };
    renderTemplate(renderTile({ tile, onActivate: () => undefined }));

    // Act
    const button = page.getByRole('button', { name: 'Q, 10 points, triple letter' });

    // Assert
    await expect.element(button).toBeVisible();
  });

  it('shows the premium as text, not just colour', () => {
    // Arrange
    const tile: TilePlay = { ...plainQ, premium: 'DL' };
    const container = renderTemplate(renderTile({ tile, onActivate: () => undefined }));

    // Act
    const badge = tileButton(container)?.querySelector('.badge')?.textContent;

    // Assert
    expect(badge).toBe('DL');
  });

  it('shows no badge on a plain tile', () => {
    // Arrange
    const container = renderTemplate(renderTile({ tile: plainQ, onActivate: () => undefined }));

    // Act
    const badge = tileButton(container)?.querySelector('.badge');

    // Assert
    expect(badge).toBeNull();
  });

  it('shows 0 points on a blank', () => {
    // Arrange
    const tile: TilePlay = { ...plainQ, blank: true };
    const container = renderTemplate(renderTile({ tile, onActivate: () => undefined }));

    // Act
    const points = tileButton(container)?.querySelector('.points')?.textContent;

    // Assert
    expect(points).toBe('0');
  });

  it('names a blank as a blank', async () => {
    // Arrange
    const tile: TilePlay = { ...plainQ, blank: true };
    renderTemplate(renderTile({ tile, onActivate: () => undefined }));

    // Act
    const button = page.getByRole('button', { name: 'Q, 0 points, blank' });

    // Assert
    await expect.element(button).toBeVisible();
  });

  it('adds the mark as a class for styling', () => {
    // Arrange
    const tile: TilePlay = { ...plainQ, premium: 'TL' };
    const container = renderTemplate(renderTile({ tile, onActivate: () => undefined }));

    // Act
    const button = tileButton(container);

    // Assert
    expect(button?.classList.contains('TL')).toBe(true);
  });

  it('calls onActivate when pressed', async () => {
    // Arrange
    const onActivate = vi.fn();
    renderTemplate(renderTile({ tile: plainQ, onActivate }));

    // Act
    await userEvent.click(page.getByRole('button'));

    // Assert
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it('is a plain button, so it never submits a form', () => {
    // Arrange
    const container = renderTemplate(renderTile({ tile: plainQ, onActivate: () => undefined }));

    // Act
    const type = tileButton(container)?.type;

    // Assert
    expect(type).toBe('button');
  });
});

describe('MARK_LABELS', () => {
  it('has a spoken label for every mark', () => {
    // Arrange
    const labels = Object.values(MARK_LABELS);

    // Act
    const spoken = labels.map((label) => label.spoken);

    // Assert
    expect(spoken.every((text) => text.length > 0)).toBe(true);
  });
});
