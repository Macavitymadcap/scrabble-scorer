import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { WordList } from './word-list.ts';

const SAMPLE = 'cat\ncolour\nqi\n';

/** A word list fed from a fake fetch, with the fetch spy. */
const withText = (text = SAMPLE) => {
  const fetchText = vi.fn(async () => text);
  return { list: new WordList({ fetchText }), fetchText };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WordList', () => {
  describe('before loading', () => {
    it('is idle', () => {
      // Arrange
      const { list } = withText();

      // Act
      const { status } = list;

      // Assert
      expect(status).toBe('idle');
    });

    it("can't answer yet", () => {
      // Arrange
      const { list } = withText();

      // Act
      const answer = list.contains('cat');

      // Assert
      expect(answer).toBeUndefined();
    });

    it('fetches nothing until asked', () => {
      // Arrange
      const { fetchText } = withText();

      // Act
      const calls = fetchText.mock.calls.length;

      // Assert
      expect(calls).toBe(0);
    });
  });

  describe('loading', () => {
    it('resolves true once ready', async () => {
      // Arrange
      const { list } = withText();

      // Act
      const loaded = await list.load();

      // Assert
      expect(loaded).toBe(true);
      expect(list.status).toBe('ready');
    });

    it('is loading while the fetch is under way', () => {
      // Arrange
      const { list } = withText();

      // Act
      void list.load();

      // Assert
      expect(list.status).toBe('loading');
    });

    it('fetches only once, however often it is asked', async () => {
      // Arrange
      const { list, fetchText } = withText();

      // Act
      await Promise.all([list.load(), list.load()]);
      await list.load();

      // Assert
      expect(fetchText).toHaveBeenCalledOnce();
    });

    it('tells subscribers as the status changes', async () => {
      // Arrange
      const { list } = withText();
      const seen: string[] = [];
      list.subscribe(() => seen.push(list.status));

      // Act
      await list.load();

      // Assert
      expect(seen).toEqual(['loading', 'ready']);
    });

    it('stops telling a subscriber after it unsubscribes', async () => {
      // Arrange
      const { list } = withText();
      const listener = vi.fn();
      list.subscribe(listener)();

      // Act
      await list.load();

      // Assert
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('when the list cannot be fetched', () => {
    const failing = () => {
      const fetchText = vi.fn(() => Promise.reject(new Error('offline')));
      return { list: new WordList({ fetchText }), fetchText };
    };

    it('resolves false', async () => {
      // Arrange
      const { list } = failing();

      // Act
      const loaded = await list.load();

      // Assert
      expect(loaded).toBe(false);
    });

    it('reports an error', async () => {
      // Arrange
      const { list } = failing();

      // Act
      await list.load();

      // Assert
      expect(list.status).toBe('error');
    });

    it('tries again on the next load', async () => {
      // Arrange
      const { list, fetchText } = failing();
      await list.load();

      // Act
      await list.load();

      // Assert
      expect(fetchText).toHaveBeenCalledTimes(2);
    });
  });

  describe('checking words', () => {
    it('finds a word in the list', async () => {
      // Arrange
      const { list } = withText();
      await list.load();

      // Act
      const answer = list.contains('colour');

      // Assert
      expect(answer).toBe(true);
    });

    it('does not find a word that is missing', async () => {
      // Arrange
      const { list } = withText();
      await list.load();

      // Act
      const answer = list.contains('quixe');

      // Assert
      expect(answer).toBe(false);
    });

    it('ignores case', async () => {
      // Arrange
      const { list } = withText();
      await list.load();

      // Act
      const answer = list.contains('QI');

      // Assert
      expect(answer).toBe(true);
    });

    it('does not treat a blank line as a word', async () => {
      // Arrange
      const { list } = withText('cat\n\n');
      await list.load();

      // Act
      const answer = list.contains('');

      // Assert
      expect(answer).toBe(false);
    });

    it('accepts Windows line endings', async () => {
      // Arrange
      const { list } = withText('cat\r\ndog\r\n');
      await list.load();

      // Act
      const answer = list.contains('dog');

      // Assert
      expect(answer).toBe(true);
    });
  });

  describe('the bundled list', () => {
    it('is fetched from the built asset by default', async () => {
      // Arrange
      const fetch = vi.fn(async () => new Response('cat\n'));
      vi.stubGlobal('fetch', fetch);
      const list = new WordList();

      // Act
      await list.load();

      // Assert
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('en-gb'));
      expect(list.contains('cat')).toBe(true);
    });

    it('reports an error for a failed response', async () => {
      // Arrange
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('', { status: 404 })),
      );
      const list = new WordList();

      // Act
      const loaded = await list.load();

      // Assert
      expect(loaded).toBe(false);
    });
  });
});
