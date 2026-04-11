import { SafeRace } from './safe-promise.js';
export async function loadImages(urls, options = {}) {
  if (urls.length === 0) {
    return [];
  }
  const settings = normalizeOptions(options);
  settings.signal?.throwIfAborted();
  const { concurrency, signal, onProgress, throwOnError } = settings;
  let finished = 0;
  const tasks = urls.map((url, _index) => async (sig) => {
    const img = await loadImageWithRetry(url, settings, sig);
    if (!img && throwOnError) {
      throw new Error(`Image load failed: ${url}`);
    }
    onProgress?.(++finished, urls.length);
    return img;
  });
  const results = await runWithConcurrency(tasks, concurrency, signal);
  return results.filter((img) => img !== null);
}
function normalizeOptions(options) {
  const defaults = {
    crossOrigin: undefined,
    concurrency: Infinity,
    onProgress: undefined,
    retry: { delay: 200, retries: 0 },
    signal: undefined,
    throwOnError: false,
    timeout: 3000,
  };
  return {
    ...defaults,
    ...options,
    retry: { ...defaults.retry, ...options.retry },
  };
}
async function loadImageWithRetry(url, settings, parentSignal) {
  const { retry, timeout, crossOrigin } = settings;
  const { delay, retries } = retry;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    parentSignal?.throwIfAborted();
    try {
      return await SafeRace.raceWithTimeout([(sig) => loadImageOnce(url, crossOrigin, sig)], timeout, parentSignal, `Image load timeout (${timeout}ms): ${url}`);
    } catch (error) {
      lastError = error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      if (attempt === retries) {
        break;
      }
      await delayWithBackoff(delay, attempt, parentSignal);
    }
  }
  console.warn(`Image load failed after ${retries + 1} attempts:`, { url, error: lastError });
  return null;
}
async function runWithConcurrency(factories, concurrency, signal) {
  if (factories.length === 0) {
    return [];
  }
  if (concurrency === Infinity) {
    return Promise.all(factories.map((f) => f(signal)));
  }
  const results = new Array(factories.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, factories.length) }, async () => {
    while (true) {
      signal?.throwIfAborted();
      const index = nextIndex++;
      if (index >= factories.length) {
        break;
      }
      results[index] = await factories[index](signal);
    }
  });
  await Promise.all(workers);
  return results;
}
function loadImageOnce(url, crossOrigin, signal) {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }
    let settled = false;
    const cleanup = () => {
      if (settled) {
        return;
      }
      settled = true;
      signal.removeEventListener('abort', onAbort);
      img.onload = null;
      img.onerror = null;
    };
    const onAbort = () => {
      cleanup();
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    const onLoad = async () => {
      if (settled) {
        return;
      }
      try {
        await img.decode();
        cleanup();
        resolve(img);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
    const onError = () => {
      if (settled) {
        return;
      }
      cleanup();
      reject(new Error(`Image load failed: ${url}`));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });
    img.src = url;
    if (img.complete && img.naturalWidth > 0) {
      void onLoad();
    }
  });
}
function delayWithBackoff(baseMs, attempt, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const timeout = setTimeout(
      () => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      },
      baseMs * 2 ** attempt,
    );
    const onAbort = () => {
      clearTimeout(timeout);
      reject(signal.reason);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
