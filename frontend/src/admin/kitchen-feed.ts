/** Each kitchen feed can finish even when the other one is stalled. Discard
 * reads started before a successful mutation, logout or navigation. */
export function kitchenRead<T>(load: () => Promise<T>, publish: (value: T) => void) {
  let generation = 0;
  let pending: Promise<void> | undefined;
  return {
    refresh() {
      if (!pending) {
        const started = generation;
        pending = load().then((value) => {
          if (started === generation) publish(value);
        }).catch(() => { /* The next poll retries. Keep the last good result. */ }).finally(() => {
          if (started === generation) pending = undefined;
        });
      }
      return pending;
    },
    invalidate() {
      generation++;
      pending = undefined;
    },
  };
}
