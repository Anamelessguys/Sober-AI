/**
 * Runtime Context builder — contract stub only (Phase 0.9).
 * No pipeline loading or DB access in this phase.
 */

import type { SoberRuntimeContext } from "./types";

/**
 * Future input: pipeline-loaded raw slices from Companion / User /
 * Relationship / Memory / Emotion / Voice / Avatar stores.
 * Shape intentionally minimal until Phase 1.
 */
export interface BuildSoberRuntimeContextInput {
  // Reserved for pipeline raw data. Do not add YeYe-specific shapes here.
}

/**
 * Assembles `SoberRuntimeContext` from loaded domain slices.
 * Implementation deferred — contract freeze only.
 */
export function buildSoberRuntimeContext(
  _input: BuildSoberRuntimeContextInput
): SoberRuntimeContext {
  throw new Error(
    "buildSoberRuntimeContext is not implemented (Phase 0.9 contract freeze)"
  );
}
