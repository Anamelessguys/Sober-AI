/**
 * Projector contract — Context → Prompt Compiler input (Phase 0.9 stub).
 * Projectors are read-only. They must not mutate domain state.
 */

import type { SoberRuntimeContext } from "../types";

/**
 * Opaque compiler input bag. Concrete layer map lives in Brain Prompt Compiler.
 * Projectors only reshape Context; they do not build final messages[].
 */
export interface CompilerProjection {
  runtimeContext: SoberRuntimeContext;
}

/**
 * Read-only projection from Runtime Context toward the Prompt Compiler.
 * Implementation deferred — contract freeze only.
 */
export function projectToCompilerInput(
  runtimeContext: SoberRuntimeContext
): CompilerProjection {
  return { runtimeContext };
}
