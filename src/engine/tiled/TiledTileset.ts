import { TiledTileJSON, TiledTilesetJSON } from "*.tiledmap.json";
import { Color } from "../color/Color";
import { RGBAColor } from "../color/RGBAColor";
import { RGBColor } from "../color/RGBColor";
import { cacheResult } from "../util/cache";
import { loadImage } from "../util/graphics";

export class TiledTileset {
    private image: HTMLImageElement | null = null;
    private tilesById?: Map<number, TiledTileJSON>;
    private tileImages: Map<number, HTMLImageElement | null> = new Map();
    private tileImagePromises: Map<number, Promise<HTMLImageElement | null>> = new Map();

    private constructor(
        private readonly json: TiledTilesetJSON,
        private readonly baseURL: string | URL
    ) {}

    public static fromJSON(json: TiledTilesetJSON, baseURL: string | URL): TiledTileset {
        return new TiledTileset(json, baseURL);
    }

    public toJSON(): TiledTilesetJSON {
        return this.json;
    }

    /**
     * Returns the optional background color.
     *
     * @return The optional background color.
     */
    @cacheResult
    public getBackgroundColor(): RGBAColor | null {
        return this.json.backgroundcolor != null ? Color.fromJSON(this.json.backgroundcolor).toRGBA() : null;
    }

    public getColumns(): number {
        return this.json.columns;
    }

    public getFirstGID(): number {
        return this.json.firstgid;
    }

    @cacheResult
    public async loadImage(): Promise<HTMLImageElement | null> {
        if (this.json.image == null) {
            return null;
        }
        this.image = await loadImage(new URL(this.json.image, this.baseURL));
        return this.image;
    }

    public getImage(): HTMLImageElement | null {
        if (this.json.image == null) {
            return null;
        }
        if (this.image === null) {
            this.loadImage();
        }
        return this.image;
    }

    private getTilesMap(): Map<number, TiledTileJSON> {
        if (this.tilesById == null) {
            this.tilesById = new Map();
            for (const tile of this.json.tiles ?? []) {
                this.tilesById.set(tile.id, tile);
            }
        }
        return this.tilesById;
    }

    public getTile(localTileId: number): TiledTileJSON | null {
        return this.getTilesMap().get(localTileId) ?? null;
    }

    private async loadTileImage(localTileId: number): Promise<HTMLImageElement | null> {
        const tile = this.getTile(localTileId);
        if (tile == null || tile.image == null) {
            return null;
        }
        const promise = loadImage(new URL(tile.image, this.baseURL)).catch(() => null);
        this.tileImagePromises.set(localTileId, promise);
        const image = await promise;
        this.tileImages.set(localTileId, image);
        return image;
    }

    public getTileImage(localTileId: number): HTMLImageElement | null {
        if (this.json.image != null) {
            return this.getImage();
        }
        const cached = this.tileImages.get(localTileId);
        if (cached != null) {
            return cached;
        }
        if (!this.tileImagePromises.has(localTileId)) {
            this.loadTileImage(localTileId);
        }
        return null;
    }

    public getImageURL(): string {
        return this.json.image;
    }

    public getImageWidth(): number {
        return this.json.imagewidth;
    }

    public getImageHeight(): number {
        return this.json.imageheight;
    }

    public getMargin(): number {
        return this.json.margin;
    }

    public getSource(): string | null {
        return this.json.source ?? null;
    }

    public getSpacing(): number {
        return this.json.spacing;
    }

    public getTileCount(): number {
        return this.json.tilecount;
    }

    public getTiledVersion(): string {
        return this.json.tiledversion;
    }

    public getTileWidth(): number {
        return this.json.tilewidth;
    }

    public getTileHeight(): number {
        return this.json.tileheight;
    }

    /**
     * Returns the optional transparency color.
     *
     * @return The optional transparency color.
     */
    @cacheResult
    public getTransparencyColor(): RGBColor | null {
        return this.json.transparentcolor != null ? RGBColor.fromJSON(this.json.transparentcolor) : null;
    }

    public getVersion(): number {
        return this.json.version;
    }
}
