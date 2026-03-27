import type { AgentDefinition, AppSession, BootstrapResponse, ClientType, DepartmentUser, UserProfile, VerifiedIdentity } from "../../../../shared/types";
import { buildBuiltInEnvironmentAvatarDefinitions, getBuiltInEnvironmentAvatarIds } from "../../config/builtInEnvironmentAvatars";
import { getServerConfig } from "../../config";
import { deleteSessionRecord, getCharacterRecord, getExternalIdentityUserId, getProfileRecord, getSessionRecord, getUserRecord, listCharacterRecords, listUserRecords, setCharacterRecord, setExternalIdentityUserId, setProfileRecord, setSessionRecord, setUserRecord } from "../stateStore";

const now = () => new Date().toISOString();

const serverConfig = getServerConfig();
const sessionTtlSeconds = serverConfig.sessionTtlSeconds;

const LEGACY_SEEDED_CHARACTER_NAMES: Record<string, string> = {
    "chuanhao-bot": "李传浩老师",
    "chenwang-bot": "王琛老师"
};

function buildConfiguredDefaultAgentRoute(): Pick<AgentDefinition, "provider" | "model"> {
    const explicitProvider = process.env.TIMD_AGENT_LLM_PROVIDER?.trim().toLowerCase();

    if (explicitProvider === "mock") {
        return {
            provider: "mock",
            model: process.env.MOCK_LLM_MODEL ?? "local-context-preview"
        };
    }

    if (explicitProvider === "openrouter") {
        return {
            provider: "openrouter",
            model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini"
        };
    }

    if (explicitProvider === "openai") {
        return {
            provider: "openai",
            model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
        };
    }

    if (process.env.OPENROUTER_API_KEY) {
        return {
            provider: "openrouter",
            model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini"
        };
    }

    if (process.env.OPENAI_API_KEY) {
        return {
            provider: "openai",
            model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
        };
    }

    return {
        provider: "mock",
        model: process.env.MOCK_LLM_MODEL ?? "local-context-preview"
    };
}

const seededCharacters = (): AgentDefinition[] => buildBuiltInEnvironmentAvatarDefinitions(buildConfiguredDefaultAgentRoute());
const DEFAULT_ENVIRONMENT_AVATAR_DISPLAY_NAME = "New environment avatar";
const DEFAULT_ENVIRONMENT_AVATAR_CAPTION = "Press E to chat";
const DEFAULT_ENVIRONMENT_AVATAR_WALK_SIZE = 80;

const cloneCharacterDefinition = (definition: AgentDefinition): AgentDefinition => ({
    ...definition,
    position: { ...definition.position },
    walkArea: definition.walkArea ? { ...definition.walkArea } : undefined
});

const buildDefaultEnvironmentAvatarPrompt = (displayName: string): string => {
    return `You are ${displayName}, an AI department avatar inside a virtual department environment. Be concise, helpful, and honest about uncertainty. Use the user's recent activity context when it is relevant.`;
};

const buildDefaultEnvironmentAvatarWalkArea = (position: { x: number; y: number }) => ({
    x: position.x,
    y: position.y,
    width: DEFAULT_ENVIRONMENT_AVATAR_WALK_SIZE,
    height: DEFAULT_ENVIRONMENT_AVATAR_WALK_SIZE
});

const createEnvironmentAvatarAgentId = (displayName: string): string => {
    const baseId = `env-${normalizeIdPart(displayName)}`;
    const existingIds = new Set(listCharacterRecords().map(character => character.agentId));
    if (!existingIds.has(baseId)) {
        return baseId;
    }

    let suffix = 2;
    while (existingIds.has(`${baseId}-${suffix}`)) {
        suffix += 1;
    }
    return `${baseId}-${suffix}`;
};

