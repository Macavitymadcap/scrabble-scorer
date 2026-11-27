import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { InstallPrompt, type BeforeInstallPromptEvent } from './install-prompt.ts';

// Some tests replace navigator, window or document; put them back after each.
afterEach(() => {
  vi.unstubAllGlobals();
});

/** A fake `beforeinstallprompt` event with the given outcome. */
const promptEvent = (outcome: 'accepted' | 'dismissed' = 'accepted') => {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent;
  const prompt = vi.fn(async () => undefined);
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
  return { event, prompt };
};

/** An install prompt without the Web Install API, listening on its own target. */
const withEvents = () => {
  const events = new EventTarget();
  const installer = new InstallPrompt({ events, nativeInstall: undefined });
  return { events, installer };
};

describe('InstallPrompt', () => {
  describe('without the Web Install API', () => {
    it('offers nothing until the browser says installing is possible', () => {
      // Arrange
      const { installer } = withEvents();

      // Act
      const { available } = installer;

      // Assert
      expect(available).toBe(false);
    });

    it('becomes available when beforeinstallprompt fires', () => {
      // Arrange
      const { events, installer } = withEvents();

      // Act
      events.dispatchEvent(promptEvent().event);

      // Assert
      expect(installer.available).toBe(true);
    });

    it("stops the browser's own install banner", () => {
      // Arrange
      const { events } = withEvents();
      const { event } = promptEvent();

      // Act
      events.dispatchEvent(event);

      // Assert
      expect(event.defaultPrevented).toBe(true);
    });

    it('tells subscribers when it becomes available', () => {
      // Arrange
      const { events, installer } = withEvents();
      const listener = vi.fn();
      installer.subscribe(listener);

      // Act
      events.dispatchEvent(promptEvent().event);

      // Assert
      expect(listener).toHaveBeenCalledOnce();
    });

    it("shows the browser's install prompt when installing", async () => {
      // Arrange
      const { events, installer } = withEvents();
      const { event, prompt } = promptEvent();
      events.dispatchEvent(event);

      // Act
      await installer.install();

      // Assert
      expect(prompt).toHaveBeenCalledOnce();
    });

    it('reports an accepted install', async () => {
      // Arrange
      const { events, installer } = withEvents();
      events.dispatchEvent(promptEvent('accepted').event);

      // Act
      const outcome = await installer.install();

      // Assert
      expect(outcome).toBe('installed');
    });

    it('reports a dismissed install', async () => {
      // Arrange
      const { events, installer } = withEvents();
      events.dispatchEvent(promptEvent('dismissed').event);

      // Act
      const outcome = await installer.install();

      // Assert
      expect(outcome).toBe('dismissed');
    });

    it('uses the prompt only once', async () => {
      // Arrange
      const { events, installer } = withEvents();
      events.dispatchEvent(promptEvent().event);
      await installer.install();

      // Act
      const { available } = installer;

      // Assert
      expect(available).toBe(false);
    });

    it('fails when there is nothing to install with', async () => {
      // Arrange
      const { installer } = withEvents();

      // Act
      const outcome = await installer.install();

      // Assert
      expect(outcome).toBe('failed');
    });

    it('fails when the prompt throws', async () => {
      // Arrange
      const { events, installer } = withEvents();
      const { event } = promptEvent();
      Object.assign(event, { prompt: () => Promise.reject(new Error('already shown')) });
      events.dispatchEvent(event);

      // Act
      const outcome = await installer.install();

      // Assert
      expect(outcome).toBe('failed');
    });

    it('stops offering once the app is installed', () => {
      // Arrange
      const { events, installer } = withEvents();
      events.dispatchEvent(promptEvent().event);

      // Act
      events.dispatchEvent(new Event('appinstalled'));

      // Assert
      expect(installer.available).toBe(false);
    });

    it('stops telling a subscriber after it unsubscribes', () => {
      // Arrange
      const { events, installer } = withEvents();
      const listener = vi.fn();
      const unsubscribe = installer.subscribe(listener);
      unsubscribe();

      // Act
      events.dispatchEvent(promptEvent().event);

      // Assert
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('with the Web Install API', () => {
    const withNative = (nativeInstall: () => Promise<void>) =>
      new InstallPrompt({ events: new EventTarget(), nativeInstall });

    it('is always available', () => {
      // Arrange
      const installer = withNative(async () => undefined);

      // Act
      const { available } = installer;

      // Assert
      expect(available).toBe(true);
    });

    it('installs through navigator.install', async () => {
      // Arrange
      const nativeInstall = vi.fn(async () => undefined);
      const installer = withNative(nativeInstall);

      // Act
      const outcome = await installer.install();

      // Assert
      expect(nativeInstall).toHaveBeenCalledOnce();
      expect(outcome).toBe('installed');
    });

    it('reports a cancelled install as dismissed', async () => {
      // Arrange
      const installer = withNative(() => Promise.reject(new DOMException('No', 'AbortError')));

      // Act
      const outcome = await installer.install();

      // Assert
      expect(outcome).toBe('dismissed');
    });

    it('reports other errors as failed', async () => {
      // Arrange
      const installer = withNative(() => Promise.reject(new DOMException('Bad', 'DataError')));

      // Act
      const outcome = await installer.install();

      // Assert
      expect(outcome).toBe('failed');
    });
  });

  describe('defaults', () => {
    it("uses the browser's navigator.install when not given one", () => {
      // Arrange
      vi.stubGlobal('navigator', { install: vi.fn(async () => undefined) });

      // Act
      const installer = new InstallPrompt({ events: new EventTarget() });

      // Assert
      expect(installer.available).toBe(true);
    });

    it('treats an explicit undefined as no native install', () => {
      // Arrange
      vi.stubGlobal('navigator', { install: async () => undefined });

      // Act
      const installer = new InstallPrompt({ events: new EventTarget(), nativeInstall: undefined });

      // Assert
      expect(installer.available).toBe(false);
    });

    it("calls the browser's navigator.install when installing", async () => {
      // Arrange
      const install = vi.fn(async () => undefined);
      vi.stubGlobal('navigator', { install });
      const installer = new InstallPrompt({ events: new EventTarget() });

      // Act
      await installer.install();

      // Assert
      expect(install).toHaveBeenCalledOnce();
    });

    it('listens on the window when not given a target', () => {
      // Arrange
      const window = new EventTarget();
      vi.stubGlobal('window', window);
      vi.stubGlobal('navigator', {});
      const installer = new InstallPrompt();

      // Act
      window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true }));

      // Assert
      expect(installer.available).toBe(true);
    });
  });
});
