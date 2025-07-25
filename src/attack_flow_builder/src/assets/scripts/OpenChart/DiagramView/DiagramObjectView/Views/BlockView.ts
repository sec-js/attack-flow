import { Crypto } from "@OpenChart/Utilities";
import { linkFaceToView } from "../FaceLinker";
import { ViewUpdateReason } from "../ViewUpdateReason";
import { PositionSetByUser } from "../ViewAttributes";
import { Block, RootProperty } from "@OpenChart/DiagramModel";
import type { AnchorView } from "./AnchorView";
import type { ViewObject } from "../ViewObject";
import type { ViewportRegion } from "../ViewportRegion";
import type { RenderSettings } from "../RenderSettings";
import type { DiagramObjectView } from "./DiagramObjectView";
import type { BlockFace, BoundingBox } from "../Faces";

export class BlockView extends Block implements ViewObject {

    /**
     * The view's (internal) face.
     */
    private _face: BlockFace;

    /**
     * The view's face.
     */
    public get face(): BlockFace {
        return this._face;
    }


    ///////////////////////////////////////////////////////////////////////////
    //  1. Block Overrides  ///////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////


    /**
     * The object's (internal) parent.
     */
    declare protected _parent: DiagramObjectView | null;

    /**
     * The block's (internal) anchors.
     */
    declare protected _anchors: Map<string, AnchorView>;

    /**
     * The object's parent.
     */
    public get parent(): DiagramObjectView | null {
        return this._parent;
    }

    /**
     * The block's anchors.
     */
    public get anchors(): ReadonlyMap<string, AnchorView> {
        return this._anchors;
    }


    ///////////////////////////////////////////////////////////////////////////
    //  2. Attributes  ////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////


    /**
     * The view's alignment.
     */
    public get alignment(): number {
        return this._face.alignment;
    }

    /**
     * The view's alignment.
     */
    public set alignment(value: number) {
        this._face.alignment = value;
    }


    /**
     * The view's orientation.
     */
    public get orientation(): number {
        return this._face.orientation;
    }

    /**
     * The view's orientation.
     */
    public set orientation(value: number) {
        this._face.orientation = value;
    }


    /**
     * Whether the view is focused or not.
     */
    public get focused(): boolean {
        return this._face.focused;
    }

    /**
     * Whether the view is focused or not.
     */
    public set focused(value: number) {
        this._face.focused = value;
    }


    /**
     * Whether the view is hovered or not.
     */
    public get hovered(): number {
        return this._face.hovered;
    }

    /**
     * Whether the view is hovered or not.
     */
    public set hovered(value: number) {
        this._face.hovered = value;
    }


    /**
     * The view's tangibility.
     */
    public get tangibility(): number  {
        return this._face.tangibility;
    }

    /**
     * The view's tangibility.
     */
    public set tangibility(value: number) {
        this._face.tangibility = value;
    }


    /**
     * Whether view's position has been set by the user.
     */
    public get userSetPosition(): number  {
        return this._face.userSetPosition;
    }

    /**
     * Whether view's position has been set by the user.
     */
    public set userSetPosition(value: number) {
        this._face.userSetPosition = value;
    }


    ///////////////////////////////////////////////////////////////////////////
    //  3. Position  //////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////


    /**
     * The view's x position.
     */
    get x(): number {
        return this._face.boundingBox.x;
    }

    /**
     * The view's y position.
     */
    get y(): number {
        return this._face.boundingBox.y;
    }


    /**
     * Creates a new {@link BlockView}.
     * @param id
     *  The view's identifier.
     * @param instance
     *  The view's instance identifier.
     * @param attributes
     *  The view's attributes.
     * @param properties
     *  The view's root property.
     * @param face
     *  The view's face.
     */
    constructor(
        id: string,
        instance: string,
        attributes: number,
        properties: RootProperty,
        face: BlockFace
    ) {
        super(id, instance, attributes, properties);
        // Set face
        this._face = face;
        this.replaceFace(face);
        // Configure attributes
        this.face.userSetPosition = PositionSetByUser.True;
        // Recalculate layout on property updates
        this.properties.subscribe(
            this.instance,
            () => this.handleUpdate(ViewUpdateReason.PropUpdate)
        );
    }


    /**
     * Replaces the view's face.
     * @param face
     *  The view's new face.
     */
    public replaceFace(face: BlockFace) {
        linkFaceToView(face, this);
    }


    ///////////////////////////////////////////////////////////////////////////
    //  4. Selection  /////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////


