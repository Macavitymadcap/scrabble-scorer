import { describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { GAME, NEW_GAME, SETTINGS } from '../../router.ts';
import { create, mount, testStore } from '../../testing.ts';
import './ss-page-help.ts';
import { HELP_TOPICS } from './ss-page-help.ts';

const topic = (summary: string) => page.getByText(summary, { exact: true });

describe('ss-page-help', () => {
  it('has "Help" as its heading', async () => {
    // Arrange
    await mount(create('ss-page-help', { store: testStore() }));

    // Act
    const heading = page.getByRole('heading', { level: 1 });

    // Assert
    await expect.element(heading).toHaveTextContent('Help');
  });

  it('groups the topics under one accessible name', async () => {
    // Arrange
    await mount(create('ss-page-help', { store: testStore() }));

    // Act
    const group = page.getByRole('region', { name: 'Help topics' });

    // Assert
    await expect.element(group).toBeVisible();
  });

  it('shows every topic as a collapsed disclosure', async () => {
    // Arrange
    const help = await mount(create('ss-page-help', { store: testStore() }));

    // Act
    const details = [...(help.shadowRoot?.querySelectorAll('details') ?? [])];

    // Assert
    expect(details).toHaveLength(HELP_TOPICS.length);
    expect(details.every((item) => !item.open)).toBe(true);
  });

  it('opens a topic when its summary is pressed', async () => {
    // Arrange
    const help = await mount(create('ss-page-help', { store: testStore() }));

    // Act
    await userEvent.click(topic('Marking premium squares and blanks'));

    // Assert
    const opened = [...(help.shadowRoot?.querySelectorAll('details[open] summary') ?? [])];
    expect(opened.map((summary) => summary.textContent)).toEqual([
      'Marking premium squares and blanks',
    ]);
  });

  it('lets several topics be open at once', async () => {
    // Arrange
    const help = await mount(create('ss-page-help', { store: testStore() }));
    await userEvent.click(topic('Starting a game'));

    // Act
    await userEvent.click(topic('Ending the game'));

    // Assert
    expect(help.shadowRoot?.querySelectorAll('details[open]')).toHaveLength(2);
  });

  it('explains the tap cycle for tiles', async () => {
    // Arrange
    await mount(create('ss-page-help', { store: testStore() }));

    // Act
    await userEvent.click(topic('Marking premium squares and blanks'));

    // Assert
    await expect.element(page.getByText(/three times for a blank/)).toBeVisible();
  });

  it('links to the pages it mentions', async () => {
    // Arrange
    const help = await mount(create('ss-page-help', { store: testStore() }));

    // Act
    const hrefs = [...(help.shadowRoot?.querySelectorAll('a') ?? [])].map((a) =>
      a.getAttribute('href'),
    );

    // Assert
    expect(hrefs).toEqual(expect.arrayContaining([NEW_GAME, GAME, SETTINGS]));
  });

  it('has no headings inside the summaries, which some screen readers drop', async () => {
    // Arrange
    const help = await mount(create('ss-page-help', { store: testStore() }));

    // Act
    const headingsInSummaries = help.shadowRoot?.querySelectorAll('summary :is(h1, h2, h3, h4)');

    // Assert
    expect(headingsInSummaries).toHaveLength(0);
  });
});
