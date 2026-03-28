import { getStoredMediaDevicePreference } from "../constants";
import { AppLanguage, getCodeFontStack, getUiFontStack, translate } from "../i18n";
import { EditableEnvironmentAvatar } from "../services/environmentAvatarAdmin";
import { ThisIsMyDepartmentApp } from "../ThisIsMyDepartmentApp";
import type { CurrentUser, CurrentUserAiHostingProfile, CurrentUserPublicPersona } from "../types/currentUser";

type SettingsTabId = "media" | "language" | "character" | "ai-prompt" | "environment-avatars";
type MediaDeviceKind = "audioinput" | "audiooutput" | "videoinput";
type EnvironmentAvatarPlacementMode = "position" | "walk-area";

const createEmptyAiHostingProfile = (): CurrentUserAiHostingProfile => ({
    enabled: true,
    coreIdentity: "",
    speakingStyle: "",
    interactionGoals: "",
    relationshipGuidance: "",
    boundaries: "",
    additionalInstructions: ""
});

interface EnvironmentAvatarPlacementResult {
    position?: { x: number; y: number };
    walkArea?: { x: number; y: number; width: number; height: number };
}

interface MediaDeviceOption {
    deviceId: string;
    kind: MediaDeviceKind;
    label: string;
}

interface SettingsOverlayOpenArgs {
    initialTab?: SettingsTabId;
    currentUser?: CurrentUser;
    initialLanguage: AppLanguage;
    initialSpriteIndex: number;
    initialPublicPersona?: CurrentUserPublicPersona;
    initialAiHosting?: CurrentUserAiHostingProfile;
    initialAudioEnabled: boolean;
    initialVideoEnabled: boolean;
    canManageEnvironmentAvatars?: boolean;
    getMediaDevices: () => Promise<MediaDeviceOption[]>;
    onAvatarSave: (spriteIndex: number) => Promise<void>;
    onPublicPersonaSave: (publicPersona: CurrentUserPublicPersona) => Promise<void>;
    onAiHostingSave: (aiHosting: CurrentUserAiHostingProfile) => Promise<void>;
    onLanguageSave: (language: AppLanguage) => Promise<void>;
    loadEnvironmentAvatars?: () => Promise<EditableEnvironmentAvatar[]>;
    onEnvironmentAvatarCreate?: (seed?: Partial<EditableEnvironmentAvatar>) => Promise<EditableEnvironmentAvatar>;
    onEnvironmentAvatarSave?: (avatar: EditableEnvironmentAvatar) => Promise<EditableEnvironmentAvatar>;
    onEnvironmentAvatarDelete?: (agentId: string) => Promise<void>;
    onEnvironmentAvatarPlacementStart?: (avatar: EditableEnvironmentAvatar, mode: EnvironmentAvatarPlacementMode) => Promise<EnvironmentAvatarPlacementResult | null>;
    onEnvironmentAvatarPlacementCancel?: () => void;
    onMediaToggle: (kind: Extract<MediaDeviceKind, "audioinput" | "videoinput">, enabled: boolean) => Promise<boolean> | boolean;
    onMediaDeviceChange: (kind: MediaDeviceKind, deviceId: string) => Promise<void> | void;
}

const OVERLAY_Z_INDEX = "10000";

export class SettingsOverlay {
    private backdrop?: HTMLDivElement;
    private panel?: HTMLDivElement;
    private sidebar?: HTMLDivElement;
    private content?: HTMLDivElement;
    private sidebarTitle?: HTMLDivElement;
    private sidebarSubtitle?: HTMLParagraphElement;
    private closeButton?: HTMLButtonElement;
    private mediaStatus?: HTMLDivElement;
    private languageStatus?: HTMLDivElement;
    private characterStatus?: HTMLDivElement;
    private promptStatus?: HTMLDivElement;
    private activeTab: SettingsTabId = "media";
    private language: AppLanguage = "en";
    private selectedLanguage: AppLanguage = "en";
    private currentArgs?: SettingsOverlayOpenArgs;
    private detachKeydown?: () => void;
    private selectedSpriteIndex = 0;
    private publicPersonaValue: CurrentUserPublicPersona = { additionalDescription: "" };
    private aiHostingValue: CurrentUserAiHostingProfile = createEmptyAiHostingProfile();
    private busy = false;
    private environmentAvatarLoading = false;
    private environmentAvatarLoaded = false;
    private environmentAvatarError: string | null = null;
    private environmentAvatarDrafts: EditableEnvironmentAvatar[] = [];
    private environmentAvatarStatuses = new Map<string, string>();
    private environmentAvatarToolbarStatus: string | null = null;
    private selectedEnvironmentAvatarId: string | null = null;
    private environmentPlacementMode: EnvironmentAvatarPlacementMode | null = null;
    private environmentToast?: HTMLDivElement;
    private environmentToastTimeoutId: number | null = null;
    private avatarPreviewCanvases: HTMLCanvasElement[] = [];
    private mediaState = {
        audioEnabled: false,
        videoEnabled: false
    };

    public open(args: SettingsOverlayOpenArgs): void {
        this.close();
        this.currentArgs = args;
        this.activeTab = this.getAvailableTabs(args).includes(args.initialTab ?? "media") ? (args.initialTab ?? "media") : "media";
        this.language = args.initialLanguage;
        this.selectedLanguage = args.initialLanguage;
        this.selectedSpriteIndex = args.initialSpriteIndex;
        this.publicPersonaValue = {
            additionalDescription: args.initialPublicPersona?.additionalDescription ?? ""
        };
        this.aiHostingValue = {
            ...createEmptyAiHostingProfile(),
            ...(args.initialAiHosting ?? {})
        };
        this.environmentAvatarLoading = false;
        this.environmentAvatarLoaded = false;
        this.environmentAvatarError = null;
        this.environmentAvatarDrafts = [];
        this.environmentAvatarStatuses.clear();
        this.environmentAvatarToolbarStatus = null;
        this.selectedEnvironmentAvatarId = null;
        this.environmentPlacementMode = null;
        this.clearEnvironmentToast();
        this.mediaState = {
            audioEnabled: args.initialAudioEnabled,
            videoEnabled: args.initialVideoEnabled
        };

        const backdrop = document.createElement("div");
        backdrop.style.position = "fixed";
        backdrop.style.top = "0";
        backdrop.style.right = "0";
        backdrop.style.bottom = "0";
        backdrop.style.left = "0";
        backdrop.style.display = "flex";
        backdrop.style.alignItems = "center";
        backdrop.style.justifyContent = "center";
        backdrop.style.padding = "20px";
        backdrop.style.background = "rgba(6, 10, 18, 0.72)";
        backdrop.style.setProperty("backdrop-filter", "blur(10px)");
        backdrop.style.zIndex = OVERLAY_Z_INDEX;

        const panel = document.createElement("div");
        panel.style.width = "min(980px, calc(100vw - 32px))";
        panel.style.height = "calc(100vh - 32px)";
        panel.style.maxHeight = "calc(100vh - 32px)";
        panel.style.display = "grid";
        panel.style.gridTemplateColumns = "220px minmax(0, 1fr)";
        panel.style.minHeight = "0";
        panel.style.overflow = "hidden";
        panel.style.borderRadius = "22px";
        panel.style.border = "1px solid rgba(164, 190, 255, 0.26)";
        panel.style.background = "linear-gradient(160deg, rgba(22, 29, 44, 0.98), rgba(11, 16, 26, 0.98))";
        panel.style.boxShadow = "0 28px 90px rgba(0, 0, 0, 0.45)";
        panel.style.color = "#eef3ff";
        panel.style.fontFamily = getUiFontStack(this.language);

        const sidebar = document.createElement("div");
        sidebar.style.minHeight = "0";
        sidebar.style.padding = "24px 18px";
        sidebar.style.background = "linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01))";
        sidebar.style.borderRight = "1px solid rgba(164, 190, 255, 0.12)";
        sidebar.style.overflowY = "auto";
        sidebar.style.overflowX = "hidden";
        sidebar.style.overscrollBehavior = "contain";
        sidebar.style.setProperty("scrollbar-gutter", "stable");

        const title = document.createElement("div");
        title.textContent = this.t("settings.sidebarTitle");
        title.style.fontSize = "28px";
        title.style.fontWeight = "700";
        title.style.letterSpacing = "0.02em";
        this.sidebarTitle = title;

        const subtitle = document.createElement("p");
        subtitle.textContent = this.t("settings.sidebarSubtitle");
        subtitle.style.margin = "10px 0 18px";
        subtitle.style.fontSize = "14px";
        subtitle.style.lineHeight = "1.5";
        subtitle.style.color = "#c3d1f3";
        this.sidebarSubtitle = subtitle;

        const tabList = document.createElement("div");
        tabList.style.display = "grid";
        tabList.style.gap = "10px";

        this.getAvailableTabs(args).forEach(tabId => {
            const tabButton = document.createElement("button");
            tabButton.type = "button";
            tabButton.textContent = this.getTabLabel(tabId);
            tabButton.style.border = "1px solid rgba(164, 190, 255, 0.18)";
            tabButton.style.borderRadius = "14px";
            tabButton.style.padding = "14px 16px";
            tabButton.style.textAlign = "left";
            tabButton.style.cursor = "pointer";
            tabButton.style.font = `600 15px ${getUiFontStack(this.language)}`;
            tabButton.style.color = "#eef3ff";
            tabButton.style.background = tabId === this.activeTab
                ? "linear-gradient(135deg, rgba(72, 126, 255, 0.34), rgba(35, 86, 204, 0.22))"
                : "rgba(255, 255, 255, 0.04)";
            tabButton.onclick = () => {
                if (this.busy || !this.currentArgs) {
                    return;
                }
                this.activeTab = tabId;
                this.renderContent();
                this.refreshTabButtonStates();
                if (tabId === "environment-avatars") {
                    void this.ensureEnvironmentAvatarsLoaded();
                }
            };
            tabButton.dataset.settingsTab = tabId;
            tabList.appendChild(tabButton);
        });

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.textContent = this.t("common.close");
        closeButton.style.marginTop = "18px";
        closeButton.style.border = "1px solid rgba(164, 190, 255, 0.18)";
        closeButton.style.borderRadius = "14px";
        closeButton.style.padding = "12px 16px";
        closeButton.style.cursor = "pointer";
        closeButton.style.font = `600 14px ${getUiFontStack(this.language)}`;
        closeButton.style.background = "rgba(255, 255, 255, 0.05)";
        closeButton.style.color = "#eef3ff";
        closeButton.onclick = () => {
            if (!this.busy) {
                this.close();
            }
        };
        this.closeButton = closeButton;

        const content = document.createElement("div");
        content.style.minHeight = "0";
        content.style.height = "100%";
        content.style.maxHeight = "100%";
        content.style.padding = "28px";
        content.style.overflowY = "scroll";
        content.style.overflowX = "hidden";
        content.style.overscrollBehavior = "contain";
        content.style.setProperty("-webkit-overflow-scrolling", "touch");
        content.style.setProperty("scrollbar-gutter", "stable both-edges");

        const stopWheelPropagation = (event: WheelEvent): void => {
            event.stopPropagation();
        };
        sidebar.addEventListener("wheel", stopWheelPropagation, { passive: true });
        content.addEventListener("wheel", stopWheelPropagation, { passive: true });

        // Block keyboard events from reaching the game's Keyboard handler while
        // the settings panel is open, so typing in text fields does not move the
        // player character.
        const stopKeyPropagation = (event: KeyboardEvent): void => {
            event.stopPropagation();
        };
        panel.addEventListener("keydown", stopKeyPropagation);
        panel.addEventListener("keyup", stopKeyPropagation);
        panel.addEventListener("keypress", stopKeyPropagation);

        sidebar.appendChild(title);
        sidebar.appendChild(subtitle);
        sidebar.appendChild(tabList);
        sidebar.appendChild(closeButton);
        panel.appendChild(sidebar);
        panel.appendChild(content);
        backdrop.appendChild(panel);
        document.body.appendChild(backdrop);

        backdrop.onclick = event => {
            if (event.target === backdrop && !this.busy) {
                this.close();
            }
        };

        this.backdrop = backdrop;
        this.panel = panel;
        this.sidebar = sidebar;
        this.content = content;
        this.detachKeydown = this.attachEscapeListener();
        this.renderContent();
        this.refreshTabButtonStates();
    }