    /**
     * Returns the topmost view at the specified coordinate.
     * @param x
     *  The x coordinate.
     * @param y
     *  The y coordinate.
     * @returns
     *  The topmost view, undefined if there isn't one.
     */
    public getObjectAt(x: number, y: number): DiagramObjectView | undefined {
        return this.face.getObjectAt(x, y);
    }


    ///////////////////////////////////////////////////////////////////////////
    //  5. Movement  //////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////


    /**
     * Moves the view to a specific coordinate and updates its layout.
     * @param x
     *  The x coordinate.
     * @param y
     *  The y coordinate.
     */
    public moveTo(x: number, y: number): void {
        // Move face
        this.face.moveTo(x, y);
        // Recalculate parent layout
        this.parent?.handleUpdate(ViewUpdateReason.Movement);
    }

    /**
     * Moves the view relative to its current position and updates its layout.
     * @param dx
     *  The change in x.
     * @param dy
     *  The change in y.
     */
    public moveBy(dx: number, dy: number): void {
        // Move face
        this.face.moveBy(dx, dy);
        // Recalculate parent layout
        this.parent?.handleUpdate(ViewUpdateReason.Movement);
    }


    ///////////////////////////////////////////////////////////////////////////
    //  6. Layout & View  /////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////


    /**
     * Recalculates child layouts and then updates this view's layout.
     * @remarks
     *  By default, a diagram's layout is not computed when its views are being
     *  instantiated and linked together. This is done to cut down on
     *  repetitive layout computations. After a diagram is built, this function
     *  can be invoked on the diagram's root view to calculate its full layout.
     *
     *  From then on, when isolated changes are made to a singular view,
     *  `updateLayout()` can be invoked on that view to update the diagram's
     *  layout. Although, generally speaking, this function is internally
     *  called when necessary and rarely needs to be invoked outside the
     *  context of this library.
     */
    public calculateLayout(): void {
        for (const anchor of this.anchors.values()) {
            anchor.calculateLayout();
        }
        this.face.calculateLayout();
    }

    /**
     * Updates the object's layout and all parent layouts.
     * @param reasons
     *  The reasons the diagram changed.
     */
    public handleUpdate(reasons: number) {
        // Update face
        if (this.face.calculateLayout()) {
            // Update parent
            this.parent?.handleUpdate(reasons);
        }
    }

    /**
     * Renders the face to a context.
     * @param ctx
     *  The context to render to.
     * @param region
     *  The context's viewport.
     * @param settings
     *  The current render settings.
     */
    public renderTo(ctx: CanvasRenderingContext2D, region: ViewportRegion, settings: RenderSettings): void {
        this.face.renderTo(ctx, region, settings);
    }

    /**
     * Renders the face's debug information to a context.
     * @param ctx
     *  The context to render to.
     * @param region
     *  The context's viewport.
     * @returns
     *  True if the view is visible, false otherwise.
     */
    public renderDebugTo(ctx: CanvasRenderingContext2D, region: ViewportRegion): boolean {
        return this.face.renderDebugTo(ctx, region);
    }


    ///////////////////////////////////////////////////////////////////////////
    //  7. Cloning  ///////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////


    /**
     * Returns a complete clone of the object.
     * @param instance
     *  The clone's instance identifier.
     *  (Default: Random UUID)
     * @param instanceMap
     *  An empty map that, if provided, will be populated with object instance
     *  ID to clone instance ID associations.
     * @returns
     *  A clone of the object.
     */
    public clone(instance?: string, instanceMap?: Map<string, string>): BlockView {
        // Create clone
        const clone = this.replicateChildrenTo(this.isolatedClone(instance), instanceMap);
        // Calculate layout and position
        clone.face.calculateLayout();
        clone.moveTo(this.x, this.y);
        // Create association
        instanceMap?.set(this.instance, clone.instance);
        // Return clone
        return clone;
    }

    /**
     * Returns a childless clone of the object.
     * @param instance
     *  The clone's instance identifier.
     *  (Default: Random UUID)
     * @returns
     *  A clone of the object.
     */
    public isolatedClone(instance?: string): BlockView {
        return new BlockView(
            this.id,
            instance ?? Crypto.randomUUID(),
            this.attributes,
            this.properties.clone(),
            this.face.clone()
        );
    }


    ///////////////////////////////////////////////////////////////////////////
    //  8. Shape  /////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////


    /**
     * Tests if a bounding region overlaps the view.
     * @param region
     *  The bounding region.
     * @returns
     *  True if the bounding region overlaps the view, false otherwise.
     */
    public overlaps(region: BoundingBox): boolean {
        return this.face.overlaps(region);
    }

}
