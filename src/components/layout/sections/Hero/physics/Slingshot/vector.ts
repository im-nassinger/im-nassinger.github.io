import type { Vector } from '@/components/physics';

export const addVectors = (a: Vector, b: Vector) => ({ x: a.x + b.x, y: a.y + b.y });

export const subtractVectors = (a: Vector, b: Vector) => ({ x: a.x - b.x, y: a.y - b.y });

export const multiplyVector = (vector: Vector, factor: number) => ({ x: vector.x * factor, y: vector.y * factor });

export const vectorLength = (vector: Vector) => Math.hypot(vector.x, vector.y);

export const distanceBetween = (a: Vector, b: Vector) => vectorLength(subtractVectors(a, b));

export function normalizeVector(vector: Vector) {
    const length = vectorLength(vector);
    if (length === 0) return { x: 0, y: 0 };

    return multiplyVector(vector, 1 / length);
}

export const vectorFromAngle = (angle: number) => ({ x: Math.cos(angle), y: Math.sin(angle) });