    public close(): void {
        if (this.environmentPlacementMode) {
            this.currentArgs?.onEnvironmentAvatarPlacementCancel?.();
        }
        this.detachKeydown?.();
        this.detachKeydown = undefined;
        this.backdrop?.remove();
        this.backdrop = undefined;
        this.panel = undefined;
        this.sidebar = undefined;
        this.content = undefined;
        this.mediaStatus = undefined;
        this.characterStatus = undefined;
        this.promptStatus = undefined;
        this.currentArgs = undefined;
        this.busy = false;
        this.environmentAvatarLoading = false;
        this.environmentAvatarLoaded = false;
        this.environmentAvatarError = null;
        this.environmentAvatarDrafts = [];
        this.environmentAvatarStatuses.clear();
        this.environmentAvatarToolbarStatus = null;
        this.selectedEnvironmentAvatarId = null;
        this.environmentPlacementMode = null;
        this.clearEnvironmentToast();
        this.avatarPreviewCanvases = [];
        this.mediaState = {
            audioEnabled: false,
            videoEnabled: false
        };
        this.sidebarTitle = undefined;
        this.sidebarSubtitle = undefined;
        this.closeButton = undefined;
        this.languageStatus = undefined;
    }

    private attachEscapeListener(): () => void {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape" && this.environmentPlacementMode) {
                event.preventDefault();
                this.currentArgs?.onEnvironmentAvatarPlacementCancel?.();
                return;
            }
            if (event.key === "Escape" && !this.busy) {
                event.preventDefault();
                this.close();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }

    private renderContent(): void {
        if (!this.content || !this.currentArgs) {
            return;
        }

        this.applyPlacementLayout(!!this.environmentPlacementMode);

        this.content.innerHTML = "";
        this.mediaStatus = undefined;
        this.languageStatus = undefined;
        this.characterStatus = undefined;
        this.promptStatus = undefined;

        if (this.environmentPlacementMode) {
            this.renderPlacementModeContent();
            return;
        }

        const header = document.createElement("div");
        header.style.marginBottom = "22px";

        const title = document.createElement("h2");
        title.textContent = this.getTabLabel(this.activeTab);
        title.style.margin = "0 0 8px";
        title.style.fontSize = "26px";

        const description = document.createElement("p");
        description.textContent = this.getTabDescription(this.activeTab);
        description.style.margin = "0";
        description.style.color = "#c3d1f3";
        description.style.lineHeight = "1.6";

        header.appendChild(title);
        header.appendChild(description);
        this.content.appendChild(header);

        if (this.activeTab === "media") {
            void this.renderMediaTab();
            return;
        }

        if (this.activeTab === "character") {
            this.renderCharacterTab();
            return;
        }

        if (this.activeTab === "language") {
            this.renderLanguageTab();
            return;
        }

        if (this.activeTab === "environment-avatars") {
            this.renderEnvironmentAvatarTab();
            return;
        }

        this.renderPromptTab();
    }

    private renderPlacementModeContent(): void {
        if (!this.content) {
            return;
        }

        const card = this.createCard();
        card.style.padding = "22px";
        card.style.background = "rgba(20, 24, 34, 0.92)";
        card.style.border = "1px solid rgba(255, 214, 140, 0.28)";

        const help = document.createElement("div");
        help.textContent = this.getPlacementHelpText();
        help.style.color = "#fff0ca";
        help.style.fontSize = "14px";
        help.style.lineHeight = "1.6";
        help.style.whiteSpace = "pre-line";
        help.style.marginBottom = "18px";

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "flex-start";

        const cancelPlacementButton = this.createActionButton(this.t("settings.environment.cancelPlacement"), "rgba(255, 214, 140, 0.16)", "#fff3d6");
        cancelPlacementButton.dataset.allowWhilePlacement = "true";
        cancelPlacementButton.onclick = () => {
            this.currentArgs?.onEnvironmentAvatarPlacementCancel?.();
        };

        actions.appendChild(cancelPlacementButton);
        card.appendChild(help);
        card.appendChild(actions);
        this.content.appendChild(card);
    }

    private getPlacementHelpText(): string {
        const helpText = this.t(
            this.environmentPlacementMode === "position"
                ? "settings.environment.positionPlacementHelp"
                : "settings.environment.walkPlacementHelp"
        );
        if (this.environmentPlacementMode !== "walk-area") {
            return helpText;
        }
        return [
            helpText,
            this.t("settings.environment.walkPlacementLegendCurrent"),
            this.t("settings.environment.walkPlacementLegendPending")
        ].join("\n");
    }

    private getAvailableTabs(args: SettingsOverlayOpenArgs = this.currentArgs!): SettingsTabId[] {
        const tabs: SettingsTabId[] = ["media", "language", "character", "ai-prompt"];
        if (args?.canManageEnvironmentAvatars) {
            tabs.push("environment-avatars");
        }
        return tabs;
    }

    private async ensureEnvironmentAvatarsLoaded(): Promise<void> {
        if (!this.currentArgs?.canManageEnvironmentAvatars || !this.currentArgs.loadEnvironmentAvatars) {
            return;
        }
        if (this.environmentAvatarLoaded || this.environmentAvatarLoading) {
            return;
        }

        this.environmentAvatarLoading = true;
        this.environmentAvatarError = null;

        try {
            this.environmentAvatarDrafts = await this.currentArgs.loadEnvironmentAvatars();
            this.environmentAvatarLoaded = true;
            this.ensureSelectedEnvironmentAvatar();
        } catch (error) {
            this.environmentAvatarError = error instanceof Error ? error.message : this.t("settings.environment.failedLoad");
        } finally {
            this.environmentAvatarLoading = false;
            this.renderContent();
        }
    }

    private async renderMediaTab(): Promise<void> {
        if (!this.content || !this.currentArgs) {
            return;
        }

        const card = this.createCard();
        const intro = document.createElement("p");
        intro.textContent = this.t("settings.media.intro");
        intro.style.margin = "0 0 18px";
        intro.style.color = "#cbd5f5";
        intro.style.lineHeight = "1.6";
        card.appendChild(intro);

        const status = document.createElement("div");
        status.style.minHeight = "22px";
        status.style.marginBottom = "14px";
        status.style.color = "#d7e2ff";
        status.style.fontSize = "13px";
        this.mediaStatus = status;
        card.appendChild(status);

        const loading = document.createElement("div");
        loading.textContent = this.t("settings.media.loading");
        loading.style.color = "#d7e2ff";
        card.appendChild(loading);
        this.content.appendChild(card);

        try {
            const devices = await this.currentArgs.getMediaDevices();
            loading.remove();

            const groups: Record<MediaDeviceKind, MediaDeviceOption[]> = {
                audioinput: devices.filter(device => device.kind === "audioinput"),
                audiooutput: devices.filter(device => device.kind === "audiooutput"),
                videoinput: devices.filter(device => device.kind === "videoinput")
            };

            card.appendChild(this.createMediaToggleField(
                "videoinput",
                this.mediaState.videoEnabled,
                async (enabled: boolean) => {
                    const nextState = await this.currentArgs!.onMediaToggle("videoinput", enabled);
                    this.mediaState.videoEnabled = nextState;
                }
            ));
            if (this.mediaState.videoEnabled) {
                card.appendChild(this.createMediaField("videoinput", groups.videoinput));
            }

            card.appendChild(this.createMediaToggleField(
                "audioinput",
                this.mediaState.audioEnabled,
                async (enabled: boolean) => {
                    const nextState = await this.currentArgs!.onMediaToggle("audioinput", enabled);
                    this.mediaState.audioEnabled = nextState;
                }
            ));
            if (this.mediaState.audioEnabled) {
                card.appendChild(this.createMediaField("audioinput", groups.audioinput));
            }

            card.appendChild(this.createMediaField("audiooutput", groups.audiooutput));

            const refreshButton = this.createActionButton(this.t("settings.media.refresh"), "rgba(255, 255, 255, 0.06)", "#eef3ff");
            refreshButton.onclick = () => {
                if (this.busy) {
                    return;
                }
                this.renderContent();
            };
            card.appendChild(refreshButton);
        } catch (error) {
            loading.textContent = error instanceof Error ? error.message : this.t("settings.media.loadFailed");
            loading.style.color = "#ffd0c7";
        }
    }

