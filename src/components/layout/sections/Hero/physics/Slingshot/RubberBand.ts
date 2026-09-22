import type { Vector } from '@/components/physics';
import { clamp } from '@/utils/math/clamp';
import { slingshotConfig } from './slingshotConfig';
import { addVectors, distanceBetween, multiplyVector, normalizeVector, subtractVectors, vectorLength } from './vector';

export type RubberBandState = 'empty' | 'sitting' | 'dragging' | 'wobbling';

// The game makes pulling straight down (into the trunk) much shorter. `angle` is the direction from the
// band towards the rest point, so pulling down gives about -PI/2. Port of rubberBandStretchabilityFactor.
function getStretchability(angle: number) {
    let factor = 1;

    if (angle >= -1.9 && angle < -1.75) factor = -(angle + 1.75) / 0.15;
    if (angle >= -1.75 && angle < -1.5) factor = 0.25;
    if (angle >= -1.5 && angle < -1.35) factor = (angle + 1.5) / 0.15;

    return Math.max(factor, 0.25);
}

// Port of SlingshotSystem from the game's Slingshot.lua, in world meters.
export class RubberBand {
    restPosition: Vector = { x: 0, y: 0 };
    bandPosition: Vector = { x: 0, y: 0 };
    bandAngle = 0;
    stretchLength = 0;
    state: RubberBandState = 'empty';
    private bandVelocity = 0;

    get isDragging() {
        return this.state === 'dragging';
    }

    get stretchFactor() {
        return clamp(this.stretchLength / slingshotConfig.maxStretch, 0, 1);
    }

    get isStretchedEnoughToShoot() {
        return this.stretchLength > slingshotConfig.minStretchToShoot;
    }

    get sittingPosition() {
        return addVectors(this.restPosition, slingshotConfig.sittingOffset);
    }

    // the slingshot moves with the layout, and the band moves with it.
    setRestPosition(restPosition: Vector) {
        const movement = subtractVectors(restPosition, this.restPosition);

        this.restPosition = { ...restPosition };
        this.bandPosition = addVectors(this.bandPosition, movement);
    }

    sit() {
        this.state = 'sitting';
        this.bandPosition = this.sittingPosition;
        this.bandAngle = slingshotConfig.sittingAngle;
        this.stretchLength = 0;
        this.bandVelocity = 0;
    }

    startDrag() {
        this.state = 'dragging';
    }

    // the band follows the pointer, limited to a circle of maxStretch around the rest point.
    stretchTo(pointer: Vector) {
        const displacement = subtractVectors(this.restPosition, pointer);
        const displacementLength = vectorLength(displacement);
        const direction = normalizeVector(displacement);

        this.bandAngle = displacementLength > 0 ? Math.atan2(displacement.y, displacement.x) : 0;

        const clampedLength = Math.min(displacementLength, slingshotConfig.maxStretch);
        const bandPosition = subtractVectors(this.restPosition, multiplyVector(direction, clampedLength));

        const maxStretchAtThisAngle = getStretchability(this.bandAngle) * slingshotConfig.maxStretch;

        if (maxStretchAtThisAngle < clampedLength) {
            bandPosition.y = this.restPosition.y - maxStretchAtThisAngle * direction.y;
        }

        this.bandPosition = bandPosition;
        this.stretchLength = distanceBetween(this.restPosition, bandPosition);
    }

    // points from the band to the rest point, and grows linearly with the stretch.
    getLaunchVelocity() {
        const direction = normalizeVector(subtractVectors(this.restPosition, this.bandPosition));
        const speed = slingshotConfig.maxLaunchSpeed * this.stretchFactor;

        return multiplyVector(direction, speed);
    }

    release() {
        const velocity = this.getLaunchVelocity();

        this.state = 'wobbling';
        this.bandVelocity = 0;

        return velocity;
    }

    update(timeStep: number) {
        if (this.state === 'wobbling') this.updateWobble(timeStep);
    }

    // Port of updateRubberBandWobble. The band is always pushed towards the rest point, so it overshoots
    // back and forth with a shrinking amplitude, which is the "twang" after a shot.
    private updateWobble(timeStep: number) {
        const { springStiffness, springDamping, springStepFactor, springReferenceTimeStep } = slingshotConfig;

        const towardsRest = subtractVectors(this.restPosition, this.bandPosition);
        const distanceToRest = vectorLength(towardsRest);

        const springForce = springStiffness * distanceToRest - springDamping * this.bandVelocity;
        const frameFraction = timeStep / springReferenceTimeStep;

        this.bandVelocity += springForce * springStepFactor * frameFraction;

        if (distanceToRest > 0) {
            this.bandAngle = Math.atan2(towardsRest.y, towardsRest.x);

            const movement = multiplyVector(towardsRest, this.bandVelocity * timeStep / distanceToRest);

            this.bandPosition = addVectors(this.bandPosition, movement);
        }

        this.stretchLength = distanceBetween(this.restPosition, this.bandPosition);

        const hasSettled = this.stretchLength < 0.002 && Math.abs(this.bandVelocity) < 0.02;

        if (hasSettled) this.settle();
    }

    private settle() {
        this.state = 'empty';
        this.bandPosition = { ...this.restPosition };
        this.bandAngle = 0;
        this.stretchLength = 0;
        this.bandVelocity = 0;
    }
}
