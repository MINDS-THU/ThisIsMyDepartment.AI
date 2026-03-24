import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { InteractiveNode } from "./InteractiveNode";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { asset } from "../../engine/assets/Assets";
import { TextNode } from "../../engine/scene/TextNode";
import { BitmapFont } from "../../engine/assets/BitmapFont";
import { Layer, STANDARD_FONT } from "../constants";
import { AppLanguage, DEFAULT_LANGUAGE, getCanvasUiFontStack, getLocalizedText, readLocalizedTiledText } from "../i18n";
import { ThisIsMyDepartmentApp } from "../ThisIsMyDepartmentApp";

export interface IFrameNodeArgs extends SceneNodeArgs {
    onUpdate?: (state: boolean) => boolean | undefined;
}

export class IFrameNode extends InteractiveNode {
    // Flip to true if the design ever requires runtime URL pasting again
    private static readonly ALLOW_URL_PASTE = false;
    @asset("sprites/empty.aseprite.json")
    private static readonly noSprite: Aseprite;
    @asset(STANDARD_FONT)
    private static readonly labelFont: BitmapFont;

    private inIFrame: boolean = false;
    public pasteInput?: HTMLInputElement;
    public url: string;
    private onUpdate?: (state: boolean) => boolean | undefined;
    private range: number;
    private needpasting: boolean;
    private backdrop?: HTMLDivElement;
    private closeBtn?: HTMLDivElement;
    private videos?: HTMLElement;
    private iFrame?: HTMLIFrameElement;
    private readonly labelNode?: TextNode<ThisIsMyDepartmentApp>;
    private readonly labelTextByLanguage: Partial<Record<AppLanguage, string>>;
    private readonly handleCloseButtonClick = () => this.close();
    private closeButtonListenerAttached = false;

    public constructor({ onUpdate, ...args }: IFrameNodeArgs) {
        super({
            aseprite: IFrameNode.noSprite,
            anchor: Direction.CENTER,
            tag: "off",
            ...args
        }, "");
        this.onUpdate = onUpdate;
        this.url = args.tiledObject?.getOptionalProperty("url", "string")?.getValue() ?? "";
        this.range = args.tiledObject?.getOptionalProperty("range", "int")?.getValue() ?? 30;
        this.needpasting = args.tiledObject?.getOptionalProperty("needpasting", "bool")?.getValue() ?? false;

        this.labelTextByLanguage = readLocalizedTiledText(args.tiledObject, "label", args.tiledObject?.getName() ?? "");
        const labelText = getLocalizedText(DEFAULT_LANGUAGE, this.labelTextByLanguage, "").trim();
        this.setInteractionActionLabel("Open");
        if (labelText.length > 0) {
            this.setInteractionLabels(this.labelTextByLanguage);
            this.labelNode = new TextNode<ThisIsMyDepartmentApp>({
                font: IFrameNode.labelFont,
                color: "white",
                outlineColor: "black",
                fallbackFont: `16px ${getCanvasUiFontStack()}`,
                fallbackLineHeight: 22,
                y: -30,
                layer: Layer.OVERLAY
            }).appendTo(this);
            this.labelNode.setText(labelText);
        } else {
            this.setInteractionLabel("Link");
        }
    }

    /** @inheritdoc */
    public activate(): void {
        this.closeBtn = document.getElementById("close-in-frame-btn") as HTMLDivElement;
    }

    /** @inheritdoc */
    public deactivate(): void {
        this.pasteInput?.remove();
        if (this.closeBtn && this.closeButtonListenerAttached) {
            this.closeBtn.removeEventListener("click", this.handleCloseButtonClick);
            this.closeButtonListenerAttached = false;
        }
        super.deactivate();
    }

    public update(dt: number, time: number): void {
        const keyLabel = this.getPrimaryActionKeyLabel();
        this.caption = this.getGame().t("interaction.caption.open", { key: keyLabel });
        if (this.labelNode) {
            this.labelNode.setText(getLocalizedText(this.getGame().getLanguage(), this.labelTextByLanguage, ""));
        }
        super.update(dt, time);
    }

