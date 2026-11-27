import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  ScreenWakeLock,
  type VisibilitySource,
  type WakeLockApi,
  type WakeLockHandle,
} from './screen-wake-lock.ts';

// Some tests replace navigator, window or document; put them back after each.
afterEach(() => {
  vi.unstubAllGlobals();
});

/** A fake wake lock API whose handles can be released by "the browser". */
const fakeApi = () => {
  const handles: {
    handle: WakeLockHandle;
    releasedByBrowser: () => void;
    release: ReturnType<typeof vi.fn>;
  }[] = [];
  const request = vi.fn(async () => {
    const listeners: (() => void)[] = [];
    const release = vi.fn(async () => undefined);
    const handle: WakeLockHandle = {
      release,
      addEventListener: (_type, listener) => {
        listeners.push(listener);
      },
    };
    handles.push({ handle, release, releasedByBrowser: () => listeners.forEach((l) => l()) });
    return handle;
  });
  const api: WakeLockApi = { request };
  return { api, request, handles };
};

/** A fake document whose visibility can be changed. */
const fakeVisibility = () => {
  const target = new EventTarget();
  const source = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  };
  const setVisible = (visible: boolean) => {
    source.visibilityState = visible ? 'visible' : 'hidden';
    target.dispatchEvent(new Event('visibilitychange'));
  };
  return { visibility: source as unknown as VisibilitySource, setVisible };
};

const makeLock = () => {
  const { api, request, handles } = fakeApi();
  const { visibility, setVisible } = fakeVisibility();
  const lock = new ScreenWakeLock({ api, visibility });
  lock.connect();
  return { lock, request, handles, setVisible };
};

/** Lets pending promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('ScreenWakeLock', () => {
  it('is supported when the API exists', () => {
    // Arrange
    const { lock } = makeLock();

    // Act
    const { supported } = lock;

    // Assert
    expect(supported).toBe(true);
  });

  it('is not supported without the API', () => {
    // Arrange
    const lock = new ScreenWakeLock({ api: undefined, visibility: fakeVisibility().visibility });

    // Act
    const { supported } = lock;

    // Assert
    expect(supported).toBe(false);
  });

  it("uses the browser's wake lock when not given an API", () => {
    // Arrange
    vi.stubGlobal('navigator', { wakeLock: fakeApi().api });

    // Act
    const lock = new ScreenWakeLock({ visibility: fakeVisibility().visibility });

    // Assert
    expect(lock.supported).toBe(true);
  });

  it('treats an explicit undefined API as unsupported', () => {
    // Arrange
    vi.stubGlobal('navigator', { wakeLock: fakeApi().api });

    // Act
    const lock = new ScreenWakeLock({ api: undefined, visibility: fakeVisibility().visibility });

    // Assert
    expect(lock.supported).toBe(false);
  });

  it('follows the document when not given one', () => {
    // Arrange
    vi.stubGlobal('document', fakeVisibility().visibility);
    const lock = new ScreenWakeLock({ api: undefined });

    // Act
    const act = () => lock.connect();

    // Assert
    expect(act).not.toThrow();
  });

  it('does nothing when wanted but unsupported', async () => {
    // Arrange
    const lock = new ScreenWakeLock({ api: undefined, visibility: fakeVisibility().visibility });

    // Act
    await lock.want(true);

    // Assert
    expect(lock.held).toBe(false);
  });

  it('requests a screen lock when wanted', async () => {
    // Arrange
    const { lock, request } = makeLock();

    // Act
    await lock.want(true);

    // Assert
    expect(request).toHaveBeenCalledWith('screen');
    expect(lock.held).toBe(true);
  });

  it('requests only once while already held', async () => {
    // Arrange
    const { lock, request } = makeLock();
    await lock.want(true);

    // Act
    await lock.want(true);

    // Assert
    expect(request).toHaveBeenCalledOnce();
  });

  it('releases the lock when no longer wanted', async () => {
    // Arrange
    const { lock, handles } = makeLock();
    await lock.want(true);

    // Act
    await lock.want(false);

    // Assert
    expect(handles[0]?.release).toHaveBeenCalledOnce();
    expect(lock.held).toBe(false);
  });

  it('does not request a lock while the page is hidden', async () => {
    // Arrange
    const { lock, request, setVisible } = makeLock();
    setVisible(false);

    // Act
    await lock.want(true);

    // Assert
    expect(request).not.toHaveBeenCalled();
  });

  it('requests the lock again when the page becomes visible', async () => {
    // Arrange
    const { lock, request, handles, setVisible } = makeLock();
    await lock.want(true);
    setVisible(false);
    handles[0]?.releasedByBrowser();

    // Act
    setVisible(true);
    await settle();

    // Assert
    expect(request).toHaveBeenCalledTimes(2);
    expect(lock.held).toBe(true);
  });

  it('notices when the browser releases the lock', async () => {
    // Arrange
    const { lock, handles } = makeLock();
    await lock.want(true);

    // Act
    handles[0]?.releasedByBrowser();

    // Assert
    expect(lock.held).toBe(false);
  });

  it('ignores a refused request', async () => {
    // Arrange
    const api: WakeLockApi = { request: () => Promise.reject(new Error('NotAllowedError')) };
    const lock = new ScreenWakeLock({ api, visibility: fakeVisibility().visibility });

    // Act
    const act = lock.want(true);

    // Assert
    await expect(act).resolves.toBeUndefined();
    expect(lock.held).toBe(false);
  });

  it('releases a lock granted after it stopped being wanted', async () => {
    // Arrange
    const { lock, handles } = makeLock();
    const wanting = lock.want(true);

    // Act
    await lock.want(false);
    await wanting;

    // Assert
    expect(handles[0]?.release).toHaveBeenCalledOnce();
    expect(lock.held).toBe(false);
  });

  it('ignores a failed release', async () => {
    // Arrange
    const api: WakeLockApi = {
      request: async () => ({
        release: () => Promise.reject(new Error('already released')),
        addEventListener: () => undefined,
      }),
    };
    const lock = new ScreenWakeLock({ api, visibility: fakeVisibility().visibility });
    await lock.want(true);

    // Act
    const act = lock.want(false);

    // Assert
    await expect(act).resolves.toBeUndefined();
  });

  it('lets the screen sleep and stops following visibility once disconnected', async () => {
    // Arrange
    const { lock, request, setVisible } = makeLock();
    await lock.want(true);
    lock.disconnect();
    await settle();

    // Act
    setVisible(true);
    await settle();

    // Assert
    expect(lock.held).toBe(false);
    expect(request).toHaveBeenCalledOnce();
  });

  it('ignores a stale release event from an earlier lock', async () => {
    // Arrange
    const { lock, handles, setVisible } = makeLock();
    await lock.want(true);
    setVisible(false);
    await settle();
    setVisible(true);
    await settle();

    // Act
    handles[0]?.releasedByBrowser();

    // Assert
    expect(lock.held).toBe(true);
  });
});
