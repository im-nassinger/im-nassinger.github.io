import { computeConvexHull, geometryContainsPoint, rotateVector, scaleVector, splitConvexPolygon } from './geometry.ts';
import type { ShapeGeometry, Vector } from './geometry.ts';
import type { BodyId, Box2D, ShapeId } from './loadBox2D.ts';
import type { RenderOptions } from '../utils/CanvasRenderer.types.ts';

export type PhysicsUserData = {
    [key: string]: unknown;
    name?: string;
    render?: RenderOptions;
};

export type BodyType = 'static' | 'kinematic' | 'dynamic';

export type ShapeMaterial = {
    density?: number;
    friction?: number;
    restitution?: number;
};

export type PhysicsShape = {
    geometry: ShapeGeometry;
    userData: PhysicsUserData;
    shapeIds: ShapeId[];
    // The polygons exactly as box2d stored them, after splitting, welding and collinear removal.
    polygons: Vector[][];
};

export class PhysicsBody {
    readonly box2d: Box2D;
    readonly id: BodyId;
    readonly shapes = new Set<PhysicsShape>();
    userData: PhysicsUserData;
    type: BodyType;
    position: Vector = { x: 0, y: 0 };
    angle = 0;
    // box2d units per meter, see PhysicsWorld.
    readonly lengthScale: number;
    private destroyed = false;

    constructor(box2d: Box2D, id: BodyId, type: BodyType, userData: PhysicsUserData, lengthScale: number) {
        this.box2d = box2d;
        this.id = id;
        this.type = type;
        this.userData = userData;
        this.lengthScale = lengthScale;

        this.syncTransform();
    }

    get isDestroyed() {
        return this.destroyed;
    }

    // Called by the world once the underlying box2d body no longer exists.
    markDestroyed() {
        this.destroyed = true;
        this.shapes.clear();
    }

    syncTransform() {
        const { b2Body_GetPosition, b2Body_GetRotation } = this.box2d;

        const position = b2Body_GetPosition(this.id);
        this.position.x = position.x / this.lengthScale;
        this.position.y = position.y / this.lengthScale;
        position.delete();

        const rotation = b2Body_GetRotation(this.id);
        this.angle = Math.atan2(rotation.s, rotation.c);
        rotation.delete();
    }

    setType(type: BodyType) {
        if (this.destroyed || this.type === type) return;

        const { b2Body_SetType, b2BodyType } = this.box2d;
        const box2DTypes = {
            static: b2BodyType.b2_staticBody,
            kinematic: b2BodyType.b2_kinematicBody,
            dynamic: b2BodyType.b2_dynamicBody
        };

        b2Body_SetType(this.id, box2DTypes[type]);
        this.type = type;
    }

    setLinearVelocity(velocity: Vector) {
        if (this.destroyed) return;

        const { b2Vec2, b2Body_SetLinearVelocity } = this.box2d;
        const scaledVelocity = scaleVector(velocity, this.lengthScale);
        const box2DVelocity = new b2Vec2(scaledVelocity.x, scaledVelocity.y);

        b2Body_SetLinearVelocity(this.id, box2DVelocity);

        box2DVelocity.delete();
    }

    getMass() {
        const massData = this.box2d.b2Body_GetMassData(this.id);
        const { mass } = massData;

        massData.delete();

        return mass;
    }

    toLocalPoint(worldPoint: Vector) {
        const offset = {
            x: worldPoint.x - this.position.x,
            y: worldPoint.y - this.position.y
        };

        return rotateVector(offset, -this.angle);
    }

    containsPoint(worldPoint: Vector) {
        const localPoint = this.toLocalPoint(worldPoint);

        for (const shape of this.shapes) {
            if (geometryContainsPoint(shape.geometry, localPoint)) return true;
        }

        return false;
    }

    createShape(geometry: ShapeGeometry, material: ShapeMaterial, userData: PhysicsUserData = {}) {
        const shapeDef = this.box2d.b2DefaultShapeDef();

        // areas grow with the square of the length scale, so the density shrinks to keep masses in kilograms.
        const areaScale = this.lengthScale * this.lengthScale;

        if (material.density !== undefined) shapeDef.density = material.density / areaScale;
        if (material.friction !== undefined) shapeDef.material.friction = material.friction;
        if (material.restitution !== undefined) shapeDef.material.restitution = material.restitution;

        const shape = geometry.type === 'circle'
            ? this.createCircleShape(geometry, shapeDef)
            : this.createPolygonShapes(geometry.vertices, shapeDef);

        shapeDef.delete();

        const physicsShape = { ...shape, userData };

        this.shapes.add(physicsShape);

        return physicsShape;
    }

    destroyShape(shape: PhysicsShape) {
        if (!this.shapes.delete(shape)) return;
        if (this.destroyed) return;

        for (const shapeId of shape.shapeIds) {
            this.box2d.b2DestroyShape(shapeId, true);
        }
    }

    private createCircleShape(geometry: ShapeGeometry & { type: 'circle' }, shapeDef: ReturnType<Box2D['b2DefaultShapeDef']>) {
        const { b2Circle, b2Vec2, b2CreateCircleShape } = this.box2d;

        const circle = new b2Circle();
        const scaledCenter = scaleVector(geometry.center, this.lengthScale);
        const center = new b2Vec2(scaledCenter.x, scaledCenter.y);

        circle.center = center;
        circle.radius = geometry.radius * this.lengthScale;

        const shapeId = b2CreateCircleShape(this.id, shapeDef, circle);

        center.delete();
        circle.delete();

        return { geometry, shapeIds: [shapeId], polygons: [] };
    }

    private createPolygonShapes(vertices: Vector[], shapeDef: ReturnType<Box2D['b2DefaultShapeDef']>) {
        const { b2Polygon, b2ComputeHull, b2MakePolygon, b2CreatePolygonShape } = this.box2d;

        const hull = computeConvexHull(vertices);
        const pieces = splitConvexPolygon(hull, b2Polygon.GetMaxVertices());
        const shapeIds: ShapeId[] = [];
        const polygons: Vector[][] = [];

        for (const piece of pieces) {
            const scaledPiece = piece.map((vertex) => scaleVector(vertex, this.lengthScale));
            const box2DHull = b2ComputeHull(scaledPiece);
            const isDegenerate = box2DHull.count === 0;

            if (isDegenerate) {
                box2DHull.delete();
                continue;
            }

            const polygon = b2MakePolygon(box2DHull, 0);

            shapeIds.push(b2CreatePolygonShape(this.id, shapeDef, polygon));
            polygons.push(this.readPolygonVertices(polygon));

            polygon.delete();
            box2DHull.delete();
        }

        const geometry: ShapeGeometry = { type: 'polygon', vertices: hull };

        return { geometry, shapeIds, polygons };
    }

    private readPolygonVertices(polygon: ReturnType<Box2D['b2MakePolygon']>) {
        const vertices: Vector[] = [];

        for (let i = 0; i < polygon.count; i++) {
            const vertex = polygon.GetVertex(i);

            vertices.push(scaleVector(vertex, 1 / this.lengthScale));
            vertex.delete();
        }

        return vertices;
    }
}
