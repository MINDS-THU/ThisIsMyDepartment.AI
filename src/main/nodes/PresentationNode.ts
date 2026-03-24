import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { InteractiveNode } from "./InteractiveNode";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { asset } from "../../engine/assets/Assets";
import { PreCharacterTags } from "./CharacterNode";
import { ThisIsMyDepartmentApp } from "../ThisIsMyDepartmentApp";
import { PresentationBoardNode } from "./PresentationBoardNode";
import { ControllerEvent } from "../../engine/input/ControllerEvent";

export interface PresentationNodeArgs extends SceneNodeArgs {
    onUpdate?: (state: boolean) => boolean | undefined;
}

export class PresentationNode extends InteractiveNode {
    @asset("sprites/empty.aseprite.json")
    private static readonly noSprite: Aseprite;
    private readonly presentationBoardId?: number;

    private presents: boolean = false;
    private presenting = false;
    private presentationBoard?: PresentationBoardNode;

    public constructor({ onUpdate, ...args }: PresentationNodeArgs) {
        super({
            aseprite: PresentationNode.noSprite,
            anchor: Direction.CENTER,
            tag: "off",
            ...args
        }, "按E键开始演讲");
        this.setInteractionActionLabel("Start");
        this.setInteractionLabel(args.tiledObject?.getName()?.trim() || "Presentation");
        this.presentationBoardId = args.tiledObject?.getOptionalProperty("forPresentationboard", "int")?.getValue();
    }


    protected getRange(): number {
        return 10;
    }

    private getPresentationBoard(): PresentationBoardNode | undefined {
        if (!this.presentationBoard) {
            this.presentationBoard = this.getScene()?.rootNode
                .getDescendantsByType<PresentationBoardNode>(PresentationBoardNode)
                .find(node => node.boardId === this.presentationBoardId);
        }
        return this.presentationBoard;
    }

    public update(dt: number, time: number): void {
        this.presentationBoard = this.getPresentationBoard();
        if (!this.presents) {
            const keyLabel = this.getPrimaryActionKeyLabel();
            const game = this.getGame() as ThisIsMyDepartmentApp;
            const action = game.isPresentationSessionActive(this.presentationBoard?.boardId) ? "加入演示" : "开始演讲";
            this.caption = `按${keyLabel}键${action}`;
        } else {
            this.caption = "";
        }
        super.update(dt, time);
    }

    public interact(): void {
        if (this.canInteract()) {
            const player = this.getPlayer();
            player?.setX(this.x);
            player?.setY(this.y);
            player?.setPreTag(PreCharacterTags.FRONT);
            this.presentationBoard = this.getPresentationBoard();
            if (this.presentationBoard) {
                this.presents = true;
                const game = this.getGame() as ThisIsMyDepartmentApp;
                this.presenting = !game.isPresentationSessionActive(this.presentationBoard.boardId);
                const input = this.getScene()!.game.input;
                input.onButtonDown.connect(this.handleButtonPress, this);
                this.getScene()?.camera.focus(this.presentationBoard, { duration: 0, follow: true }).then((successful) => {
                    if (successful) {
                        if (this.presenting) {
                            (this.getGame() as ThisIsMyDepartmentApp).beginLocalPresentation(
                                this.presentationBoard?.boardId ?? 0,
                                this.presentationBoard?.slideIndex ?? 0
                            );
                            this.getGame().sendRealtimeCommand("presentationUpdate", { presentationBoardId: this.presentationBoard?.boardId, slide: this.presentationBoard?.slideIndex ?? 0 });
                            this.presentationBoard?.startPresentation(0, true);
                            (this.getGame() as ThisIsMyDepartmentApp).openPresentationSessionOverlay();
                        } else {
                            const board = this.presentationBoard;
                            const activeSlide = game.getPresentationSessionSlide(board?.boardId) ?? board?.slideIndex ?? 0;
                            board?.startPresentation(activeSlide, false);
                            board?.setSlide(activeSlide);
                        }
                        if (player != null) {
                            player.startPresentation();
                        }
                        (this.getGame() as ThisIsMyDepartmentApp).dimLights();
                    }
                });
            }
        }
    }

    private handleButtonPress(ev: ControllerEvent): void {
        if (this.presenting && ev.isPlayerMoveRight) {
            this.nextSlide();
        } else if (this.presenting && ev.isPlayerMoveLeft) {
            this.previousSlide();
        } else if (ev.isAbort) {
            const input = this.getScene()!.game.input;
            input.onButtonDown.disconnect(this.handleButtonPress, this);
            this.leavePresentation();
        }
    }

    private leavePresentation(): void {
        this.presents = false;
        if (this.presenting) {
            this.presentationBoard?.endPresentation();
        }
        const player = this.getPlayer();
        if (this.presenting && this.presentationBoard) {
            (this.getGame() as ThisIsMyDepartmentApp).endLocalPresentation(this.presentationBoard.boardId ?? 0);
            this.getGame().sendRealtimeCommand("presentationUpdate", { presentationBoardId: this.presentationBoard.boardId, slide: -1 });
        }
        if (player != null) {
            player.endPresentation();
            this.getScene()?.camera.focus(player, { duration: 0, follow: true });
        }
        if (this.presenting) {
            (this.getGame() as ThisIsMyDepartmentApp).closePresentationSessionOverlay();
        }
        this.presenting = false;
        (this.getGame() as ThisIsMyDepartmentApp).turnOnAllLights();
    }

    private nextSlide(): void {
        this.presentationBoard?.nextSlide();
    }

    private previousSlide(): void {
        this.presentationBoard?.previousSlide();
    }
}
