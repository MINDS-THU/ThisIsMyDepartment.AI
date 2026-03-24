import { getStoredMediaDevicePreference } from "../constants";
import { AppLanguage, getCodeFontStack, getUiFontStack, translate } from "../i18n";
import { ThisIsMyDepartmentApp } from "../ThisIsMyDepartmentApp";

type SettingsTabId = "media" | "language" | "character" | "ai-prompt";
type MediaDeviceKind = "audioinput" | "audiooutput" | "videoinput";

interface MediaDeviceOption {
    deviceId: string;
    kind: MediaDeviceKind;
    label: string;
}

interface SettingsOverlayOpenArgs {
    initialTab?: SettingsTabId;
    initialLanguage: AppLanguage;
    initialSpriteIndex: number;
    initialPrompt: string;
    initialAudioEnabled: boolean;
    initialVideoEnabled: boolean;
    getMediaDevices: () => Promise<MediaDeviceOption[]>;
    onAvatarSave: (spriteIndex: number) => Promise<void>;
    onPromptSave: (prompt: string) => Promise<void>;
    onLanguageSave: (language: AppLanguage) => Promise<void>;
    onMediaToggle: (kind: Extract<MediaDeviceKind, "audioinput" | "videoinput">, enabled: boolean) => Promise<boolean> | boolean;
    onMediaDeviceChange: (kind: MediaDeviceKind, deviceId: string) => Promise<void> | void;
}

const OVERLAY_Z_INDEX = "10000";

export class SettingsOverlay {
    private backdrop?: HTMLDivElement;
    private panel?: HTMLDivElement;
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
    private promptValue = "";
    private busy = false;
    private avatarPreviewCanvases: HTMLCanvasElement[] = [];
    private mediaState = {
        audioEnabled: false,
        videoEnabled: false
    };

    public open(args: SettingsOverlayOpenArgs): void {
        this.close();
        this.currentArgs = args;
        this.activeTab = args.initialTab ?? "media";
        this.language = args.initialLanguage;
        this.selectedLanguage = args.initialLanguage;
        this.selectedSpriteIndex = args.initialSpriteIndex;
        this.promptValue = args.initialPrompt;
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
        panel.style.maxHeight = "calc(100vh - 32px)";
        panel.style.display = "grid";
        panel.style.gridTemplateColumns = "220px minmax(0, 1fr)";
        panel.style.overflow = "hidden";
        panel.style.borderRadius = "22px";
        panel.style.border = "1px solid rgba(164, 190, 255, 0.26)";
        panel.style.background = "linear-gradient(160deg, rgba(22, 29, 44, 0.98), rgba(11, 16, 26, 0.98))";
        panel.style.boxShadow = "0 28px 90px rgba(0, 0, 0, 0.45)";
        panel.style.color = "#eef3ff";
        panel.style.fontFamily = getUiFontStack(this.language);

        const sidebar = document.createElement("div");
        sidebar.style.padding = "24px 18px";
        sidebar.style.background = "linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01))";
        sidebar.style.borderRight = "1px solid rgba(164, 190, 255, 0.12)";

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

        (["media", "language", "character", "ai-prompt"] as SettingsTabId[]).forEach(tabId => {
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
        content.style.padding = "28px";
        content.style.overflow = "auto";

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
        this.content = content;
        this.detachKeydown = this.attachEscapeListener();
        this.renderContent();
        this.refreshTabButtonStates();
    }

    public close(): void {
        this.detachKeydown?.();
        this.detachKeydown = undefined;
        this.backdrop?.remove();
        this.backdrop = undefined;
        this.panel = undefined;
        this.content = undefined;
        this.mediaStatus = undefined;
        this.characterStatus = undefined;
        this.promptStatus = undefined;
        this.currentArgs = undefined;
        this.busy = false;
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

        this.content.innerHTML = "";
        this.mediaStatus = undefined;
        this.languageStatus = undefined;
        this.characterStatus = undefined;
        this.promptStatus = undefined;

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

        this.renderPromptTab();
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
        select.value = this.selectedLanguage;
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

        const textarea = document.createElement("textarea");
        textarea.value = this.promptValue;
        textarea.rows = 12;
        textarea.placeholder = this.t("settings.prompt.placeholder");
        textarea.style.width = "100%";
        textarea.style.boxSizing = "border-box";
        textarea.style.padding = "14px";
        textarea.style.borderRadius = "14px";
        textarea.style.border = "1px solid rgba(164, 190, 255, 0.2)";
        textarea.style.background = "rgba(8, 12, 20, 0.72)";
        textarea.style.color = "#eef3ff";
        textarea.style.font = `14px/1.6 ${getCodeFontStack(this.language)}`;
        textarea.style.resize = "vertical";
        textarea.style.minHeight = "260px";
        textarea.oninput = () => {
            this.promptValue = textarea.value;
        };

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
            textarea.value = "";
            this.promptValue = "";
            await this.savePromptValue("");
        };

        const saveButton = this.createActionButton(this.t("settings.prompt.save"), "rgba(72, 126, 255, 0.26)", "#eef3ff");
        saveButton.onclick = async () => {
            await this.savePromptValue(textarea.value.trim());
        };

        actions.appendChild(clearButton);
        actions.appendChild(saveButton);
        card.appendChild(textarea);
        card.appendChild(status);
        card.appendChild(actions);
        this.content.appendChild(card);
    }

    private async savePromptValue(prompt: string): Promise<void> {
        if (!this.currentArgs || this.busy) {
            return;
        }
        this.busy = true;
        this.updateDisabledState();
        if (this.promptStatus) {
            this.promptStatus.textContent = this.t("settings.prompt.saving");
        }
        try {
            await this.currentArgs.onPromptSave(prompt);
            this.promptValue = prompt;
            if (this.promptStatus) {
                this.promptStatus.textContent = prompt.length > 0 ? this.t("settings.prompt.saved") : this.t("settings.prompt.cleared");
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
        const buttons = this.backdrop.querySelectorAll<HTMLButtonElement>("button");
        buttons.forEach(button => {
            if (button.dataset.settingsTab) {
                button.disabled = this.busy;
                return;
            }
            if (button.textContent === "Close") {
                button.disabled = this.busy;
                return;
            }
            button.disabled = this.busy;
        });
        const selects = this.backdrop.querySelectorAll<HTMLSelectElement>("select");
        selects.forEach(select => {
            if (select.options.length > 0 && select.options[0].value !== "") {
                select.disabled = this.busy;
            }
        });
        const textareas = this.backdrop.querySelectorAll<HTMLTextAreaElement>("textarea");
        textareas.forEach(textarea => {
            textarea.disabled = this.busy;
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
            default:
                return this.t("settings.tab.aiPrompt");
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
            default:
                return this.t("settings.description.aiPrompt");
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