import { rotateVector } from '@/components/physics';
import type { PhysicsBody, Vector } from '@/components/physics';
import { addVectors } from './vector';

export type Bounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

const emptyBounds = (): Bounds => ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

function includePoint(bounds: Bounds, point: Vector, padding = 0) {
    bounds.minX = Math.min(bounds.minX, point.x - padding);
    bounds.minY = Math.min(bounds.minY, point.y - padding);
    bounds.maxX = Math.max(bounds.maxX, point.x + padding);
    bounds.maxY = Math.max(bounds.maxY, point.y + padding);
}

// the axis aligned box around every shape of the body, in world meters.
export function getBodyBounds(body: PhysicsBody) {
    const bounds = emptyBounds();
    const toWorld = (localPoint: Vector) => addVectors(body.position, rotateVector(localPoint, body.angle));

    for (const shape of body.shapes) {
        if (shape.geometry.type === 'circle') {
            includePoint(bounds, toWorld(shape.geometry.center), shape.geometry.radius);
            continue;
        }

        for (const polygon of shape.polygons) {
            for (const vertex of polygon) includePoint(bounds, toWorld(vertex));
        }
    }

    return bounds;
}

export function expandBounds(bounds: Bounds, margin: number): Bounds {
    return {
        minX: bounds.minX - margin,
        minY: bounds.minY - margin,
        maxX: bounds.maxX + margin,
        maxY: bounds.maxY + margin
    };
}

export function boundsOverlap(a: Bounds, b: Bounds) {
    return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}
