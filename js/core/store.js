/** Minimal observable state container. */
export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    get: () => state,

    set(patch) {
      const prev = state;
      state = { ...state, ...patch };
      listeners.forEach(listener => listener(state, prev));
    },

    /** Runs `fn` now and whenever any of `keys` changes (shallow comparison). */
    watch(keys, fn) {
      const listener = (next, prev) => {
        if (!prev || keys.some(key => next[key] !== prev[key])) fn(next);
      };
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
  };
}