    private createMediaToggleField(
        kind: Extract<MediaDeviceKind, "audioinput" | "videoinput">,
        enabled: boolean,
        onToggle: (enabled: boolean) => Promise<void>
    ): HTMLDivElement {
        const field = document.createElement("div");
        field.style.display = "grid";
        field.style.gap = "8px";
        field.style.marginBottom = "18px";

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.alignItems = "center";
        header.style.justifyContent = "space-between";
        header.style.gap = "12px";
        header.style.flexWrap = "wrap";

        const labelWrap = document.createElement("div");
        labelWrap.style.display = "grid";
        labelWrap.style.gap = "4px";

        const label = document.createElement("div");
        label.textContent = this.getDeviceKindLabel(kind);
        label.style.fontWeight = "600";
        label.style.fontSize = "14px";

        const helper = document.createElement("div");
        helper.textContent = enabled
            ? this.t("settings.media.helper.enabled", { device: this.getDeviceKindLabel(kind).toLowerCase() })
            : this.t(`settings.media.helper.enable.${kind}`);
        helper.style.fontSize = "13px";
        helper.style.color = "#bac7e8";

        const toggleButton = this.createActionButton(
            enabled ? this.t("settings.media.toggle.off") : this.t("settings.media.toggle.on"),
            enabled ? "rgba(72, 126, 255, 0.26)" : "rgba(255, 255, 255, 0.06)",
            "#eef3ff"
        );
        toggleButton.onclick = async () => {
            if (!this.currentArgs || this.busy) {
                return;
            }

            this.busy = true;
            this.updateDisabledState();
            if (this.mediaStatus) {
                this.mediaStatus.textContent = this.t(
                    enabled ? "settings.media.disabling" : "settings.media.enabling",
                    { device: this.getDeviceKindLabel(kind).toLowerCase() }
                );
            }

            try {
                await onToggle(!enabled);
                this.busy = false;
                this.renderContent();
                this.updateDisabledState();
                if (this.mediaStatus) {
                    this.mediaStatus.textContent = this.t(
                        !enabled ? "settings.media.enabled" : "settings.media.disabled",
                        { device: this.getDeviceKindLabel(kind) }
                    );
                }
            } catch (error) {
                if (this.mediaStatus) {
                    this.mediaStatus.textContent = error instanceof Error
                        ? error.message
                        : this.t("settings.media.toggleFailed", { device: this.getDeviceKindLabel(kind) });
                }
                this.busy = false;
                this.updateDisabledState();
            }
        };

        labelWrap.appendChild(label);
        labelWrap.appendChild(helper);
        header.appendChild(labelWrap);
        header.appendChild(toggleButton);
        field.appendChild(header);

        if (!enabled) {
            const disabledState = document.createElement("div");
            disabledState.textContent = this.t(`settings.media.hidden.${kind}`);
            disabledState.style.padding = "12px 14px";
            disabledState.style.borderRadius = "12px";
            disabledState.style.border = "1px dashed rgba(164, 190, 255, 0.18)";
            disabledState.style.background = "rgba(8, 12, 20, 0.46)";
            disabledState.style.color = "#9fb0d8";
            disabledState.style.fontSize = "13px";
            field.appendChild(disabledState);
        }

        return field;
    }

    private createMediaField(kind: MediaDeviceKind, devices: MediaDeviceOption[]): HTMLDivElement {
        const field = document.createElement("div");
        field.style.display = "grid";
        field.style.gap = "8px";
        field.style.marginBottom = "18px";
        const supportsAudioOutputSelection = this.supportsAudioOutputSelection();
        const audioOutputUnsupported = kind === "audiooutput" && !supportsAudioOutputSelection;

        const label = document.createElement("label");
        label.textContent = this.getDeviceKindLabel(kind);
        label.style.fontWeight = "600";
        label.style.fontSize = "14px";

        const helper = document.createElement("div");
        helper.textContent = kind === "audiooutput"
            ? this.t(audioOutputUnsupported ? "settings.media.helper.audiooutputUnsupported" : "settings.media.helper.audiooutput")
            : this.t("settings.media.helper.default", { device: this.getDeviceKindLabel(kind).toLowerCase() });
        helper.style.fontSize = "13px";
        helper.style.color = "#bac7e8";

        const select = document.createElement("select");
        select.disabled = this.busy || devices.length === 0 || audioOutputUnsupported;
        select.style.width = "100%";
        select.style.padding = "12px 14px";
        select.style.borderRadius = "12px";
        select.style.border = "1px solid rgba(164, 190, 255, 0.2)";
        select.style.background = "rgba(8, 12, 20, 0.72)";
        select.style.color = "#eef3ff";
        select.style.font = `14px ${getUiFontStack(this.language)}`;

        if (devices.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = this.t(audioOutputUnsupported ? "settings.media.noAudioOutputSupport" : "settings.media.noDevices");
            select.appendChild(option);
        } else {
            const selectedDeviceId = getStoredMediaDevicePreference(localStorage, this.mapDeviceKindToPreferenceKey(kind));
            devices.forEach(device => {
                const option = document.createElement("option");
                option.value = device.deviceId;
                option.textContent = device.label;
                option.selected = device.deviceId === selectedDeviceId;
                select.appendChild(option);
            });
            if (!selectedDeviceId && select.options.length > 0) {
                select.options[0].selected = true;
            }
        }

        select.onchange = async () => {
            if (!this.currentArgs || !select.value) {
                return;
            }
            this.busy = true;
            this.updateDisabledState();
            if (this.mediaStatus) {
                this.mediaStatus.textContent = this.t("settings.media.applying", { device: this.getDeviceKindLabel(kind).toLowerCase() });
            }
            try {
                await this.currentArgs.onMediaDeviceChange(kind, select.value);
                if (this.mediaStatus) {
                    this.mediaStatus.textContent = this.t("settings.media.updated", { device: this.getDeviceKindLabel(kind) });
                }
            } catch (error) {
                if (this.mediaStatus) {
                    this.mediaStatus.textContent = error instanceof Error ? error.message : this.t("settings.media.updateFailed", { device: this.getDeviceKindLabel(kind) });
                }
            } finally {
                this.busy = false;
                this.updateDisabledState();
            }
        };

        field.appendChild(label);
        field.appendChild(helper);
        field.appendChild(select);
        return field;
    }

    private supportsAudioOutputSelection(): boolean {
        return typeof HTMLMediaElement !== "undefined"
            && "setSinkId" in HTMLMediaElement.prototype;
    }

    private renderLanguageTab(): void {
        if (!this.content || !this.currentArgs) {
            return;
        }

        const card = this.createCard();
        const intro = document.createElement("p");
        intro.textContent = this.t("settings.language.intro");
        intro.style.margin = "0 0 18px";
        intro.style.color = "#cbd5f5";
        intro.style.lineHeight = "1.6";
        card.appendChild(intro);

        const field = document.createElement("div");
        field.style.display = "grid";
        field.style.gap = "8px";

        const label = document.createElement("label");
        label.textContent = this.t("settings.language.label");
        label.style.fontWeight = "600";
        label.style.fontSize = "14px";

        const helper = document.createElement("div");
        helper.textContent = this.t("settings.language.helper");
        helper.style.fontSize = "13px";
        helper.style.color = "#bac7e8";

        const select = document.createElement("select");
        select.style.width = "100%";
        select.style.padding = "12px 14px";
        select.style.borderRadius = "12px";
        select.style.border = "1px solid rgba(164, 190, 255, 0.2)";
        select.style.background = "rgba(8, 12, 20, 0.72)";
        select.style.color = "#eef3ff";
        select.style.font = `14px ${getUiFontStack(this.language)}`;
        (["en", "zh"] as AppLanguage[]).forEach(language => {
            const option = document.createElement("option");
            option.value = language;
            option.textContent = this.t(`language.option.${language}`);
            select.appendChild(option);
        });
        select.value = this.selectedLanguage;
        select.onchange = () => {
            this.selectedLanguage = select.value as AppLanguage;
        };

        field.appendChild(label);
        field.appendChild(helper);
        field.appendChild(select);
        card.appendChild(field);

        const status = document.createElement("div");
        status.style.minHeight = "22px";
        status.style.margin = "18px 0 0";
        status.style.color = "#d7e2ff";
        status.style.fontSize = "13px";
        this.languageStatus = status;
        card.appendChild(status);

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "10px";
        actions.style.marginTop = "18px";

        const saveButton = this.createActionButton(this.t("settings.language.save"), "rgba(72, 126, 255, 0.26)", "#eef3ff");
        saveButton.onclick = async () => {
            if (!this.currentArgs || this.busy) {
                return;
            }
            this.busy = true;
            this.updateDisabledState();
            if (this.languageStatus) {
                this.languageStatus.textContent = this.t("settings.language.saving");
            }
            try {
                await this.currentArgs.onLanguageSave(this.selectedLanguage);
                this.applyOverlayLanguage(this.selectedLanguage);
                if (this.languageStatus) {
                    this.languageStatus.textContent = this.t("settings.language.saved");
                }
            } catch (error) {
                if (this.languageStatus) {
                    this.languageStatus.textContent = error instanceof Error ? error.message : this.t("settings.language.failed");
                }
            } finally {
                this.busy = false;
                this.updateDisabledState();
            }
        };

        actions.appendChild(saveButton);
        card.appendChild(actions);
        this.content.appendChild(card);
    }

    private renderCharacterTab(): void {
        if (!this.content || !this.currentArgs) {
            return;
        }

        const card = this.createCard();
        const intro = document.createElement("p");
        intro.textContent = this.t("settings.character.intro");
        intro.style.margin = "0 0 18px";
        intro.style.color = "#cbd5f5";
        intro.style.lineHeight = "1.6";
        card.appendChild(intro);

        const grid = document.createElement("div");
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(150px, 1fr))";
        grid.style.gap = "12px";
        this.avatarPreviewCanvases = [];

