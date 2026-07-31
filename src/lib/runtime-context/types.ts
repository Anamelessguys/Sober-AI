/**
 * Sober AI Runtime Context — type placeholders only.
 * No business logic in this phase.
 */

export interface CompanionContext {
  // placeholder
}

export interface UserContext {
  // placeholder
}

export interface RelationshipContext {
  // placeholder
}

export interface MemoryContext {
  // placeholder
}

export interface EmotionContext {
  // placeholder
}

export interface VoiceContext {
  // placeholder
}

export interface AvatarContext {
  // placeholder
}

/**
 * Runtime Context is the source of truth for a companion session turn.
 */
export interface SoberRuntimeContext {
  companionContext: CompanionContext;
  userContext: UserContext;
  relationshipContext: RelationshipContext;
  memoryContext: MemoryContext;
  emotionContext: EmotionContext;
  voiceContext: VoiceContext;
  avatarContext: AvatarContext;
}
