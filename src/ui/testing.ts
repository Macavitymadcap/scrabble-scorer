import { render, type LitElement, type TemplateResult } from 'lit';
import { GameStore } from '../state/store.ts';
import { createMemoryStorage } from '../state/storage.ts';
import { sequentialIds } from '../state/testing.ts';

/** Creates an element with the given properties set, without mounting it. */
export const create = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  properties: Partial<HTMLElementTagNameMap[K]> = {},
): HTMLElementTagNameMap[K] => Object.assign(document.createElement(tag), properties);

/** Adds an element to the page and waits for it to render. */
export const mount = async <T extends LitElement>(element: T): Promise<T> => {
  document.body.append(element);
  await element.updateComplete;
  return element;
};

/** A clock returning real ISO times a minute apart, from 27 Nov 2026 19:00 UTC. */
export const isoClock = (start = Date.UTC(2026, 10, 27, 19, 0)): (() => string) => {
  let minutes = 0;
  return () => {
    const time = new Date(start + minutes * 60_000).toISOString();
    minutes += 1;
    return time;
  };
};

/** A store backed by memory, with predictable times and ids. */
export const testStore = (): GameStore =>
  new GameStore({ storage: createMemoryStorage(), now: isoClock(), newId: sequentialIds() });

/** A store with a game started for the given players. */
export const storeWithGame = (names: readonly string[] = ['Ann', 'Bob']): GameStore => {
  const store = testStore();
  store.startGame(names);
  return store;
};

/** Renders a template (e.g. an atom or molecule) into a new container on the page. */
export const renderTemplate = (template: TemplateResult): HTMLElement => {
  const container = document.createElement('div');
  document.body.append(container);
  render(template, container);
  return container;
};
