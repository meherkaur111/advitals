/**
 * Is a change in a rate (CTR, CVR) real, or just noise from small numbers?
 *
 * Two-proportion z-test: compares successes/trials across two periods.
 * |z| >= 1.96 is roughly 95% confidence that the rate truly moved.
 */
export interface RateTest {
  z: number;
  significant: boolean;
}

export function twoProportionTest(
  successesA: number,
  trialsA: number,
  successesB: number,
  trialsB: number,
): RateTest | null {
  if (trialsA <= 0 || trialsB <= 0) return null;
  const pA = successesA / trialsA;
  const pB = successesB / trialsB;
  const pooled = (successesA + successesB) / (trialsA + trialsB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / trialsA + 1 / trialsB));
  if (!Number.isFinite(se) || se === 0) return null;
  const z = (pB - pA) / se;
  return { z, significant: Math.abs(z) >= 1.96 };
}