const ensureSeededCharacters = (): AgentDefinition[] => {
    const builtInDefinitions = seededCharacters();
    const builtInCharacterIds = new Set(getBuiltInEnvironmentAvatarIds());
    const persistedCharacters = listCharacterRecords();
    const persistedById = new Map(persistedCharacters.map(character => [character.agentId, character]));

    builtInDefinitions.forEach(character => {
        const persistedCharacter = persistedById.get(character.agentId);
        if (!persistedCharacter) {
            setCharacterRecord({
                ...cloneCharacterDefinition(character),
                updatedAt: now()
            });
            return;
        }

        const legacyName = LEGACY_SEEDED_CHARACTER_NAMES[character.agentId];
        const shouldMigrateLegacyDeploymentCharacter = !persistedCharacter.ownerUserId
            && !!legacyName
            && persistedCharacter.displayName === legacyName;

        if (shouldMigrateLegacyDeploymentCharacter) {
            setCharacterRecord({
                ...cloneCharacterDefinition(character),
                updatedAt: persistedCharacter.updatedAt ?? now()
            });
        }
    });

    const characters = listCharacterRecords();
    const filteredCharacters = (characters.length > 0 ? characters : builtInDefinitions)
        .filter(character => character.ownerUserId || builtInCharacterIds.has(character.agentId));
    return filteredCharacters.map(cloneCharacterDefinition);
};

export const getMockBootstrapResponse = (): BootstrapResponse => ({
    authenticated: false,
    user: null,
    profile: null,
    session: null,
    agents: ensureSeededCharacters(),
    room: {
        roomId: serverConfig.defaultRoomId,
        displayName: serverConfig.defaultRoomDisplayName
    },
    loginUrl: "/auth/login"
});

const createExternalIdentityKey = (externalProvider: string, externalId: string): string => {
    return `${externalProvider.toLowerCase()}:${externalId.toLowerCase()}`;
};

const normalizeIdPart = (value: string): string => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return normalized || "user";
};

const createStableUserId = (identity: VerifiedIdentity): string => {
    return `user-${normalizeIdPart(identity.externalProvider)}-${normalizeIdPart(identity.externalId)}`;
};

const createSessionId = (userId: string): string => {
    return `session-${userId}-${Date.now()}`;
};

const getProfileByUserId = (userId: string): UserProfile => {
    const existingProfile = getProfileRecord(userId);
    if (existingProfile) {
        return existingProfile;
    }

    const createdProfile: UserProfile = {
        userId,
        characterSystemPrompt: "",
        preferences: {},
        updatedAt: now()
    };
    return setProfileRecord(createdProfile);
};

const createUserAvatarAgentId = (userId: string): string => `user-avatar-${userId}`;

const buildUserAvatarSystemPrompt = (user: DepartmentUser, profile: UserProfile): string => {
    const customPrompt = profile.characterSystemPrompt?.trim();
    if (customPrompt) {
        return customPrompt;
    }

    const identitySummary = [
        user.organization ? `Organization: ${user.organization}.` : "",
        user.department ? `Department: ${user.department}.` : "",
        user.roles.length > 0 ? `Roles: ${user.roles.join(", ")}.` : ""
    ].filter(Boolean).join(" ");

    return `You are the AI representation of ${user.displayName}. Speak in first person as this department member. Use prior activity context when available, stay grounded in known facts, and explicitly say when you do not know something. ${identitySummary}`.trim();
};

const buildConfiguredAvatarModelRoute = (): Pick<AgentDefinition, "provider" | "model"> => buildConfiguredDefaultAgentRoute();

const buildUserAvatarAgentDefinition = (user: DepartmentUser, profile: UserProfile, position: { x: number; y: number }): AgentDefinition => ({
    agentId: createUserAvatarAgentId(user.userId),
    displayName: user.displayName,
    spriteIndex: profile.avatar?.spriteIndex ?? 0,
    position: { ...position },
    caption: "Press E to chat",
    defaultSystemPrompt: buildUserAvatarSystemPrompt(user, profile),
    ...buildConfiguredAvatarModelRoute(),
    characterRole: "custom",
    ownerUserId: user.userId,
    spawnByDefault: false,
    updatedAt: now()
});

