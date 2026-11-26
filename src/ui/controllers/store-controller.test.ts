import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { describe, expect, it, vi } from 'vite-plus/test';
import { GameStore } from '../../state/store.ts';
import { createMemoryStorage } from '../../state/storage.ts';
import { StoreController } from './store-controller.ts';

/** A minimal stand-in for a Lit element, with its requestUpdate spy. */
const fakeHost = () => {
  const controllers: ReactiveController[] = [];
  const requestUpdate = vi.fn();
  const host: ReactiveControllerHost = {
    addController: (controller) => {
      controllers.push(controller);
    },
    removeController: () => undefined,
    requestUpdate: () => requestUpdate(),
    updateComplete: Promise.resolve(true),
  };
  return { host, controllers, requestUpdate };
};

const newStore = () => new GameStore({ storage: createMemoryStorage() });

describe('StoreController', () => {
  it('registers itself with the host', () => {
    // Arrange
    const { host, controllers } = fakeHost();

    // Act
    const controller = new StoreController(host, newStore);

    // Assert
    expect(controllers).toEqual([controller]);
  });

  it("exposes the store's state", () => {
    // Arrange
    const store = newStore();
    const controller = new StoreController(fakeHost().host, () => store);

    // Act
    const state = controller.state;

    // Assert
    expect(state).toBe(store.getState());
  });

  it('has no state when there is no store yet', () => {
    // Arrange
    const controller = new StoreController(fakeHost().host, () => undefined);

    // Act
    const state = controller.state;

    // Assert
    expect(state).toBeUndefined();
  });

  it('asks the host to re-render when the store changes while connected', () => {
    // Arrange
    const { host, requestUpdate } = fakeHost();
    const store = newStore();
    const controller = new StoreController(host, () => store);
    controller.hostConnected();

    // Act
    store.startGame(['Ann', 'Bob']);

    // Assert
    expect(requestUpdate).toHaveBeenCalledOnce();
  });

  it('stops re-rendering the host once disconnected', () => {
    // Arrange
    const { host, requestUpdate } = fakeHost();
    const store = newStore();
    const controller = new StoreController(host, () => store);
    controller.hostConnected();
    controller.hostDisconnected();

    // Act
    store.startGame(['Ann', 'Bob']);

    // Assert
    expect(requestUpdate).not.toHaveBeenCalled();
  });

  it('connects and disconnects safely without a store', () => {
    // Arrange
    const controller = new StoreController(fakeHost().host, () => undefined);

    // Act
    const act = () => {
      controller.hostConnected();
      controller.hostDisconnected();
    };

    // Assert
    expect(act).not.toThrow();
  });
});
