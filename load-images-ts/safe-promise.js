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
export const allSettled = (factories, parentSignal) => {
  if (factories.length === 0) {
    return Promise.resolve([]);
  }
  parentSignal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const controllers = factories.map(() => new AbortController());
    const results = new Array(factories.length);
    let settledCount = 0;
    let finished = false;
    const finalize = () => {
      if (finished) return;
      finished = true;
      parentSignal?.removeEventListener('abort', onParentAbort);
      resolve(results);
    };
    const onParentAbort = () => {
      const reason = parentSignal?.reason ?? new DOMException('Aborted', 'AbortError');
      for (const c of controllers) {
        c.abort(reason);
      }
      reject(reason);
    };
    parentSignal?.addEventListener('abort', onParentAbort, { once: true });
    factories.forEach((factory, i) => {
      const signal = controllers[i].signal;
      Promise.resolve()
        .then(() => factory(signal))
        .then((value) => {
          results[i] = { status: 'fulfilled', value };
        })
        .catch((reason) => {
          results[i] = { status: 'rejected', reason };
        })
        .finally(() => {
          settledCount++;
          if (settledCount === factories.length) {
            finalize();
          }
        });
    });
  });
};
export const raceWithConcurrency = (factories, concurrency = Infinity, parentSignal) => {
  if (factories.length === 0) {
    return Promise.reject(new Error('No factories provided'));
  }
  parentSignal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const controllers = [];
    const errors = new Array(factories.length);
    let settled = false;
    let rejectedCount = 0;
    let nextIndex = 0;
    let active = 0;
    const finalize = (winnerIndex) => {
      if (settled) return;
      settled = true;
      parentSignal?.removeEventListener('abort', onParentAbort);
      for (let i = 0; i < controllers.length; i++) {
        if (i !== winnerIndex) {
          controllers[i]?.abort(new DOMException('Loser aborted', 'AbortError'));
        }
      }
    };
    const onParentAbort = () => {
      const reason = parentSignal?.reason ?? new DOMException('Aborted', 'AbortError');
      finalize(null);
      reject(reason);
    };
    parentSignal?.addEventListener('abort', onParentAbort, { once: true });
    const launch = (i) => {
      const controller = new AbortController();
      controllers[i] = controller;
      active++;
      Promise.resolve()
        .then(() => factories[i](controller.signal))
        .then((value) => {
          if (settled) return;
          finalize(i);
          resolve(value);
        })
        .catch((err) => {
          if (settled) return;
          errors[i] = err;
          rejectedCount++;
          active--;
          if (rejectedCount === factories.length) {
            finalize(null);
            reject(new AggregateError(errors, 'All promises rejected'));
            return;
          }
          schedule();
        });
    };
    const schedule = () => {
      while (active < concurrency && nextIndex < factories.length && !settled) {
        launch(nextIndex++);
      }
    };
    schedule();
  });
};
export const firstSuccess = (factories, parentSignal) => {
  if (factories.length === 0) {
    return Promise.reject(new Error('No factories provided'));
  }
  parentSignal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const controllers = factories.map(() => new AbortController());
    const errors = new Array(factories.length);
    let settled = false;
    let failed = 0;
    const finalize = (winner) => {
      if (settled) return;
      settled = true;
      parentSignal?.removeEventListener('abort', onAbort);
      controllers.forEach((c, i) => {
        if (i !== winner) {
          c.abort(new DOMException('Loser aborted', 'AbortError'));
        }
      });
    };
    const onAbort = () => {
      const reason = parentSignal?.reason ?? new DOMException('Aborted', 'AbortError');
      finalize(null);
      reject(reason);
    };
    parentSignal?.addEventListener('abort', onAbort, { once: true });
    factories.forEach((factory, i) => {
      Promise.resolve()
        .then(() => factory(controllers[i].signal))
        .then((value) => {
          if (settled) return;
          finalize(i);
          resolve(value);
        })
        .catch((err) => {
          if (settled) return;
          errors[i] = err;
          failed++;
          if (failed === factories.length) {
            finalize(null);
            reject(new AggregateError(errors, 'All failed'));
          }
        });
    });
  });
};
export const mapWithConcurrency = async (items, concurrency, fn, parentSignal) => {
  parentSignal?.throwIfAborted();
  const results = new Array(items.length);
  const controllers = [];
  let next = 0;
  let active = 0;
  return new Promise((resolve, reject) => {
    const launch = (i) => {
      const controller = new AbortController();
      controllers[i] = controller;
      active++;
      Promise.resolve()
        .then(() => fn(items[i], controller.signal, i))
        .then((res) => {
          results[i] = res;
        })
        .catch(reject)
        .finally(() => {
          active--;
          schedule();
        });
    };
    const schedule = () => {
      if (next >= items.length && active === 0) {
        resolve(results);
        return;
      }
      while (active < concurrency && next < items.length) {
        launch(next++);
      }
    };
    schedule();
  });
};
export const timeoutSignal = (ms, parentSignal, message = `Timeout after ${ms}ms`) => {
  const controller = new AbortController();
  const { signal } = controller;
  if (parentSignal?.aborted) {
    controller.abort(parentSignal.reason);
    return signal;
  }
  let timer = setTimeout(() => {
    timer = null;
    controller.abort(new DOMException(message, 'TimeoutError'));
  }, ms);
  const cleanup = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    parentSignal?.removeEventListener('abort', onParentAbort);
    signal.removeEventListener('abort', cleanup);
  };
  const onParentAbort = () => {
    cleanup();
    controller.abort(parentSignal?.reason);
  };
  parentSignal?.addEventListener('abort', onParentAbort, { once: true });
  signal.addEventListener('abort', cleanup, { once: true });
  return signal;
};
export const withTimeout = (promise, ms, parentSignal, message = `Timeout after ${ms}ms`) => {
  const signal = timeoutSignal(ms, parentSignal, message);
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason);
    };
    if (signal.aborted) {
      return reject(signal.reason);
    }
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener('abort', onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      },
    );
  });
};
export const withRetry = async (fn, { retries = 3, baseDelay = 1000, signal: parentSignal } = {}) => {
  parentSignal?.throwIfAborted();
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const combined = parentSignal ? anySignal(parentSignal, controller.signal) : controller.signal;
    try {
      return await fn(combined);
    } catch (err) {
      lastError = err;
      controller.abort();
      if (parentSignal?.aborted) {
        throw err;
      }
      if (attempt < retries) {
        await delay(baseDelay * 2 ** attempt, parentSignal);
      }
    }
  }
  throw lastError;
};
export const timeoutPromise = (ms, parentSignal, message = `Timeout after ${ms}ms`) => {
  return delay(ms, parentSignal).then(() => {
    throw new DOMException(message, 'TimeoutError');
  });
};
export const allWithConcurrency = (factories, concurrency, parentSignal) => {
  return mapWithConcurrency(factories, concurrency, (fn, signal) => fn(signal), parentSignal);
};
export const filterWithConcurrency = async (items, concurrency, fn, parentSignal) => {
  const results = await mapWithConcurrency(items, concurrency, fn, parentSignal);
  return items.filter((_, i) => results[i]);
};
export const deadlineSignal = (timestamp, parentSignal) => {
  return timeoutSignal(Math.max(0, timestamp - Date.now()), parentSignal);
};
export const interval = (ms, fn, signal) => {
  if (signal?.aborted) return;
  const id = setInterval(fn, ms);
  signal?.addEventListener(
    'abort',
    () => {
      clearInterval(id);
    },
    { once: true },
  );
};
export const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
export const memoizeAsync = (fn) => {
  const cache = new Map();
  return (key) => {
    if (!cache.has(key)) {
      cache.set(
        key,
        fn(key).finally(() => cache.delete(key)),
      );
    }
    return cache.get(key);
  };
};
export const wait = (ms, value, signal) => delay(ms, signal).then(() => value);
export const allSettledWithConcurrency = (factories, concurrency, parentSignal) => {
  parentSignal?.throwIfAborted();
  if (factories.length === 0) {
    return Promise.resolve([]);
  }
  return new Promise((resolve, reject) => {
    const results = new Array(factories.length);
    const controllers = [];
    let nextIndex = 0;
    let active = 0;
    let finishedCount = 0;
    let settled = false;
    const onParentAbort = () => {
      if (settled) return;
      settled = true;
      const reason = parentSignal?.reason ?? new DOMException('Aborted', 'AbortError');
      for (const c of controllers) c.abort(reason);
      reject(reason);
    };
    parentSignal?.addEventListener('abort', onParentAbort, { once: true });
    const finalize = () => {
      if (settled) return;
      settled = true;
      parentSignal?.removeEventListener('abort', onParentAbort);
      resolve(results);
    };
    const launch = (i) => {
      const controller = new AbortController();
      controllers[i] = controller;
      active++;
      Promise.resolve()
        .then(() => factories[i](controller.signal))
        .then(
          (value) => {
            results[i] = { status: 'fulfilled', value };
          },
          (reason) => {
            results[i] = { status: 'rejected', reason };
          },
        )
        .finally(() => {
          active--;
          finishedCount++;
          if (finishedCount === factories.length) {
            finalize();
          } else {
            schedule();
          }
        });
    };
    const schedule = () => {
      while (active < concurrency && nextIndex < factories.length && !settled) {
        launch(nextIndex++);
      }
    };
    schedule();
  });
};