const hydrateAvatarAgentDefinition = (definition: AgentDefinition): AgentDefinition => {
    if (!definition.ownerUserId) {
        return cloneCharacterDefinition(definition);
    }

    const user = getUserRecord(definition.ownerUserId);
    if (!user) {
        return cloneCharacterDefinition(definition);
    }

    const profile = getProfileByUserId(user.userId);
    return {
        ...buildUserAvatarAgentDefinition(user, profile, definition.position),
        agentId: definition.agentId,
        position: { ...definition.position },
        walkArea: definition.walkArea ? { ...definition.walkArea } : undefined,
        updatedAt: definition.updatedAt ?? now()
    };
};

const buildSessionExpiry = (): string => {
    return new Date(Date.now() + sessionTtlSeconds * 1000).toISOString();
};

const getUserByIdentity = (identity: VerifiedIdentity): DepartmentUser => {
    const externalKey = createExternalIdentityKey(identity.externalProvider, identity.externalId);
    const existingUserId = getExternalIdentityUserId(externalKey);
    if (existingUserId) {
        const existingUser = getUserRecord(existingUserId);
        if (existingUser) {
            const updatedUser: DepartmentUser = {
                ...existingUser,
                displayName: identity.displayName,
                externalId: identity.externalId,
                email: identity.email,
                organization: identity.organization,
                department: identity.department,
                roles: identity.roles ?? existingUser.roles
            };
            return setUserRecord(updatedUser);
        }
    }

    const userId = createStableUserId(identity);
    const createdUser: DepartmentUser = {
        userId,
        displayName: identity.displayName,
        externalId: identity.externalId,
        email: identity.email,
        organization: identity.organization,
        department: identity.department,
        roles: identity.roles ?? []
    };
    setExternalIdentityUserId(externalKey, userId);
    return setUserRecord(createdUser);
};

export interface SessionContext {
    user: DepartmentUser;
    profile: UserProfile;
    session: AppSession;
}

export const createSessionForVerifiedIdentity = (identity: VerifiedIdentity, clientType: ClientType): SessionContext => {
    const user = getUserByIdentity(identity);
    const profile = getProfileByUserId(user.userId);
    const session: AppSession = {
        sessionId: createSessionId(user.userId),
        userId: user.userId,
        clientType,
        startedAt: now(),
        expiresAt: buildSessionExpiry()
    };
    setSessionRecord(session);

    return { user, profile, session };
};

export const getSessionContext = (sessionId: string | null | undefined): SessionContext | null => {
    if (!sessionId) {
        return null;
    }

    const session = getSessionRecord(sessionId);
    if (!session) {
        return null;
    }

    if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
        deleteSessionRecord(session.sessionId);
        return null;
    }

    const user = getUserRecord(session.userId);
    if (!user) {
        return null;
    }

    const profile = getProfileByUserId(user.userId);
    return { user, profile, session };
};

export const destroySession = (sessionId: string | null | undefined): void => {
    if (!sessionId) {
        return;
    }
    deleteSessionRecord(sessionId);
};

export const buildBootstrapResponseForSession = (sessionContext: SessionContext | null): BootstrapResponse => ({
    authenticated: !!sessionContext,
    user: sessionContext?.user ?? null,
    profile: sessionContext?.profile ?? null,
    session: sessionContext?.session ?? null,
    agents: getCharacterDefinitions(),
    room: {
        roomId: serverConfig.defaultRoomId,
        displayName: serverConfig.defaultRoomDisplayName
    },
    loginUrl: "/auth/login"
});

export const getCurrentProfileForUser = (userId: string): UserProfile => getProfileByUserId(userId);

export const getCurrentUserById = (userId: string): DepartmentUser | null => getUserRecord(userId) ?? null;

export const listCurrentUsers = (): DepartmentUser[] => listUserRecords();

