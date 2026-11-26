/** Persist acceptance before optional promise-time work. A failed estimate must
 * never prevent acceptance or leave an accepted ticket open in the takeover. */
export async function acceptOrderWithEstimate(deps: {
  accept: () => Promise<boolean>;
  onAccepted: () => void;
  saveEstimate: () => Promise<unknown>;
}): Promise<boolean> {
  if (!await deps.accept()) return false;
  deps.onAccepted();
  try { await deps.saveEstimate(); } catch { /* Estimate failure cannot undo acceptance. */ }
  return true;
}
