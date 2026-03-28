export interface UserAvatarProfile {
    spriteIndex: number;
    updatedAt: string;
}

export interface UserPublicPersonaProfile {
    additionalDescription?: string;
}

export interface UserAiHostingProfile {
    enabled?: boolean;
    coreIdentity?: string;
    speakingStyle?: string;
    interactionGoals?: string;
    relationshipGuidance?: string;
    boundaries?: string;
    additionalInstructions?: string;
}

export interface UserProfile {
    userId: string;
    avatar?: UserAvatarProfile;
    characterSystemPrompt?: string;
    publicPersona?: UserPublicPersonaProfile;
    aiHosting?: UserAiHostingProfile;
    preferences: Record<string, unknown>;
    updatedAt: string;
}