export const getCurrentSessionById = (sessionId: string): AppSession | null => getSessionRecord(sessionId) ?? null;

export const getCharacterDefinitions = (): AgentDefinition[] => ensureSeededCharacters()
    .filter(definition => !definition.ownerUserId)
    .map(definition => cloneCharacterDefinition(definition));

export const getBuiltInEnvironmentAvatarDefinitions = (): AgentDefinition[] => getCharacterDefinitions();

export const getCharacterDefinitionById = (agentId: string): AgentDefinition | undefined => {
    ensureSeededCharacters();
    const record = getCharacterRecord(agentId);
    return record ? hydrateAvatarAgentDefinition(record) : undefined;
};

export const createBuiltInEnvironmentAvatarDefinition = (
    seed: Partial<Pick<AgentDefinition, "displayName" | "spriteIndex" | "position" | "caption" | "defaultSystemPrompt" | "walkArea" | "characterRole" | "spawnByDefault">>
): AgentDefinition => {
    ensureSeededCharacters();
    const displayName = seed.displayName?.trim() || DEFAULT_ENVIRONMENT_AVATAR_DISPLAY_NAME;
    const position = seed.position ? { ...seed.position } : { x: 128, y: 1088 };
    const walkArea = seed.walkArea
        ? { ...seed.walkArea }
        : buildDefaultEnvironmentAvatarWalkArea(position);

    return setCharacterRecord({
        agentId: createEnvironmentAvatarAgentId(displayName),
        displayName,
        spriteIndex: seed.spriteIndex ?? 0,
        position,
        caption: seed.caption?.trim() || DEFAULT_ENVIRONMENT_AVATAR_CAPTION,
        defaultSystemPrompt: seed.defaultSystemPrompt?.trim() || buildDefaultEnvironmentAvatarPrompt(displayName),
        ...buildConfiguredDefaultAgentRoute(),
        walkArea,
        characterRole: seed.characterRole ?? "custom",
        ownerUserId: undefined,
        spawnByDefault: seed.spawnByDefault ?? true,
        updatedAt: now()
    });
};

export const updateBuiltInEnvironmentAvatarDefinition = (character: AgentDefinition): AgentDefinition | null => {
    if (character.ownerUserId) {
        return null;
    }

    const existing = getCharacterRecord(character.agentId);
    if (!existing || existing.ownerUserId) {
        return null;
    }

    return setCharacterRecord({
        ...cloneCharacterDefinition(character),
        ownerUserId: undefined,
        updatedAt: now()
    });
};

export const updateAvatarProfileForUser = (userId: string, spriteIndex: number): UserProfile => {
    const currentProfile = getProfileByUserId(userId);
    const updatedProfile: UserProfile = {
        ...currentProfile,
        avatar: {
            spriteIndex,
            updatedAt: now()
        },
        updatedAt: now()
    };
    return setProfileRecord(updatedProfile);
};

export const updateCharacterSystemPromptForUser = (userId: string, prompt: string): UserProfile => {
    const currentProfile = getProfileByUserId(userId);
    const updatedProfile: UserProfile = {
        ...currentProfile,
        characterSystemPrompt: prompt,
        updatedAt: now()
    };
    return setProfileRecord(updatedProfile);
};

export const updatePreferencesForUser = (userId: string, preferences: Record<string, unknown>): UserProfile => {
    const currentProfile = getProfileByUserId(userId);
    const updatedProfile: UserProfile = {
        ...currentProfile,
        preferences: {
            ...currentProfile.preferences,
            ...preferences
        },
        updatedAt: now()
    };
    return setProfileRecord(updatedProfile);
};

export const createOrUpdateAvatarAgentForUser = (userId: string, position: { x: number; y: number }): AgentDefinition | null => {
    const user = getUserRecord(userId);
    if (!user) {
        return null;
    }

    const profile = getProfileByUserId(userId);
    const definition = buildUserAvatarAgentDefinition(user, profile, position);
    return setCharacterRecord(definition);
};