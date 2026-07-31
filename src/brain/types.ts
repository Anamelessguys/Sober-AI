/**
 * Brain Turn Contract — frozen types (Phase 0.9).
 * No orchestration / LLM / parsing implementation in this phase.
 */

import type { AvatarState, SoberRuntimeContext } from "@/runtime-context/types";

/** Single Brain turn input. */
export interface BrainTurnInput {
  runtimeContext: SoberRuntimeContext;
  userMessage: string;
}

/** Emotion delta proposed by Brain for this turn. */
export interface BrainEmotionOutput {
  label: string;
  valence: number;
  arousal: number;
  intensity: number;
  deltaReason?: string;
}

/** TTS / prosody hints. Voice maps these; Voice does not invent semantics. */
export interface BrainVoiceStyle {
  style: string;
  speakingRate?: number;
  pitchBias?: number;
  pauseMs?: number;
}

/** Avatar driver instruction. Motion must be in availableMotions when set. */
export interface BrainAvatarInstruction {
  state: AvatarState;
  expression: string;
  motion?: string;
  lipsyncHint?: "normal" | "soft" | "emphatic";
  holdMs?: number;
}

/**
 * Structured Brain output.
 * Must be parseable as text + emotion + voiceStyle + avatarInstruction.
 */
export interface BrainTurnOutput {
  text: string;
  emotion: BrainEmotionOutput;
  voiceStyle: BrainVoiceStyle;
  avatarInstruction: BrainAvatarInstruction;
}
