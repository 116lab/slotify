/**
 * useApi.js
 * Unified composable for managing API requests with integrated loading and error states.
 */
const { ref } = Vue;

// Return a fresh copy of the initial state so the reset path never hands out
// (and risks an in-place mutation of) the same object/array reference the ref
// was seeded with.
const cloneInitial = (value) => {
  if (value === null || typeof value !== 'object') return value;
  try {
    return structuredClone(value);
  } catch (e) {
    return JSON.parse(JSON.stringify(value));
  }
};

/**
 * @param {Function} apiFunc - The API service function to execute.
 * @param {any} initialData - Optional initial state for data (default: {}).
 * @returns {Object} { data, loading, error, execute }
 */
export function useApi(apiFunc, initialData = {}) {
  const data = ref(cloneInitial(initialData));
  const loading = ref(false);
  const error = ref(false);

  // Monotonic request token to discard stale responses. If the user navigates
  // again before an in-flight fetch resolves, the older response must not
  // overwrite the newer route's data.
  let latestRequest = 0;

  /**
   * Executes the provided API function with arguments.
   * @param  {...any} args - Arguments to pass to the apiFunc.
   */
  const execute = async (...args) => {
    const requestId = ++latestRequest;
    loading.value = true;
    error.value = false;

    try {
      const result = await apiFunc(...args);

      // A newer execute() has superseded this one. Don't mutate state, and
      // return a neutral result so callers that consume the return value
      // directly (e.g. initFuse) don't act on stale data either.
      if (requestId !== latestRequest) {
        return { error: false, data: null, stale: true };
      }

      if (result.error) {
        error.value = true;
        data.value = cloneInitial(initialData); // Maintain initial shape (usually {})
      } else {
        data.value = result.data;
        error.value = false;
      }
      return result;
    } catch (err) {
      // The service layer normally returns { error, data } rather than throwing,
      // but useApi is shared: any apiFunc that DOES throw must not leak out of
      // setup()/onMounted, nor leave loading stuck on. Treat it as an error
      // result for the latest request; stay neutral for a superseded one.
      if (requestId !== latestRequest) {
        return { error: false, data: null, stale: true };
      }
      console.error('[useApi] unexpected error:', err);
      error.value = true;
      data.value = cloneInitial(initialData);
      return { error: true, data: null };
    } finally {
      // Only the latest request owns `loading` — a superseded request resolving
      // late must not clear the spinner for the in-flight one.
      if (requestId === latestRequest) {
        loading.value = false;
      }
    }
  };

  return {
    data,
    loading,
    error,
    execute
  };
}
