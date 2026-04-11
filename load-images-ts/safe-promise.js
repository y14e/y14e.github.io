/**
 * AbortSignal.any の安全な polyfill（メモリリーク・重複発火対策済み）
 * 戻り値のsignalがabortされたら自動でcleanupされる
 */
export const anySignal = (...signals) => {
  const valid = signals.filter((s) => s instanceof AbortSignal);
  if (valid.length === 0) {
    return new AbortController().signal;
  }
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(valid);
  }
  const controller = new AbortController();
  const cleanup = () => {
    for (const s of valid) {
      s.removeEventListener('abort', onAbort);
    }
    controller.signal.removeEventListener('abort', cleanup);
  };
  const onAbort = (ev) => {
    cleanup();
    const target = ev.target;
    controller.abort(target.reason);
  };
  controller.signal.addEventListener('abort', cleanup, { once: true });
  for (const s of valid) {
    if (s.aborted) {
      cleanup();
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
};
/**
 * delay（Abort対応・リーク対策）
 */
export const delay = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(signal.reason);
    }
    let timer = null;
    const onAbort = () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = null;
      signal?.removeEventListener('abort', onAbort);
      reject(signal?.reason);
    };
    timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
/**
 * SafeRace.race
 */
export const race = (factories, parentSignal) => {
  if (factories.length === 0) {
    return Promise.reject(new Error('No factories provided'));
  }
  parentSignal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const controllers = factories.map(() => new AbortController());
    const errors = new Array(factories.length);
    let settled = false;
    let rejectedCount = 0;
    const finalize = (winnerIndex) => {
      if (settled) {
        return;
      }
      settled = true;
      parentSignal?.removeEventListener('abort', onParentAbort);
      for (let i = 0; i < controllers.length; i++) {
        if (i !== winnerIndex) {
          controllers[i].abort(new DOMException('Loser aborted', 'AbortError'));
        }
      }
    };
    const onParentAbort = () => {
      const reason = parentSignal?.reason ?? new DOMException('Aborted', 'AbortError');
      finalize(null);
      reject(reason);
    };
    parentSignal?.addEventListener('abort', onParentAbort, { once: true });
    factories.forEach((factory, i) => {
      const signal = controllers[i].signal;
      Promise.resolve()
        .then(() => factory(signal))
        .then((value) => {
          if (settled) {
            return;
          }
          finalize(i);
          resolve(value);
        })
        .catch((err) => {
          if (settled) {
            return;
          }
          errors[i] = err;
          rejectedCount++;
          if (rejectedCount === factories.length) {
            finalize(null);
            const definedErrors = errors.filter((e) => e !== undefined);
            reject(new AggregateError(definedErrors, 'All promises rejected'));
          }
        });
    });
  });
};
/**
 * SafeRace.raceWithTimeout
 */
export const raceWithTimeout = (factories, timeoutMs, parentSignal, message = `Timeout after ${timeoutMs}ms`) => {
  const timeoutFactory = (signal) =>
    delay(timeoutMs, signal).then(() => {
      throw new DOMException(message, 'TimeoutError');
    });
  return race([...factories, timeoutFactory], parentSignal);
};
/**
 * RetryableRace.raceWithRetry
 */
export const raceWithRetry = async (factoryGenerator, maxRetries = 3, baseDelay = 1000, parentSignal) => {
  parentSignal?.throwIfAborted();
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptCtrl = new AbortController();
    const combined = parentSignal ? anySignal(parentSignal, attemptCtrl.signal) : attemptCtrl.signal;
    try {
      const factories = factoryGenerator(combined);
      return await race(factories, combined);
    } catch (err) {
      lastError = err;
      attemptCtrl.abort();
      if (parentSignal?.aborted) {
        throw err;
      }
      if (attempt < maxRetries) {
        await delay(baseDelay * 2 ** attempt, parentSignal);
      }
    }
  }
  throw lastError;
};
/**
 * 名前空間風エクスポート（biome OK）
 */
export const SafeRace = {
  race,
  raceWithTimeout,
};
export const RetryableRace = {
  raceWithRetry,
};