        for (let spriteIndex = 0; spriteIndex < 8; spriteIndex += 1) {
            const cardButton = document.createElement("button");
            cardButton.type = "button";
            cardButton.style.minHeight = "150px";
            cardButton.style.borderRadius = "16px";
            cardButton.style.padding = "12px";
            cardButton.style.border = spriteIndex === this.selectedSpriteIndex
                ? "1px solid rgba(127, 177, 255, 0.82)"
                : "1px solid rgba(164, 190, 255, 0.18)";
            cardButton.style.background = spriteIndex === this.selectedSpriteIndex
                ? "linear-gradient(135deg, rgba(69, 119, 255, 0.28), rgba(31, 69, 180, 0.22))"
                : "linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03))";
            cardButton.style.color = "#eef3ff";
            cardButton.style.cursor = "pointer";
            cardButton.style.display = "grid";
            cardButton.style.gridTemplateRows = "1fr auto";
            cardButton.style.gap = "10px";

            const previewFrame = document.createElement("div");
            previewFrame.style.display = "flex";
            previewFrame.style.alignItems = "center";
            previewFrame.style.justifyContent = "center";
            previewFrame.style.borderRadius = "12px";
            previewFrame.style.border = "1px solid rgba(164, 190, 255, 0.16)";
            previewFrame.style.background = "radial-gradient(circle at 50% 35%, rgba(105, 134, 230, 0.18), rgba(10, 14, 26, 0.78) 72%)";
            previewFrame.style.minHeight = "100px";

            const previewCanvas = document.createElement("canvas");
            previewCanvas.width = 84;
            previewCanvas.height = 84;
            previewCanvas.style.width = "84px";
            previewCanvas.style.height = "84px";
            previewCanvas.style.display = "block";
            previewCanvas.style.imageRendering = "pixelated";
            this.avatarPreviewCanvases.push(previewCanvas);
            this.drawAvatarPreview(previewCanvas, spriteIndex);
            previewFrame.appendChild(previewCanvas);

            const caption = document.createElement("div");
            caption.textContent = this.t("settings.character.avatar", { index: spriteIndex + 1 });
            caption.style.font = `600 14px ${getUiFontStack(this.language)}`;
            caption.style.letterSpacing = "0.02em";

            cardButton.onclick = () => {
                if (this.busy) {
                    return;
                }
                this.selectedSpriteIndex = spriteIndex;
                this.renderContent();
                this.refreshTabButtonStates();
            };
            cardButton.appendChild(previewFrame);
            cardButton.appendChild(caption);
            grid.appendChild(cardButton);
        }

        const status = document.createElement("div");
        status.style.minHeight = "22px";
        status.style.margin = "18px 0 0";
        status.style.color = "#d7e2ff";
        status.style.fontSize = "13px";
        this.characterStatus = status;

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "10px";
        actions.style.marginTop = "18px";
        actions.style.flexWrap = "wrap";

        const saveButton = this.createActionButton(this.t("settings.character.save"), "rgba(72, 126, 255, 0.26)", "#eef3ff");
        saveButton.onclick = async () => {
            if (!this.currentArgs || this.busy) {
                return;
            }
            this.busy = true;
            this.updateDisabledState();
            if (this.characterStatus) {
                this.characterStatus.textContent = this.t("settings.character.saving");
            }
            try {
                await this.currentArgs.onAvatarSave(this.selectedSpriteIndex);
                if (this.characterStatus) {
                    this.characterStatus.textContent = this.t("settings.character.saved");
                }
            } catch (error) {
                if (this.characterStatus) {
                    this.characterStatus.textContent = error instanceof Error ? error.message : this.t("settings.character.failed");
                }
            } finally {
                this.busy = false;
                this.updateDisabledState();
            }
        };

        actions.appendChild(saveButton);
        card.appendChild(grid);

        const identitySection = document.createElement("div");
        identitySection.style.display = "grid";
        identitySection.style.gap = "12px";
        identitySection.style.marginTop = "22px";
        identitySection.style.padding = "18px";
        identitySection.style.borderRadius = "16px";
        identitySection.style.border = "1px solid rgba(164, 190, 255, 0.14)";
        identitySection.style.background = "rgba(8, 12, 20, 0.28)";

        const identityTitle = document.createElement("div");
        identityTitle.textContent = this.t("settings.character.identityTitle");
        identityTitle.style.font = `700 16px ${getUiFontStack(this.language)}`;
        identitySection.appendChild(identityTitle);

        const identityHelp = document.createElement("div");
        identityHelp.textContent = this.t("settings.character.identityHelp");
        identityHelp.style.color = "#cbd5f5";
        identityHelp.style.lineHeight = "1.6";
        identitySection.appendChild(identityHelp);

        const identityGrid = document.createElement("div");
        identityGrid.style.display = "grid";
        identityGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
        identityGrid.style.gap = "10px";

        identityGrid.appendChild(this.createIdentityFactCard(
            this.t("settings.character.identityName"),
            this.currentArgs.currentUser?.displayName ?? this.t("status.unavailable")
        ));
        identityGrid.appendChild(this.createIdentityFactCard(
            this.t("settings.character.identityOrganization"),
            this.currentArgs.currentUser?.organization ?? this.t("status.defaultAffiliation")
        ));
        identityGrid.appendChild(this.createIdentityFactCard(
            this.t("settings.character.identityDepartment"),
            this.currentArgs.currentUser?.department ?? this.t("status.defaultAffiliation")
        ));
        identityGrid.appendChild(this.createIdentityFactCard(
            this.t("settings.character.identityRoles"),
            this.currentArgs.currentUser?.roles?.length ? this.currentArgs.currentUser.roles.join(", ") : this.t("status.defaultRole")
        ));
        identitySection.appendChild(identityGrid);

        const descriptionLabel = document.createElement("label");
        descriptionLabel.textContent = this.t("settings.character.additionalDescription");
        descriptionLabel.style.font = `600 13px ${getUiFontStack(this.language)}`;
        descriptionLabel.style.color = "#eef3ff";
        identitySection.appendChild(descriptionLabel);

        const descriptionArea = document.createElement("textarea");
        descriptionArea.value = this.publicPersonaValue.additionalDescription ?? "";
        descriptionArea.rows = 5;
        descriptionArea.placeholder = this.t("settings.character.additionalDescriptionPlaceholder");
        descriptionArea.style.width = "100%";
        descriptionArea.style.boxSizing = "border-box";
        descriptionArea.style.padding = "14px";
        descriptionArea.style.borderRadius = "14px";
        descriptionArea.style.border = "1px solid rgba(164, 190, 255, 0.2)";
        descriptionArea.style.background = "rgba(8, 12, 20, 0.72)";
        descriptionArea.style.color = "#eef3ff";
        descriptionArea.style.font = `14px/1.6 ${getCodeFontStack(this.language)}`;
        descriptionArea.style.resize = "vertical";
        descriptionArea.oninput = () => {
            this.publicPersonaValue = {
                additionalDescription: descriptionArea.value
            };
        };
        identitySection.appendChild(descriptionArea);

        const identityActions = document.createElement("div");
        identityActions.style.display = "flex";
        identityActions.style.gap = "10px";
        identityActions.style.flexWrap = "wrap";

        const saveIdentityButton = this.createActionButton(this.t("settings.character.saveIdentity"), "rgba(72, 126, 255, 0.26)", "#eef3ff");
        saveIdentityButton.onclick = async () => {
            if (!this.currentArgs || this.busy) {
                return;
            }
            this.busy = true;
            this.updateDisabledState();
            if (this.characterStatus) {
                this.characterStatus.textContent = this.t("settings.character.savingIdentity");
            }
            try {
                await this.currentArgs.onPublicPersonaSave({
                    additionalDescription: (this.publicPersonaValue.additionalDescription ?? "").trim()
                });
                if (this.characterStatus) {
                    this.characterStatus.textContent = this.t("settings.character.identitySaved");
                }
            } catch (error) {
                if (this.characterStatus) {
                    this.characterStatus.textContent = error instanceof Error ? error.message : this.t("settings.character.failedIdentity");
                }
            } finally {
                this.busy = false;
                this.updateDisabledState();
            }
        };
        identityActions.appendChild(saveIdentityButton);
        identitySection.appendChild(identityActions);

