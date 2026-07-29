// Throwaway smoke test for the automated PR reviewers (CodeRabbit vs Claude).
// Delete after the trial. Contains a deliberate edge-case bug so we can see
// which reviewer flags it.

/**
 * Average dataset feature count across a set of datasets.
 */
export function averageFeatureCount(counts: number[]): number {
  const total = counts.reduce((sum, count) => sum + count, 0);
  // Bug on purpose: empty input divides by zero -> NaN, no guard.
  return total / counts.length;
}
