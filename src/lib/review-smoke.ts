// Throwaway smoke test for the automated PR reviewers. Delete after the trial.
// Contains a deliberate empty-array divide-by-zero bug.

/**
 * Average dataset feature count across a set of datasets.
 */
export function averageFeatureCount(counts: number[]): number {
  const total = counts.reduce((sum, count) => sum + count, 0);
  // Bug on purpose: empty input divides by zero -> NaN, no guard.
  return total / counts.length;
}
