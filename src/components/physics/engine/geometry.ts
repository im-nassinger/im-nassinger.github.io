export type Vector = { x: number; y: number };

export type CircleGeometry = {
    type: 'circle';
    center: Vector;
    radius: number;
};

export type PolygonGeometry = {
    type: 'polygon';
    vertices: Vector[];
};

export type ShapeGeometry = CircleGeometry | PolygonGeometry;

const cross = (origin: Vector, a: Vector, b: Vector) => {
    return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
};

// Andrew's monotone chain. Returns the hull in counter-clockwise order (y up), without repeated points.
export function computeConvexHull(points: Vector[]) {
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);

    if (sorted.length < 3) return sorted;

    const lower: Vector[] = [];

    for (const point of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
            lower.pop();
        }

        lower.push(point);
    }

    const upper: Vector[] = [];

    for (let i = sorted.length - 1; i >= 0; i--) {
        const point = sorted[i];

        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
            upper.pop();
        }

        upper.push(point);
    }

    lower.pop();
    upper.pop();

    return lower.concat(upper);
}

export function computePolygonCentroid(vertices: Vector[]) {
    let doubleArea = 0;
    let centroidX = 0;
    let centroidY = 0;

    for (let i = 0; i < vertices.length; i++) {
        const current = vertices[i];
        const next = vertices[(i + 1) % vertices.length];
        const crossProduct = current.x * next.y - next.x * current.y;

        doubleArea += crossProduct;
        centroidX += (current.x + next.x) * crossProduct;
        centroidY += (current.y + next.y) * crossProduct;
    }

    return {
        x: centroidX / (3 * doubleArea),
        y: centroidY / (3 * doubleArea)
    };
}

// Splits a convex polygon into wedges that share its centroid, so each piece fits within
// the engine's polygon vertex limit. Anchoring the wedges on a boundary vertex instead
// would create slivers along rounded corners, which box2d discards as degenerate.
export function splitConvexPolygon(hull: Vector[], maxVertices: number) {
    if (hull.length <= maxVertices) return [hull];

    const centroid = computePolygonCentroid(hull);
    const edgesPerPiece = maxVertices - 2;
    const pieces: Vector[][] = [];

    let start = 0;

    while (start < hull.length) {
        const boundary = collectWedgeBoundary(hull, start, centroid, edgesPerPiece);

        pieces.push([centroid, ...boundary]);
        start += boundary.length - 1;
    }

    return pieces;
}

// A wedge wider than 180 degrees is not convex at the centroid, and box2d would replace it
// with its hull, overlapping the neighboring wedges. The margin keeps the centroid from
// being discarded as a collinear point.
const maxWedgeAngle = Math.PI * 0.9;

function collectWedgeBoundary(hull: Vector[], start: number, centroid: Vector, maxEdges: number) {
    const first = hull[start];
    const boundary = [first];

    for (let offset = 1; offset <= maxEdges && start + offset <= hull.length; offset++) {
        const candidate = hull[(start + offset) % hull.length];
        const isTooWide = boundary.length >= 2 && measureWedgeAngle(centroid, first, candidate) > maxWedgeAngle;

        if (isTooWide) break;

        boundary.push(candidate);
    }

    return boundary;
}

// Counter-clockwise angle from `from` to `to`, as seen from `origin`, in the range [0, 2 PI).
function measureWedgeAngle(origin: Vector, from: Vector, to: Vector) {
    const fromX = from.x - origin.x;
    const fromY = from.y - origin.y;
    const toX = to.x - origin.x;
    const toY = to.y - origin.y;

    const crossProduct = fromX * toY - fromY * toX;
    const dotProduct = fromX * toX + fromY * toY;
    const angle = Math.atan2(crossProduct, dotProduct);

    return angle < 0 ? angle + 2 * Math.PI : angle;
}

export function scaleVector(vector: Vector, scale: number): Vector {
    return { x: vector.x * scale, y: vector.y * scale };
}

export function rotateVector(vector: Vector, angle: number): Vector {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return {
        x: vector.x * cos - vector.y * sin,
        y: vector.x * sin + vector.y * cos
    };
}

export function makeBoxVertices(halfWidth: number, halfHeight: number, center: Vector, angle = 0) {
    const corners = [
        { x: -halfWidth, y: -halfHeight },
        { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight },
        { x: -halfWidth, y: halfHeight }
    ];

    return corners.map((corner) => {
        const rotated = rotateVector(corner, angle);
        return { x: rotated.x + center.x, y: rotated.y + center.y };
    });
}

// Expects a convex polygon, as produced by computeConvexHull.
export function geometryContainsPoint(geometry: ShapeGeometry, localPoint: Vector) {
    if (geometry.type === 'circle') {
        const dx = localPoint.x - geometry.center.x;
        const dy = localPoint.y - geometry.center.y;

        return dx * dx + dy * dy <= geometry.radius * geometry.radius;
    }

    const { vertices } = geometry;

    for (let i = 0; i < vertices.length; i++) {
        const current = vertices[i];
        const next = vertices[(i + 1) % vertices.length];

        if (cross(current, next, localPoint) < 0) return false;
    }

    return vertices.length >= 3;
}
