/**
 * Indexed access that enforces an invariant instead of a type assertion: with `noUncheckedIndexedAccess`
 * `arr[i]` is `T | undefined`; callers that know the index is valid use `at()` and get a loud error if not.
 */
export function at<T>(items: readonly T[], index: number): T {
  const v = items[index];
  if (v === undefined) throw new RangeError(`index ${index} out of bounds (length ${items.length})`);
  return v;
}
