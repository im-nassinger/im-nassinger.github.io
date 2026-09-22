import type { JointId, PhysicsBody, PhysicsWorld, Vector } from '@/components/physics';
import { lerp } from '@/utils/math/lerp';
import { birdConfig } from './slingshotConfig';
import type { SlingshotSpriteName } from './slingshotSprites';
import { vectorLength } from './vector';

export type BirdState = 'hopping' | 'loaded' | 'flying';

const randomBlinkDelay = () => 2 + Math.random() * 3;

// The bird is a kinematic body while it hops and sits in the slingshot, so its position can be set
// directly every step, and it has no collision there, so it never pushes the logos around. On launch
// it becomes dynamic and box2d takes over. Only then it gets a name, which is what the mouse joint
// looks for, so a thrown bird can be dragged like the logos.
export class SlingshotBird {
    readonly body: PhysicsBody;
    state: BirdState = 'hopping';

    private readonly world: PhysicsWorld;
    // bodies the bird was inside when it was launched, each with the filter joint that makes the bird
    // pass through it. Once the bird is out of a body, its joint is removed and they collide again.
    private readonly ignoredBodies = new Map<PhysicsBody, JointId>();
    private hopStart: Vector;
    private hopTarget: Vector;
    private hopTimer = 0;
    private hopAngle = 0;

    private flightTime = 0;
    private restingTime = 0;
    private previousSpeed = 0;
    private hasCollided = false;
    private collisionFaceTimer = 0;

    private blinkTimer = randomBlinkDelay();

    constructor(world: PhysicsWorld, startPosition: Vector, hopTarget: Vector) {
        this.world = world;
        this.hopStart = startPosition;
        this.hopTarget = hopTarget;

        this.body = world.createBody({
            type: 'kinematic',
            position: startPosition,
            bullet: true,
            userData: { render: { hidden: true } }
        });

        const { radius, density, friction, restitution } = birdConfig;

        this.body.createShape({ type: 'circle', center: { x: 0, y: 0 }, radius }, { density, friction, restitution });
        this.body.setCollisionEnabled(false);
    }

    isIgnoring(body: PhysicsBody) {
        return this.ignoredBodies.has(body);
    }

    get sprite(): SlingshotSpriteName {
        if (this.state === 'flying') {
            if (this.collisionFaceTimer > 0) return 'birdRedBlink';
            if (!this.hasCollided) return 'birdRedFlying';
            return 'birdRed';
        }

        return this.blinkTimer < birdConfig.blinkDuration ? 'birdRedBlink' : 'birdRed';
    }

    get isFinished() {
        if (this.state !== 'flying') return false;

        const hasStopped = this.restingTime > birdConfig.restingTimeToReload;
        const hasFlownTooLong = this.flightTime > birdConfig.maxFlightTime;

        return hasStopped || hasFlownTooLong;
    }

    // the layout moved, so the hop keeps heading to the slingshot's new place.
    moveHop(startPosition: Vector, hopTarget: Vector) {
        this.hopStart = startPosition;
        this.hopTarget = hopTarget;
    }

    updateBlink(timeStep: number) {
        this.blinkTimer -= timeStep;
        if (this.blinkTimer < 0) this.blinkTimer = randomBlinkDelay();
    }

    // Port of defaultAnimateBirdToSlingShot: a 1 second arc while spinning. Returns true when it arrives.
    updateHop(timeStep: number) {
        this.hopTimer = Math.min(this.hopTimer + timeStep, birdConfig.hopDuration);
        this.hopAngle += Math.PI * 2 * timeStep;

        const t = this.hopTimer / birdConfig.hopDuration;
        const hopHeight = (this.hopTarget.y - this.hopStart.y) * birdConfig.hopHeightFactor;
        const x = lerp(this.hopStart.x, this.hopTarget.x, t);
        const y = this.hopStart.y + Math.sin(birdConfig.hopArcAngle * t) * hopHeight;

        const hasArrived = t >= 1;

        if (hasArrived) {
            this.state = 'loaded';
            this.body.setTransform(this.hopTarget, 0);
            return true;
        }

        this.body.setTransform({ x, y }, this.hopAngle);
        return false;
    }

    // Port of updateKeepingBirdInSlingshot: the bird is glued to the rubber band.
    followBand(bandPosition: Vector) {
        this.body.setTransform(bandPosition, 0);
    }

    // The game applies an impulse of mass * velocity, which is the same as setting the velocity.
    launch(velocity: Vector) {
        this.state = 'flying';
        this.body.userData.name = 'red-bird';

        // released inside a logo, the bird would get stuck in it. It passes through the bodies it is
        // inside instead, and keeps colliding with everything else (like the floor and the walls).
        for (const body of this.getOverlappingBodies()) {
            this.ignoredBodies.set(body, this.world.createFilterJoint(this.body, body));
        }

        this.body.setCollisionEnabled(true);
        this.body.setType('dynamic');
        this.body.setLinearVelocity(velocity);
        this.previousSpeed = vectorLength(velocity);
    }

    private isOverlapping(body: PhysicsBody) {
        return body.getDistanceTo(this.body.position) < birdConfig.radius;
    }

    private getOverlappingBodies() {
        return [...this.world.bodies].filter((body) => body !== this.body && this.isOverlapping(body));
    }

    // collides again with each ignored body as soon as the bird is out of it.
    private updateIgnoredBodies() {
        for (const [body, jointId] of this.ignoredBodies) {
            if (!body.isDestroyed && this.isOverlapping(body)) continue;

            this.world.destroyJoint(jointId);
            this.ignoredBodies.delete(body);
        }
    }

    updateFlight(timeStep: number) {
        // the world only syncs transforms once per update, and this runs before every inner step.
        this.body.syncTransform();
        this.updateIgnoredBodies();

        this.flightTime += timeStep;
        this.collisionFaceTimer -= timeStep;

        const speed = vectorLength(this.body.getLinearVelocity());
        const speedDrop = this.previousSpeed - speed;

        if (speedDrop > birdConfig.collisionSpeedDrop) {
            this.hasCollided = true;
            this.collisionFaceTimer = birdConfig.collisionFaceTime;
        }

        this.restingTime = speed < birdConfig.restingSpeed ? this.restingTime + timeStep : 0;
        this.previousSpeed = speed;
    }

    destroy() {
        for (const jointId of this.ignoredBodies.values()) this.world.destroyJoint(jointId);

        this.ignoredBodies.clear();
        this.world.destroyBody(this.body);
    }
}
