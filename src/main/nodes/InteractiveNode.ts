
import { asset } from "../../engine/assets/Assets";
import { BitmapFont } from "../../engine/assets/BitmapFont";
import { ControllerFamily } from "../../engine/input/ControllerFamily";
import { AsepriteNode, AsepriteNodeArgs } from "../../engine/scene/AsepriteNode";
import { TextNode } from "../../engine/scene/TextNode";
import { Layer, STANDARD_FONT } from "../constants";
import { AppLanguage, DEFAULT_LANGUAGE, getLocalizedText, readLocalizedTiledText } from "../i18n";
import { ThisIsMyDepartmentApp } from "../ThisIsMyDepartmentApp";
import { CharacterNode } from "./CharacterNode";
import { PlayerNode } from "./PlayerNode";

export abstract class InteractiveNode extends AsepriteNode<ThisIsMyDepartmentApp> {
    @asset(STANDARD_FONT)
    private static readonly font: BitmapFont;

    private target: CharacterNode | null = null;
    protected caption: string;
    protected hideSprite = false;
    private textNode: TextNode;
    protected interactionLabel: string;
    protected interactionActionLabel: string;
    protected interactionLabelByLanguage: Partial<Record<AppLanguage, string>>;

    public constructor(args: AsepriteNodeArgs, caption: string = "") {
        super(args);
        this.caption = caption;
        this.interactionLabelByLanguage = readLocalizedTiledText(args.tiledObject, "label", args.tiledObject?.getName()?.trim() ?? "");
        this.interactionLabel = getLocalizedText(DEFAULT_LANGUAGE, this.interactionLabelByLanguage, args.tiledObject?.getName()?.trim() ?? "");
        this.interactionActionLabel = "Interact";

        this.textNode = new TextNode({
            font: InteractiveNode.font,
            color: "white",
            outlineColor: "black",
            fallbackFont: "16px 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif",
            fallbackLineHeight: 22,
            y: 20,
            layer: Layer.OVERLAY
        }).appendTo(this);
    }

    public setCaption(caption: string): void {
        this.caption = caption;
    }

    public setInteractionLabel(label: string): void {
        this.interactionLabel = label.trim();
        this.interactionLabelByLanguage = {
            en: this.interactionLabel,
            zh: this.interactionLabel
        };
    }

    public setInteractionLabels(labels: Partial<Record<AppLanguage, string>>): void {
        this.interactionLabelByLanguage = labels;
        this.interactionLabel = this.getInteractionLabel(this.getActiveLanguage());
    }

    public setInteractionActionLabel(actionLabel: string): void {
        this.interactionActionLabel = actionLabel.trim();
    }

    public getInteractionLabel(language?: AppLanguage): string {
        const effectiveLanguage = language ?? this.getActiveLanguage();
        return getLocalizedText(effectiveLanguage, this.interactionLabelByLanguage, this.interactionLabel);
    }

    protected getActiveLanguage(): AppLanguage {
        return this.getScene()?.game.getLanguage() ?? DEFAULT_LANGUAGE;
    }

    public getInteractionActionLabel(): string {
        return this.interactionActionLabel;
    }

    protected getRange(): number {
        return 50;
    }

    public update(dt: number, time: number): void {
        let target = null;
        if (this.canInteract()) {
            const player = this.getPlayer();
            if (player) {
                const dis = player.getScenePosition().getSquareDistance(this.getScenePosition());
                if (dis < this.getRange() ** 2) {
                    target = player;
                }
            }
        }
        this.setTarget(target);
        this.textNode.setOpacity(0);
        this.textNode.setText("");
        super.update(dt, time);
    }

    protected isInRange(): boolean {
        return !!this.target;
    }

    public abstract interact(): void;
    public reverseInteract(): void {}

    public canInteract(): boolean {
        return true;
    }

    private setTarget(target: CharacterNode | null): void {
        if (target !== this.target) {
            if (this.target) {
                this.target.unregisterInteractiveNode(this);
            }
            this.target = target;
            if (this.target) {
                this.target.registerInteractiveNode(this);
            }
        }
    }

    public getTarget(): CharacterNode | null {
        return this.target;
    }

    protected getPlayer(): PlayerNode | undefined {
        return this.getScene()?.rootNode.getDescendantsByType<PlayerNode>(PlayerNode)[0];
    }

    protected getPrimaryActionKeyLabel(): string {
        return this.getGame().input.currentControllerFamily === ControllerFamily.GAMEPAD ? "Y" : "E";
    }

    public draw(context: CanvasRenderingContext2D): void {
        if (!this.hideSprite) {
            super.draw(context);
        }
    }
}
