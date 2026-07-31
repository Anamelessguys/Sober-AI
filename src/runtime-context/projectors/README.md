# projectors/

Read-only adapters from `SoberRuntimeContext` toward Brain Prompt Compiler.

## Rules

- Project only; do not mutate Memory / Emotion / Relationship / Voice / Avatar stores
- Do not construct final `messages[]` (that is Prompt Compiler’s job)
- Do not call LLM

## Files

| File | Role |
|------|------|
| `to-compiler-input.ts` | `projectToCompilerInput()` contract stub |
