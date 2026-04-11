import { mapWithConcurrency, withRetry, withTimeout } from './safe-promise.js';
/* ---------------------------------- */
/* Public API */
/* ---------------------------------- */
export async function loadImages(urls, options = {}) {
  if (urls.length === 0) {
    return [];
  }
  const settings = normalizeOptions(options);
  const { concurrency, signal: internalSignal, onProgress, throwOnError } = settings;
  internalSignal?.throwIfAborted();
  let finished = 0;
  const results = await mapWithConcurrency(
    urls,
    concurrency,
    async (url, signal) => {
      const image = await loadImage(url, settings, signal);
      if (!image && throwOnError) {
        throw new Error(`Image load failed: ${url}`);
      }
      onProgress?.(++finished, urls.length);
      return image;
    },
    internalSignal,
  );
  return results.filter((image) => {
    return image !== null;
  });
}
/* ---------------------------------- */
/* Core */
/* ---------------------------------- */
async function loadImage(url, settings, parentSignal) {
  const { retry, timeout, crossOrigin } = settings;
  try {
    return await withRetry(
      (signal) => {
        return withTimeout(loadImageOnce(url, crossOrigin, signal), timeout, signal, `Image timeout (${timeout}ms): ${url}`);
      },
      {
        retries: retry.retries,
        baseDelay: retry.delay,
        signal: parentSignal,
      },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.warn('Image load failed:', { url, error });
    return null;
  }
}
/* ---------------------------------- */
/* Low-level loader */
/* ---------------------------------- */
function loadImageOnce(url, crossOrigin, signal) {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }
    let settled = false;
    const cleanup = () => {
      if (settled) return;
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
      if (settled) return;
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
      if (settled) return;
      cleanup();
      reject(new Error(`Image load failed: ${url}`));
    };
    signal.addEventListener('abort', onAbort, {
      once: true,
    });
    img.addEventListener('load', onLoad, {
      once: true,
    });
    img.addEventListener('error', onError, {
      once: true,
    });
    img.src = url;
    // キャッシュ済み対応
    if (img.complete && img.naturalWidth > 0) {
      void onLoad();
    }
  });
}
/* ---------------------------------- */
/* Utils */
/* ---------------------------------- */
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
    retry: {
      ...defaults.retry,
      ...options.retry,
    },
  };
}