        card.appendChild(identitySection);
        card.appendChild(status);
        card.appendChild(actions);
        this.content.appendChild(card);
    }

    private renderPromptTab(): void {
        if (!this.content || !this.currentArgs) {
            return;
        }

        const card = this.createCard();
        const intro = document.createElement("p");
        intro.textContent = this.t("settings.prompt.intro");
        intro.style.margin = "0 0 16px";
        intro.style.color = "#cbd5f5";
        intro.style.lineHeight = "1.6";
        card.appendChild(intro);

        const enabledRow = document.createElement("label");
        enabledRow.style.display = "flex";
        enabledRow.style.alignItems = "flex-start";
        enabledRow.style.gap = "12px";
        enabledRow.style.marginBottom = "16px";
        enabledRow.style.padding = "14px 16px";
        enabledRow.style.borderRadius = "14px";
        enabledRow.style.border = "1px solid rgba(164, 190, 255, 0.14)";
        enabledRow.style.background = "rgba(255, 255, 255, 0.04)";

        const enabledCheckbox = document.createElement("input");
        enabledCheckbox.type = "checkbox";
        enabledCheckbox.checked = this.aiHostingValue.enabled !== false;
        enabledCheckbox.style.marginTop = "2px";
        enabledCheckbox.onchange = () => {
            this.aiHostingValue = {
                ...this.aiHostingValue,
                enabled: enabledCheckbox.checked
            };
        };

        const enabledText = document.createElement("div");
        enabledText.style.display = "grid";
        enabledText.style.gap = "4px";

        const enabledTitle = document.createElement("div");
        enabledTitle.textContent = this.t("settings.prompt.enabled");
        enabledTitle.style.font = `600 14px ${getUiFontStack(this.language)}`;
        enabledTitle.style.color = "#eef3ff";

        const enabledHelp = document.createElement("div");
        enabledHelp.textContent = this.t("settings.prompt.enabledHelp");
        enabledHelp.style.color = "#cbd5f5";
        enabledHelp.style.lineHeight = "1.5";

        enabledText.appendChild(enabledTitle);
        enabledText.appendChild(enabledHelp);
        enabledRow.appendChild(enabledCheckbox);
        enabledRow.appendChild(enabledText);
        card.appendChild(enabledRow);

        card.appendChild(this.createAiHostingField(
            this.t("settings.prompt.coreIdentity"),
            this.t("settings.prompt.coreIdentityPlaceholder"),
            this.aiHostingValue.coreIdentity ?? "",
            value => {
                this.aiHostingValue = {
                    ...this.aiHostingValue,
                    coreIdentity: value
                };
            }
        ));
        card.appendChild(this.createAiHostingField(
            this.t("settings.prompt.speakingStyle"),
            this.t("settings.prompt.speakingStylePlaceholder"),
            this.aiHostingValue.speakingStyle ?? "",
            value => {
                this.aiHostingValue = {
                    ...this.aiHostingValue,
                    speakingStyle: value
                };
            }
        ));
        card.appendChild(this.createAiHostingField(
            this.t("settings.prompt.interactionGoals"),
            this.t("settings.prompt.interactionGoalsPlaceholder"),
            this.aiHostingValue.interactionGoals ?? "",
            value => {
                this.aiHostingValue = {
                    ...this.aiHostingValue,
                    interactionGoals: value
                };
            }
        ));
        card.appendChild(this.createAiHostingField(
            this.t("settings.prompt.relationshipGuidance"),
            this.t("settings.prompt.relationshipGuidancePlaceholder"),
            this.aiHostingValue.relationshipGuidance ?? "",
            value => {
                this.aiHostingValue = {
                    ...this.aiHostingValue,
                    relationshipGuidance: value
                };
            }
        ));
        card.appendChild(this.createAiHostingField(
            this.t("settings.prompt.boundaries"),
            this.t("settings.prompt.boundariesPlaceholder"),
            this.aiHostingValue.boundaries ?? "",
            value => {
                this.aiHostingValue = {
                    ...this.aiHostingValue,
                    boundaries: value
                };
            }
        ));
        card.appendChild(this.createAiHostingField(
            this.t("settings.prompt.additionalInstructions"),
            this.t("settings.prompt.additionalInstructionsPlaceholder"),
            this.aiHostingValue.additionalInstructions ?? "",
            value => {
                this.aiHostingValue = {
                    ...this.aiHostingValue,
                    additionalInstructions: value
                };
            }
        ));

        const status = document.createElement("div");
        status.style.minHeight = "22px";
        status.style.margin = "14px 0 0";
        status.style.color = "#d7e2ff";
        status.style.fontSize = "13px";
        this.promptStatus = status;

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "10px";
        actions.style.marginTop = "18px";
        actions.style.flexWrap = "wrap";

        const clearButton = this.createActionButton(this.t("settings.prompt.clear"), "rgba(255, 194, 111, 0.12)", "#ffe1b1");
        clearButton.onclick = async () => {
            this.aiHostingValue = createEmptyAiHostingProfile();
            this.renderContent();
            await this.savePromptValue(createEmptyAiHostingProfile());
        };

        const saveButton = this.createActionButton(this.t("settings.prompt.save"), "rgba(72, 126, 255, 0.26)", "#eef3ff");
        saveButton.onclick = async () => {
            await this.savePromptValue({
                enabled: this.aiHostingValue.enabled !== false,
                coreIdentity: (this.aiHostingValue.coreIdentity ?? "").trim(),
                speakingStyle: (this.aiHostingValue.speakingStyle ?? "").trim(),
                interactionGoals: (this.aiHostingValue.interactionGoals ?? "").trim(),
                relationshipGuidance: (this.aiHostingValue.relationshipGuidance ?? "").trim(),
                boundaries: (this.aiHostingValue.boundaries ?? "").trim(),
                additionalInstructions: (this.aiHostingValue.additionalInstructions ?? "").trim()
            });
        };

        actions.appendChild(clearButton);
        actions.appendChild(saveButton);
        card.appendChild(status);
        card.appendChild(actions);
        this.content.appendChild(card);
    }

    private async savePromptValue(aiHosting: CurrentUserAiHostingProfile): Promise<void> {
        if (!this.currentArgs || this.busy) {
            return;
        }
        this.busy = true;
        this.updateDisabledState();
        if (this.promptStatus) {
            this.promptStatus.textContent = this.t("settings.prompt.saving");
        }
        try {
            await this.currentArgs.onAiHostingSave(aiHosting);
            this.aiHostingValue = {
                ...createEmptyAiHostingProfile(),
                ...aiHosting
            };
            const hasConfiguredFields = [
                aiHosting.coreIdentity,
                aiHosting.speakingStyle,
                aiHosting.interactionGoals,
                aiHosting.relationshipGuidance,
                aiHosting.boundaries,
                aiHosting.additionalInstructions
            ].some(value => (value ?? "").length > 0);
            if (this.promptStatus) {
                this.promptStatus.textContent = hasConfiguredFields ? this.t("settings.prompt.saved") : this.t("settings.prompt.cleared");
            }
        } catch (error) {
            if (this.promptStatus) {
                this.promptStatus.textContent = error instanceof Error ? error.message : this.t("settings.prompt.failed");
            }
        } finally {
            this.busy = false;
            this.updateDisabledState();
        }
    }

    private createIdentityFactCard(label: string, value: string): HTMLDivElement {
        const wrapper = document.createElement("div");
        wrapper.style.padding = "12px 14px";
        wrapper.style.borderRadius = "14px";
        wrapper.style.border = "1px solid rgba(164, 190, 255, 0.12)";
        wrapper.style.background = "rgba(255, 255, 255, 0.04)";

        const title = document.createElement("div");
        title.textContent = label;
        title.style.font = `600 12px ${getUiFontStack(this.language)}`;
        title.style.color = "#9fb0d8";
        title.style.marginBottom = "6px";

        const content = document.createElement("div");
        content.textContent = value;
        content.style.color = "#eef3ff";
        content.style.lineHeight = "1.5";
        content.style.wordBreak = "break-word";

        wrapper.appendChild(title);
        wrapper.appendChild(content);
        return wrapper;
    }

    private createAiHostingField(label: string, placeholder: string, value: string, onInput: (value: string) => void): HTMLDivElement {
        const wrapper = document.createElement("div");
        wrapper.style.display = "grid";
        wrapper.style.gap = "8px";
        wrapper.style.marginBottom = "14px";

        const title = document.createElement("label");
        title.textContent = label;
        title.style.font = `600 13px ${getUiFontStack(this.language)}`;
        title.style.color = "#eef3ff";

        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.rows = 4;
        textarea.placeholder = placeholder;
        textarea.style.width = "100%";
        textarea.style.boxSizing = "border-box";
        textarea.style.padding = "14px";
        textarea.style.borderRadius = "14px";
        textarea.style.border = "1px solid rgba(164, 190, 255, 0.2)";
        textarea.style.background = "rgba(8, 12, 20, 0.72)";
        textarea.style.color = "#eef3ff";
        textarea.style.font = `14px/1.6 ${getCodeFontStack(this.language)}`;
        textarea.style.resize = "vertical";
        textarea.oninput = () => {
            onInput(textarea.value);
        };

        wrapper.appendChild(title);
        wrapper.appendChild(textarea);
        return wrapper;
    }

    private renderEnvironmentAvatarTab(): void {
        if (!this.content || !this.currentArgs) {
            return;
        }

        const card = this.createCard();
        const intro = document.createElement("p");
        intro.textContent = this.t("settings.environment.intro");
        intro.style.margin = "0 0 18px";
        intro.style.color = "#cbd5f5";
        intro.style.lineHeight = "1.6";
        card.appendChild(intro);

        if (!this.currentArgs.canManageEnvironmentAvatars) {
            const denied = document.createElement("div");
            denied.textContent = this.t("settings.environment.adminRequired");
            denied.style.color = "#ffd0c7";
            denied.style.fontSize = "13px";
            card.appendChild(denied);
            this.content.appendChild(card);
            return;
        }

        if (!this.environmentAvatarLoaded && !this.environmentAvatarLoading) {
            void this.ensureEnvironmentAvatarsLoaded();
            const loading = document.createElement("div");
            loading.textContent = this.t("settings.environment.loading");
            loading.style.color = "#d7e2ff";
            card.appendChild(loading);
            this.content.appendChild(card);
            return;
        }

        if (this.environmentAvatarLoading) {
            const loading = document.createElement("div");
            loading.textContent = this.t("settings.environment.loading");
            loading.style.color = "#d7e2ff";
            card.appendChild(loading);
            this.content.appendChild(card);
            return;
        }

        if (this.environmentAvatarError) {
            const error = document.createElement("div");
            error.textContent = this.environmentAvatarError;
            error.style.color = "#ffd0c7";
            error.style.fontSize = "13px";
            card.appendChild(error);
            this.content.appendChild(card);
            return;
        }

        const toolbar = document.createElement("div");
        toolbar.style.display = "grid";
        toolbar.style.gap = "12px";
        toolbar.style.marginBottom = "18px";

        const toolbarRow = document.createElement("div");
        toolbarRow.style.display = "grid";
        toolbarRow.style.gridTemplateColumns = "minmax(0, 1fr) auto";
        toolbarRow.style.gap = "12px";
        toolbarRow.style.alignItems = "end";

        const selectorField = document.createElement("div");
        selectorField.style.display = "grid";
        selectorField.style.gap = "8px";

        const selectorLabel = document.createElement("label");
        selectorLabel.textContent = this.t("settings.environment.selector");
        selectorLabel.style.fontWeight = "600";
        selectorLabel.style.fontSize = "14px";

        const selector = document.createElement("select");
        selector.style.width = "100%";
        selector.style.boxSizing = "border-box";
        selector.style.padding = "12px 14px";
        selector.style.borderRadius = "12px";
        selector.style.border = "1px solid rgba(164, 190, 255, 0.2)";
        selector.style.background = "rgba(8, 12, 20, 0.72)";
        selector.style.color = "#eef3ff";
        selector.style.font = `14px ${getUiFontStack(this.language)}`;
        this.environmentAvatarDrafts.forEach(avatar => {
            const option = document.createElement("option");
            option.value = avatar.agentId;
            option.textContent = `${avatar.displayName} (${avatar.agentId})`;
            selector.appendChild(option);
        });
        this.ensureSelectedEnvironmentAvatar();
        selector.value = this.selectedEnvironmentAvatarId ?? "";
        selector.onchange = () => {
            this.selectedEnvironmentAvatarId = selector.value || null;
            this.renderContent();
        };

        selectorField.appendChild(selectorLabel);
        selectorField.appendChild(selector);
        toolbarRow.appendChild(selectorField);

        const createButton = this.createActionButton(this.t("settings.environment.create"), "rgba(76, 203, 145, 0.18)", "#ecfff5");
        createButton.style.alignSelf = "end";
        createButton.onclick = async () => {
            if (!this.currentArgs?.onEnvironmentAvatarCreate || this.busy || this.environmentPlacementMode) {
                return;
            }
            this.busy = true;
            this.environmentAvatarToolbarStatus = this.t("settings.environment.creating");
            this.updateDisabledState();
            try {
                const selectedAvatar = this.getSelectedEnvironmentAvatar();
                const created = await this.currentArgs.onEnvironmentAvatarCreate(selectedAvatar ? {
                    displayName: this.t("settings.environment.newDisplayName"),
                    spriteIndex: selectedAvatar.spriteIndex,
                    caption: selectedAvatar.caption,
                    defaultSystemPrompt: selectedAvatar.defaultSystemPrompt,
                    position: { ...selectedAvatar.position },
                    walkArea: selectedAvatar.walkArea ? { ...selectedAvatar.walkArea } : undefined,
                    spawnByDefault: selectedAvatar.spawnByDefault,
                    characterRole: selectedAvatar.characterRole
                } : {
                    displayName: this.t("settings.environment.newDisplayName"),
                    spriteIndex: 0,
                    caption: "Press E to chat",
                    defaultSystemPrompt: "",
                    position: { x: 128, y: 1088 },
                    walkArea: { x: 128, y: 1088, width: 80, height: 80 },
                    spawnByDefault: true,
                    characterRole: "custom"
                });
                this.environmentAvatarDrafts = this.environmentAvatarDrafts.concat(created)
                    .sort((left, right) => left.displayName.localeCompare(right.displayName));
                this.selectedEnvironmentAvatarId = created.agentId;
                this.environmentAvatarStatuses.set(created.agentId, this.t("settings.environment.created"));
                this.environmentAvatarToolbarStatus = this.t("settings.environment.created");
            } catch (error) {
                this.environmentAvatarToolbarStatus = error instanceof Error ? error.message : this.t("settings.environment.failedCreate");
            } finally {
                this.busy = false;
                this.renderContent();
            }
        };
        toolbarRow.appendChild(createButton);
        toolbar.appendChild(toolbarRow);

        const toolbarStatus = document.createElement("div");
        toolbarStatus.textContent = this.environmentAvatarToolbarStatus ?? "";
        toolbarStatus.style.minHeight = "20px";
        toolbarStatus.style.fontSize = "13px";
        toolbarStatus.style.color = this.environmentAvatarToolbarStatus?.includes("failed") || this.environmentAvatarToolbarStatus?.includes("失败")
            ? "#ffd0c7"
            : "#d7e2ff";
        toolbar.appendChild(toolbarStatus);

        if (this.environmentPlacementMode) {
            const placementBanner = document.createElement("div");
            placementBanner.style.display = "flex";
            placementBanner.style.justifyContent = "space-between";
            placementBanner.style.alignItems = "center";
            placementBanner.style.gap = "12px";
            placementBanner.style.flexWrap = "wrap";
            placementBanner.style.padding = "14px 16px";
            placementBanner.style.borderRadius = "14px";
            placementBanner.style.border = "1px solid rgba(255, 214, 140, 0.2)";
            placementBanner.style.background = "rgba(255, 214, 140, 0.08)";

            const placementText = document.createElement("div");
            placementText.textContent = this.getPlacementHelpText();
            placementText.style.color = "#ffe8be";
            placementText.style.fontSize = "13px";
            placementText.style.lineHeight = "1.5";
            placementText.style.whiteSpace = "pre-line";

            const placementTextWrap = document.createElement("div");
            placementTextWrap.style.display = "flex";
            placementTextWrap.style.flexDirection = "column";
            placementTextWrap.style.alignItems = "flex-start";
            placementTextWrap.style.gap = "10px";
            placementTextWrap.style.flex = "1 1 320px";
            placementTextWrap.appendChild(placementText);

            const cancelPlacementButton = this.createActionButton(this.t("settings.environment.cancelPlacement"), "rgba(255, 214, 140, 0.16)", "#fff3d6");
            cancelPlacementButton.onclick = () => {
                this.currentArgs?.onEnvironmentAvatarPlacementCancel?.();
            };

            placementBanner.appendChild(placementTextWrap);
            placementBanner.appendChild(cancelPlacementButton);
            toolbar.appendChild(placementBanner);
        }

        card.appendChild(toolbar);

        if (this.environmentAvatarDrafts.length === 0) {
            const empty = document.createElement("div");
            empty.textContent = this.t("settings.environment.empty");
            empty.style.color = "#d7e2ff";
            empty.style.fontSize = "13px";
            card.appendChild(empty);
            this.content.appendChild(card);
            return;
        }

        const selectedAvatar = this.getSelectedEnvironmentAvatar();
        if (selectedAvatar) {
            card.appendChild(this.createEnvironmentAvatarEditorCard(selectedAvatar));
        }
        this.content.appendChild(card);
    }

    private createEnvironmentAvatarEditorCard(avatar: EditableEnvironmentAvatar): HTMLDivElement {
        const wrapper = document.createElement("div");
        wrapper.style.display = "grid";
        wrapper.style.gap = "14px";
        wrapper.style.padding = "18px";
        wrapper.style.borderRadius = "16px";
        wrapper.style.border = "1px solid rgba(164, 190, 255, 0.14)";
        wrapper.style.background = "rgba(8, 12, 20, 0.28)";

        const titleRow = document.createElement("div");
        titleRow.style.display = "flex";
        titleRow.style.justifyContent = "space-between";
        titleRow.style.alignItems = "baseline";
        titleRow.style.gap = "12px";
        titleRow.style.flexWrap = "wrap";

        const title = document.createElement("div");
        title.textContent = avatar.displayName;
        title.style.fontSize = "18px";
        title.style.fontWeight = "700";

        const meta = document.createElement("div");
        meta.textContent = `${this.t("settings.environment.agentId")}: ${avatar.agentId} · ${avatar.provider}/${avatar.model}`;
        meta.style.fontSize = "12px";
        meta.style.color = "#9fb0d8";

        titleRow.appendChild(title);
        titleRow.appendChild(meta);
        wrapper.appendChild(titleRow);

        const grid = document.createElement("div");
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
        grid.style.gap = "12px";

        grid.appendChild(this.createTextInputField(this.t("settings.environment.displayName"), avatar.displayName, value => {
            this.updateEnvironmentAvatarDraft(avatar.agentId, { displayName: value });
            title.textContent = value || avatar.displayName;
        }));
        grid.appendChild(this.createNumberInputField(this.t("settings.environment.spriteIndex"), avatar.spriteIndex, value => {
            this.updateEnvironmentAvatarDraft(avatar.agentId, { spriteIndex: value });
        }, 0, 0));
        grid.appendChild(this.createTextInputField(this.t("settings.environment.caption"), avatar.caption ?? "", value => {
            this.updateEnvironmentAvatarDraft(avatar.agentId, { caption: value });
        }));
        grid.appendChild(this.createCheckboxField(this.t("settings.environment.spawnByDefault"), avatar.spawnByDefault !== false, checked => {
            this.updateEnvironmentAvatarDraft(avatar.agentId, { spawnByDefault: checked });
        }));

        const walkArea = avatar.walkArea ?? {
            x: avatar.position.x,
            y: avatar.position.y,
            width: 50,
            height: 50
        };
        grid.appendChild(this.createNumberInputField(this.t("settings.environment.walkX"), walkArea.x, value => {
            this.updateEnvironmentAvatarDraft(avatar.agentId, { walkArea: { ...this.getEnvironmentWalkArea(avatar.agentId), x: value } });
        }));
        grid.appendChild(this.createNumberInputField(this.t("settings.environment.walkY"), walkArea.y, value => {
            this.updateEnvironmentAvatarDraft(avatar.agentId, { walkArea: { ...this.getEnvironmentWalkArea(avatar.agentId), y: value } });
        }));
        grid.appendChild(this.createNumberInputField(this.t("settings.environment.walkWidth"), walkArea.width, value => {
            this.updateEnvironmentAvatarDraft(avatar.agentId, { walkArea: { ...this.getEnvironmentWalkArea(avatar.agentId), width: value } });
        }, 0, 0));
        grid.appendChild(this.createNumberInputField(this.t("settings.environment.walkHeight"), walkArea.height, value => {
            this.updateEnvironmentAvatarDraft(avatar.agentId, { walkArea: { ...this.getEnvironmentWalkArea(avatar.agentId), height: value } });
        }, 0, 0));

        wrapper.appendChild(grid);

        const placementActions = document.createElement("div");
        placementActions.style.display = "flex";
        placementActions.style.gap = "10px";
        placementActions.style.flexWrap = "wrap";

        const placeWalkButton = this.createActionButton(this.t("settings.environment.placeWalkArea"), "rgba(111, 208, 184, 0.16)", "#e9fff8");
        placeWalkButton.onclick = async () => {
            await this.startEnvironmentAvatarPlacement(avatar.agentId, "walk-area");
        };

        placementActions.appendChild(placeWalkButton);
        wrapper.appendChild(placementActions);

        const promptField = document.createElement("div");
        promptField.style.display = "grid";
        promptField.style.gap = "8px";

        const promptLabel = document.createElement("label");
        promptLabel.textContent = this.t("settings.environment.prompt");
        promptLabel.style.fontWeight = "600";
        promptLabel.style.fontSize = "14px";

        const promptArea = document.createElement("textarea");
        promptArea.value = avatar.defaultSystemPrompt ?? "";
        promptArea.rows = 6;
        promptArea.style.width = "100%";
        promptArea.style.boxSizing = "border-box";
        promptArea.style.padding = "14px";
        promptArea.style.borderRadius = "14px";
        promptArea.style.border = "1px solid rgba(164, 190, 255, 0.2)";
        promptArea.style.background = "rgba(8, 12, 20, 0.72)";
        promptArea.style.color = "#eef3ff";
        promptArea.style.font = `14px/1.6 ${getCodeFontStack(this.language)}`;
        promptArea.style.resize = "vertical";
        promptArea.oninput = () => {
            this.updateEnvironmentAvatarDraft(avatar.agentId, { defaultSystemPrompt: promptArea.value });
        };

        promptField.appendChild(promptLabel);
        promptField.appendChild(promptArea);
        wrapper.appendChild(promptField);

        const status = document.createElement("div");
        status.textContent = this.environmentAvatarStatuses.get(avatar.agentId) ?? "";
        status.style.minHeight = "20px";
        status.style.fontSize = "13px";
        status.style.color = "#d7e2ff";
        wrapper.appendChild(status);

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "flex-end";
        actions.style.gap = "8px";

        const deleteButton = this.createActionButton(this.t("settings.environment.delete"), "rgba(255, 72, 72, 0.22)", "#ffe0e0");
        deleteButton.onclick = async () => {
            if (!this.currentArgs?.onEnvironmentAvatarDelete || this.busy) {
                return;
            }
            const confirmMessage = this.t("settings.environment.deleteConfirm", { name: avatar.displayName });
            if (!window.confirm(confirmMessage)) {
                return;
            }
            this.busy = true;
            this.environmentAvatarStatuses.set(avatar.agentId, this.t("settings.environment.deleting"));
            this.renderContent();
            try {
                await this.currentArgs.onEnvironmentAvatarDelete(avatar.agentId);
                this.environmentAvatarDrafts = this.environmentAvatarDrafts.filter(entry => entry.agentId !== avatar.agentId);
                this.environmentAvatarStatuses.delete(avatar.agentId);
                this.selectedEnvironmentAvatarId = this.environmentAvatarDrafts.length > 0
                    ? this.environmentAvatarDrafts[0].agentId
                    : null;
                this.environmentAvatarToolbarStatus = this.t("settings.environment.deleted");
            } catch (error) {
                this.environmentAvatarStatuses.set(avatar.agentId, error instanceof Error ? error.message : this.t("settings.environment.failedDelete"));
            } finally {
                this.busy = false;
                this.renderContent();
            }
        };

        const saveButton = this.createActionButton(this.t("settings.environment.save"), "rgba(72, 126, 255, 0.26)", "#eef3ff");
        saveButton.onclick = async () => {
            if (!this.currentArgs?.onEnvironmentAvatarSave || this.busy) {
                return;
            }
            const currentDraft = this.getEnvironmentAvatarDraftById(avatar.agentId);
            if (!currentDraft) {
                return;
            }
            this.busy = true;
            this.environmentAvatarStatuses.set(avatar.agentId, this.t("settings.environment.saving"));
            this.renderContent();
            try {
                const saved = await this.currentArgs.onEnvironmentAvatarSave(currentDraft);
                const draftIndex = this.environmentAvatarDrafts.findIndex(entry => entry.agentId === avatar.agentId);
                if (draftIndex >= 0) {
                    this.environmentAvatarDrafts.splice(draftIndex, 1, saved);
                }
                this.selectedEnvironmentAvatarId = saved.agentId;
                this.environmentAvatarStatuses.set(saved.agentId, this.t("settings.environment.saved"));
            } catch (error) {
                this.environmentAvatarStatuses.set(avatar.agentId, error instanceof Error ? error.message : this.t("settings.environment.failedSave"));
            } finally {
                this.busy = false;
                this.renderContent();
            }
        };

        actions.appendChild(deleteButton);
        actions.appendChild(saveButton);
        wrapper.appendChild(actions);
        return wrapper;
    }

    private getEnvironmentWalkArea(agentId: string): { x: number; y: number; width: number; height: number } {
        const avatar = this.getEnvironmentAvatarDraftById(agentId);
        if (!avatar) {
            return { x: 0, y: 0, width: 50, height: 50 };
        }
        return avatar.walkArea ?? {
            x: avatar.position.x,
            y: avatar.position.y,
            width: 50,
            height: 50
        };
    }

    private getEnvironmentAvatarDraftById(agentId: string): EditableEnvironmentAvatar | null {
        return this.environmentAvatarDrafts.find(avatar => avatar.agentId === agentId) ?? null;
    }

    private ensureSelectedEnvironmentAvatar(): void {
        if (this.environmentAvatarDrafts.length === 0) {
            this.selectedEnvironmentAvatarId = null;
            return;
        }
        if (!this.selectedEnvironmentAvatarId || !this.environmentAvatarDrafts.some(avatar => avatar.agentId === this.selectedEnvironmentAvatarId)) {
            this.selectedEnvironmentAvatarId = this.environmentAvatarDrafts[0].agentId;
        }
    }

    private getSelectedEnvironmentAvatar(): EditableEnvironmentAvatar | null {
        this.ensureSelectedEnvironmentAvatar();
        return this.selectedEnvironmentAvatarId
            ? this.getEnvironmentAvatarDraftById(this.selectedEnvironmentAvatarId)
            : null;
    }

    private updateEnvironmentAvatarDraft(agentId: string, patch: Partial<EditableEnvironmentAvatar>): void {
        const index = this.environmentAvatarDrafts.findIndex(avatar => avatar.agentId === agentId);
        const current = index >= 0 ? this.environmentAvatarDrafts[index] : null;
        if (!current) {
            return;
        }
        const nextWalkArea = patch.walkArea
            ? { ...patch.walkArea }
            : current.walkArea
                ? { ...current.walkArea }
                : undefined;
        const nextPosition = patch.position
            ? { ...patch.position }
            : nextWalkArea
                ? this.getEnvironmentAvatarPositionFromWalkArea(nextWalkArea)
                : { ...current.position };
        this.environmentAvatarDrafts.splice(index, 1, {
            ...current,
            ...patch,
            position: nextPosition,
            walkArea: nextWalkArea
        });
    }

    private getEnvironmentAvatarPositionFromWalkArea(walkArea: { x: number; y: number; width: number; height: number }): { x: number; y: number } {
        return {
            x: Math.round(walkArea.x + walkArea.width / 2),
            y: Math.round(walkArea.y + walkArea.height / 2)
        };
    }

    private async startEnvironmentAvatarPlacement(agentId: string, mode: EnvironmentAvatarPlacementMode): Promise<void> {
        if (!this.currentArgs?.onEnvironmentAvatarPlacementStart || this.busy || this.environmentPlacementMode) {
            return;
        }

        const avatar = this.getEnvironmentAvatarDraftById(agentId);
        if (!avatar) {
            return;
        }

        this.environmentPlacementMode = mode;
        this.environmentAvatarToolbarStatus = this.t(
            mode === "position"
                ? "settings.environment.positionPlacementStarted"
                : "settings.environment.walkPlacementStarted"
        );
        this.setPlacementPassThrough(true);
        this.renderContent();
        this.updateDisabledState();

        try {
            const result = await this.currentArgs.onEnvironmentAvatarPlacementStart({
                ...avatar,
                position: { ...avatar.position },
                walkArea: avatar.walkArea ? { ...avatar.walkArea } : undefined
            }, mode);

            if (result?.position) {
                this.updateEnvironmentAvatarDraft(agentId, { position: { ...result.position } });
            }
            if (result?.walkArea) {
                this.updateEnvironmentAvatarDraft(agentId, { walkArea: { ...result.walkArea } });
            }

            if (!result) {
                this.environmentAvatarToolbarStatus = this.t("settings.environment.placementCanceled");
            } else if (this.currentArgs.onEnvironmentAvatarSave) {
                const updatedDraft = this.getEnvironmentAvatarDraftById(agentId);
                if (!updatedDraft) {
                    this.environmentAvatarToolbarStatus = this.t("settings.environment.failedSave");
                } else {
                    this.environmentAvatarToolbarStatus = this.t("settings.environment.saving");
                    this.renderContent();
                    const saved = await this.currentArgs.onEnvironmentAvatarSave(updatedDraft);
                    const draftIndex = this.environmentAvatarDrafts.findIndex(entry => entry.agentId === agentId);
                    if (draftIndex >= 0) {
                        this.environmentAvatarDrafts.splice(draftIndex, 1, saved);
                    }
                    this.selectedEnvironmentAvatarId = saved.agentId;
                    this.environmentAvatarStatuses.set(saved.agentId, this.t("settings.environment.saved"));
                    const successMessage = this.t(
                        mode === "position"
                            ? "settings.environment.positionPlaced"
                            : "settings.environment.walkPlaced"
                    );
                    this.environmentAvatarToolbarStatus = successMessage;
                    this.showEnvironmentToast(successMessage, "success");
                }
            } else {
                this.environmentAvatarToolbarStatus = this.t(mode === "position" ? "settings.environment.positionPlaced" : "settings.environment.walkPlaced");
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : this.t("settings.environment.placementFailed");
            this.environmentAvatarToolbarStatus = errorMessage;
            this.showEnvironmentToast(errorMessage, "error");
        } finally {
            this.environmentPlacementMode = null;
            this.setPlacementPassThrough(false);
            this.renderContent();
            this.updateDisabledState();
        }
    }

    private showEnvironmentToast(message: string, tone: "success" | "error"): void {
        this.clearEnvironmentToast();

        const toast = document.createElement("div");
        toast.textContent = message;
        toast.style.position = "fixed";
        toast.style.right = "24px";
        toast.style.bottom = "24px";
        toast.style.maxWidth = "min(360px, calc(100vw - 48px))";
        toast.style.padding = "12px 14px";
        toast.style.borderRadius = "14px";
        toast.style.border = tone === "success"
            ? "1px solid rgba(111, 208, 184, 0.28)"
            : "1px solid rgba(255, 148, 133, 0.28)";
        toast.style.background = tone === "success"
            ? "rgba(14, 35, 31, 0.92)"
            : "rgba(42, 18, 18, 0.94)";
        toast.style.color = "#eef3ff";
        toast.style.font = `600 13px ${getUiFontStack(this.language)}`;
        toast.style.lineHeight = "1.5";
        toast.style.boxShadow = "0 18px 40px rgba(0, 0, 0, 0.28)";
        toast.style.zIndex = String(Number(OVERLAY_Z_INDEX) + 1);

        document.body.appendChild(toast);
        this.environmentToast = toast;
        this.environmentToastTimeoutId = window.setTimeout(() => {
            this.clearEnvironmentToast();
        }, 2200);
    }

    private clearEnvironmentToast(): void {
        if (this.environmentToastTimeoutId != null) {
            window.clearTimeout(this.environmentToastTimeoutId);
            this.environmentToastTimeoutId = null;
        }
        this.environmentToast?.remove();
        this.environmentToast = undefined;
    }

    private setPlacementPassThrough(active: boolean): void {
        if (this.backdrop) {
            this.backdrop.style.pointerEvents = active ? "none" : "auto";
            this.backdrop.style.background = active ? "rgba(6, 10, 18, 0.08)" : "rgba(6, 10, 18, 0.72)";
            this.backdrop.style.setProperty("backdrop-filter", active ? "none" : "blur(10px)");
        }
        if (this.panel) {
            this.panel.style.pointerEvents = "auto";
        }
    }

    private applyPlacementLayout(active: boolean): void {
        if (!this.backdrop || !this.panel || !this.sidebar || !this.content) {
            return;
        }

        if (active) {
            this.backdrop.style.alignItems = "flex-start";
            this.backdrop.style.justifyContent = "flex-end";
            this.backdrop.style.padding = "16px";
            this.panel.style.width = "min(460px, calc(100vw - 32px))";
            this.panel.style.height = "auto";
            this.panel.style.maxHeight = "calc(100vh - 32px)";
            this.panel.style.gridTemplateColumns = "minmax(0, 1fr)";
            this.panel.style.borderRadius = "18px";
            this.sidebar.style.display = "none";
            this.content.style.padding = "16px";
            this.content.style.overflowY = "scroll";
            this.content.style.overflowX = "hidden";
            return;
        }

        this.backdrop.style.alignItems = "center";
        this.backdrop.style.justifyContent = "center";
        this.backdrop.style.padding = "20px";
        this.panel.style.width = "min(980px, calc(100vw - 32px))";
        this.panel.style.height = "calc(100vh - 32px)";
        this.panel.style.maxHeight = "calc(100vh - 32px)";
        this.panel.style.gridTemplateColumns = "220px minmax(0, 1fr)";
        this.panel.style.borderRadius = "22px";
        this.sidebar.style.display = "block";
        this.content.style.padding = "28px";
        this.content.style.overflowY = "scroll";
        this.content.style.overflowX = "hidden";
    }

    private createTextInputField(labelText: string, value: string, onChange: (value: string) => void): HTMLDivElement {
        const field = document.createElement("div");
        field.style.display = "grid";
        field.style.gap = "8px";

        const label = document.createElement("label");
        label.textContent = labelText;
        label.style.fontWeight = "600";
        label.style.fontSize = "14px";

        const input = document.createElement("input");
        input.type = "text";
        input.value = value;
        input.style.width = "100%";
        input.style.boxSizing = "border-box";
        input.style.padding = "12px 14px";
        input.style.borderRadius = "12px";
        input.style.border = "1px solid rgba(164, 190, 255, 0.2)";
        input.style.background = "rgba(8, 12, 20, 0.72)";
        input.style.color = "#eef3ff";
        input.style.font = `14px ${getUiFontStack(this.language)}`;
        input.oninput = () => onChange(input.value);

        field.appendChild(label);
        field.appendChild(input);
        return field;
    }

    private createNumberInputField(labelText: string, value: number, onChange: (value: number) => void, min?: number, step = 1): HTMLDivElement {
        const field = document.createElement("div");
        field.style.display = "grid";
        field.style.gap = "8px";

        const label = document.createElement("label");
        label.textContent = labelText;
        label.style.fontWeight = "600";
        label.style.fontSize = "14px";

        const input = document.createElement("input");
        input.type = "number";
        input.value = String(value);
        if (min != null) {
            input.min = String(min);
        }
        input.step = String(step);
        input.style.width = "100%";
        input.style.boxSizing = "border-box";
        input.style.padding = "12px 14px";
        input.style.borderRadius = "12px";
        input.style.border = "1px solid rgba(164, 190, 255, 0.2)";
        input.style.background = "rgba(8, 12, 20, 0.72)";
        input.style.color = "#eef3ff";
        input.style.font = `14px ${getUiFontStack(this.language)}`;
        input.oninput = () => {
            const nextValue = Number(input.value);
            if (Number.isFinite(nextValue)) {
                onChange(nextValue);
            }
        };

        field.appendChild(label);
        field.appendChild(input);
        return field;
    }

    private createCheckboxField(labelText: string, checked: boolean, onChange: (checked: boolean) => void): HTMLLabelElement {
        const field = document.createElement("label");
        field.style.display = "flex";
        field.style.alignItems = "center";
        field.style.gap = "10px";
        field.style.padding = "12px 14px";
        field.style.borderRadius = "12px";
        field.style.border = "1px solid rgba(164, 190, 255, 0.2)";
        field.style.background = "rgba(8, 12, 20, 0.48)";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = checked;
        input.onchange = () => onChange(input.checked);

        const label = document.createElement("span");
        label.textContent = labelText;
        label.style.fontWeight = "600";
        label.style.fontSize = "14px";

        field.appendChild(input);
        field.appendChild(label);
        return field;
    }

    private refreshTabButtonStates(): void {
        if (!this.panel) {
            return;
        }
        const buttons = this.panel.querySelectorAll<HTMLButtonElement>("button[data-settings-tab]");
        buttons.forEach(button => {
            const tabId = button.dataset.settingsTab as SettingsTabId;
            button.textContent = this.getTabLabel(tabId);
            button.style.font = `600 15px ${getUiFontStack(this.language)}`;
            button.style.background = tabId === this.activeTab
                ? "linear-gradient(135deg, rgba(72, 126, 255, 0.34), rgba(35, 86, 204, 0.22))"
                : "rgba(255, 255, 255, 0.04)";
            button.disabled = this.busy;
        });
        if (this.sidebarTitle) {
            this.sidebarTitle.textContent = this.t("settings.sidebarTitle");
        }
        if (this.sidebarSubtitle) {
            this.sidebarSubtitle.textContent = this.t("settings.sidebarSubtitle");
        }
        if (this.closeButton) {
            this.closeButton.textContent = this.t("common.close");
            this.closeButton.style.font = `600 14px ${getUiFontStack(this.language)}`;
        }
    }

    private updateDisabledState(): void {
        if (!this.backdrop) {
            return;
        }
        const disabled = this.busy || !!this.environmentPlacementMode;
        const buttons = this.backdrop.querySelectorAll<HTMLButtonElement>("button");
        buttons.forEach(button => {
            if (button.dataset.allowWhilePlacement === "true") {
                button.disabled = this.busy;
                return;
            }
            if (button.dataset.settingsTab) {
                button.disabled = disabled;
                return;
            }
            if (button.textContent === "Close") {
                button.disabled = disabled;
                return;
            }
            button.disabled = disabled;
        });
        const selects = this.backdrop.querySelectorAll<HTMLSelectElement>("select");
        selects.forEach(select => {
            if (select.options.length > 0 && select.options[0].value !== "") {
                select.disabled = disabled;
            }
        });
        const textareas = this.backdrop.querySelectorAll<HTMLTextAreaElement>("textarea");
        textareas.forEach(textarea => {
            textarea.disabled = disabled;
        });
        const inputs = this.backdrop.querySelectorAll<HTMLInputElement>("input");
        inputs.forEach(input => {
            input.disabled = disabled;
        });
        this.refreshTabButtonStates();
    }

    private createCard(): HTMLDivElement {
        const card = document.createElement("div");
        card.style.padding = "20px";
        card.style.borderRadius = "18px";
        card.style.border = "1px solid rgba(164, 190, 255, 0.15)";
        card.style.background = "rgba(255, 255, 255, 0.035)";
        return card;
    }

    private createActionButton(label: string, background: string, color: string): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.style.border = "1px solid rgba(164, 190, 255, 0.18)";
        button.style.borderRadius = "12px";
        button.style.padding = "11px 16px";
        button.style.cursor = "pointer";
        button.style.font = `600 14px ${getUiFontStack(this.language)}`;
        button.style.background = background;
        button.style.color = color;
        return button;
    }

    private applyOverlayLanguage(language: AppLanguage): void {
        this.language = language;
        this.selectedLanguage = language;
        if (this.panel) {
            this.panel.style.fontFamily = getUiFontStack(this.language);
        }
        this.renderContent();
        this.refreshTabButtonStates();
    }

    private getTabLabel(tabId: SettingsTabId): string {
        switch (tabId) {
            case "media":
                return this.t("settings.tab.media");
            case "language":
                return this.t("settings.tab.language");
            case "character":
                return this.t("settings.tab.character");
            case "environment-avatars":
                return this.t("settings.tab.environment");
            default:
                return this.t("settings.tab.aiHosting");
        }
    }

    private getTabDescription(tabId: SettingsTabId): string {
        switch (tabId) {
            case "media":
                return this.t("settings.description.media");
            case "language":
                return this.t("settings.description.language");
            case "character":
                return this.t("settings.description.character");
            case "environment-avatars":
                return this.t("settings.description.environment");
            default:
                return this.t("settings.description.aiHosting");
        }
    }

    private getDeviceKindLabel(kind: MediaDeviceKind): string {
        return this.t(`settings.media.${kind}`);
    }

    private t(key: string, params?: Record<string, string | number>): string {
        return translate(this.language, key, params);
    }

    private drawAvatarPreview(canvas: HTMLCanvasElement, spriteIndex: number): void {
        const sprite = ThisIsMyDepartmentApp.characterSprites[spriteIndex] ?? ThisIsMyDepartmentApp.characterSprites[0];
        const ctx = canvas.getContext("2d");
        if (!ctx || !sprite) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;

        const scale = Math.max(1, Math.floor(Math.min(canvas.width / sprite.width, canvas.height / sprite.height) * 0.88));
        const drawWidth = sprite.width * scale;
        const drawHeight = sprite.height * scale;
        const offsetX = Math.floor((canvas.width - drawWidth) / 2);
        const offsetY = Math.floor((canvas.height - drawHeight) / 2);

        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        if (sprite.hasTag("idle")) {
            sprite.drawTag(ctx, "idle", 0, 0, performance.now());
        } else {
            sprite.draw(ctx, 0, 0, performance.now());
        }
        ctx.restore();
    }

    private mapDeviceKindToPreferenceKey(kind: MediaDeviceKind): "audioInput" | "audioOutput" | "videoInput" {
        if (kind === "audioinput") {
            return "audioInput";
        }
        if (kind === "audiooutput") {
            return "audioOutput";
        }
        return "videoInput";
    }
}