    public setOnUpdate(func: (state: boolean) => boolean): void {
        this.onUpdate = func;
    }

    public interact(): void {
        if (this.canInteract()) {
            const newState = !this.inIFrame;
            if (newState) {
                this.open();
            }
            if (!this.onUpdate || this.onUpdate(newState) !== false) {
                this.inIFrame = newState;
                this.setTag(this.inIFrame ? "on" : "off");
            }
        }
    }

    public open(): void {
        this.getGame().pauseGame();
        this.iFrame = document.createElement("iframe");
        this.iFrame.src = this.url;
        this.iFrame.frameBorder = "0";
        this.iFrame.allowFullscreen = true;
        this.iFrame.style.overflow = "auto";
        // Allow embedded pages to show scrollbars and request common capabilities (camera/mic for meetings, clipboard for auth codes, etc.)
        this.iFrame.setAttribute("allow", "camera; microphone; fullscreen; geolocation; clipboard-read; clipboard-write; autoplay");
        this.iFrame.style.position = "absolute";
        this.iFrame.style.zIndex = "4000";
        this.iFrame.style.left = "0";
        this.iFrame.style.top = "0";
        this.iFrame.style.bottom = "0";
        this.iFrame.style.right = "0";
        this.iFrame.classList.add("in-frame");
        if (IFrameNode.ALLOW_URL_PASTE && this.needpasting) {
            this.pasteInput = document.createElement("input");
            this.pasteInput.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter") {
                    ev.preventDefault();
                    this.pasteInput?.blur();
                }
            });
            this.pasteInput.addEventListener("blur", () => {
                const copied = this.pasteInput?.value;
                if (copied != null && copied !== "") {
                    this.getGame().sendCommand("IFrameUpdate", { originalUrl: this.url, newUrl: copied });
                    this.getGame().recordIFrameUrlChanged(this.url, copied);
                    this.url = copied;
                }
                this.pasteInput?.remove();
            });
            this.pasteInput.style.position = "absolute";
            this.pasteInput.placeholder = this.getGame().t("iframe.paste.placeholder");
            this.pasteInput.style.zIndex = "4001";
            this.pasteInput.style.left = `calc(50% - ${this.pasteInput.width}px / 2)`;
            this.pasteInput.style.top = "10px";
            document.body.append(this.pasteInput);
        }
        if (this.closeBtn) {
            this.closeBtn.style.display = "flex";
            if (!this.closeButtonListenerAttached) {
                this.closeBtn.addEventListener("click", this.handleCloseButtonClick);
                this.closeButtonListenerAttached = true;
            }
        }
        this.videos = document.getElementById("videos") ?? undefined;
        if (this.videos) {
            this.videos.style.zIndex = "4001";
        }
        this.backdrop = document.createElement("div");
        this.backdrop.classList.add("backdrop");
        this.backdrop.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.close();
        });
        document.body.append(this.backdrop);
        document.body.append(this.iFrame);
        this.getGame().recordIFrameOpened(this.url);
        this.getGame().pauseGame();
        setTimeout(() => {
            this.iFrame?.focus();
            this.iFrame?.ownerDocument.body.focus();
        }, 1000);
    }

    public close(): void {
        this.getGame().pauseGame();
        this.backdrop?.remove();
        this.iFrame?.remove();
        this.pasteInput?.remove();
        const wasOpen = this.inIFrame;
        this.inIFrame = false;
        if (wasOpen) {
            this.setTag("off");
            this.onUpdate?.(false);
            this.getGame().recordIFrameClosed(this.url);
        }
        this.getGame().pauseGame();

        if (this.closeBtn) {
            this.closeBtn.style.display = "none";
            if (this.closeButtonListenerAttached) {
                this.closeBtn.removeEventListener("click", this.handleCloseButtonClick);
                this.closeButtonListenerAttached = false;
            }
        }

        if (this.videos) {
            this.videos.style.zIndex = "1000";
        }
    }

    public canInteract(): boolean {
        return !this.inIFrame && this.url !== "";
    }

    public isOpen(): boolean {
        return this.inIFrame;
    }

    protected getRange(): number {
        return this.range;
    }
}
