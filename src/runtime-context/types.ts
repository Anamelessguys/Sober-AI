/**
 * Sober Runtime Context V2 — frozen contract (Phase 0.9).
 * Alpha MVP field set only. No business logic.
 */

/** Companion relationship stage (see Architecture Spec §6). */
export type RelationshipStage =
  | "STRANGER"
  | "ACQUAINTANCE"
  | "FAMILIAR"
  | "CLOSE"
  | "INTIMATE"
  | "PARTNERED"
  | "STRAINED";

/** Avatar presentation state. */
export type AvatarState = "idle" | "thinking" | "speaking" | "special";

/** Companion memory category (Alpha). */
export type MemoryCategory =
  | "user_preference"
  | "life_event"
  | "emotion_event"
  | "shared_experience"
  | "relationship_node";

export type TurnMode = "text" | "voice";

/** Observability for internal Alpha debugging. */
export interface RuntimeDebugMeta {
  source: string;
  fieldsLoaded: string[];
  missingFields: string[];
  warnings: string[];
  turnId: string;
  mode: TurnMode;
}

export interface CompanionContext {
  id: string;
  name: string;
  /** Core identity / persona lock text. */
  identity: string;
  speakingStyle: string;
  /** Hard boundary summary for Safety / Identity layers. */
  boundaries: string;
  /** Whether adult-oriented expression is allowed for this companion. */
  adultCapability: boolean;
}

export interface UserContext {
  userId: string;
  displayName: string;
  nsfwAllowed: boolean;
  ageVerified: boolean;
}

export interface RelationshipContext {
  stage: RelationshipStage;
  trust: number;
  affection: number;
  familiarity: number;
}

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  importance: number;
}

export interface MemoryContext {
  items: MemoryItem[];
  enabled: boolean;
  injectAllowed: boolean;
}

export interface EmotionContext {
  label: string;
  valence: number;
  arousal: number;
  intensity: number;
}

export interface VoiceContext {
  /** null = text-only turn. */
  sessionId: string | null;
  bargeInEnabled: boolean;
  latencyBudgetMs: number;
}

export interface AvatarContext {
  currentState: AvatarState;
  /** Prefab motion whitelist for this asset pack. */
  availableMotions: string[];
}

/**
 * Runtime Context is the structured projection bus into Brain.
 * Domain modules own durable state; this object is the turn-scoped view.
 */
export interface SoberRuntimeContext {
  companionContext: CompanionContext | null;
  userContext: UserContext | null;
  relationshipContext: RelationshipContext | null;
  memoryContext: MemoryContext | null;
  emotionContext: EmotionContext | null;
  voiceContext: VoiceContext | null;
  avatarContext: AvatarContext | null;
  debugMeta: RuntimeDebugMeta;
}
