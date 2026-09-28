import type { PhysicsBody, PhysicsWorld, Vector } from '@/components/physics';
import { lerp } from '@/utils/math/lerp';
import { logoRestoreConfig } from './config';

type LogoRestorerOptions = {
    getLogos: () => PhysicsBody[];
    // things besides the fallen logos (like thrown birds) that are also worth cleaning up.
    hasLeftovers: () => boolean;
    onRestoreStart: () => void;
};

type LogoTrip = {
    logo: PhysicsBody;
    fromPosition: Vector;
    fromAngle: number;
    angleChange: number;
};

const fullTurn = Math.PI * 2;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// the rotation from one angle to another, going the short way around.
const getShortestAngleChange = (fromAngle: number, toAngle: number) => {
    const wrappedChange = (toAngle - fromAngle) % fullTurn;

    return (wrappedChange + fullTurn * 1.5) % fullTurn - Math.PI;
};

// Once everything knocked down has been asleep for a while, the logos glide back to where they were
// created. While they travel they are kinematic and without collision, so the physics leaves them
// alone, and once there they are static again, waiting to be knocked down like at the start.
export class LogoRestorer {
    private readonly world: PhysicsWorld;
    private readonly options: LogoRestorerOptions;
    private idleTime = 0;
    private trips: LogoTrip[] = [];
    private tripProgress = 0;

    constructor(world: PhysicsWorld, options: LogoRestorerOptions) {
        this.world = world;
        this.options = options;
    }

    get isRestoring() {
        return this.trips.length > 0;
    }

    update(timeStep: number) {
        if (this.isRestoring) {
            this.updateTrips(timeStep);
            return;
        }

        const isWaitingToRestore = this.hasSomethingToRestore() && this.isEverythingAsleep();

        this.idleTime = isWaitingToRestore ? this.idleTime + timeStep : 0;

        if (this.idleTime >= logoRestoreConfig.idleTime) this.startRestore();
    }

    // restores right away, without waiting for the scene to go idle.
    restoreFallenLogos() {
        if (this.isRestoring) return;
        if (this.getFallenLogos().length === 0) return;

        this.startRestore();
    }

    private getFallenLogos() {
        return this.options.getLogos().filter((logo) => logo.type !== 'static');
    }

    private hasSomethingToRestore() {
        return this.getFallenLogos().length > 0 || this.options.hasLeftovers();
    }

    private isEverythingAsleep() {
        for (const body of this.world.bodies) {
            if (body.type === 'dynamic' && body.isAwake()) return false;
        }

        return true;
    }

    private startRestore() {
        this.idleTime = 0;
        this.tripProgress = 0;
        this.trips = this.getFallenLogos().map((logo) => this.startTrip(logo));

        this.options.onRestoreStart();
    }

    private startTrip(logo: PhysicsBody): LogoTrip {
        // the world only syncs transforms once per update, and this runs before every inner step.
        logo.syncTransform();

        logo.setCollisionEnabled(false);
        logo.setType('kinematic');
        logo.setLinearVelocity({ x: 0, y: 0 });
        logo.setAngularVelocity(0);

        return {
            logo,
            fromPosition: { ...logo.position },
            fromAngle: logo.angle,
            angleChange: getShortestAngleChange(logo.angle, logo.initialAngle)
        };
    }

    private updateTrips(timeStep: number) {
        this.tripProgress = Math.min(this.tripProgress + timeStep / logoRestoreConfig.duration, 1);

        const easedProgress = easeInOutCubic(this.tripProgress);

        for (const trip of this.trips) this.moveAlongTrip(trip, easedProgress);

        if (this.tripProgress < 1) return;

        for (const trip of this.trips) this.finishTrip(trip);

        this.trips = [];
    }

    private moveAlongTrip(trip: LogoTrip, progress: number) {
        const { logo, fromPosition, fromAngle, angleChange } = trip;

        const position = {
            x: lerp(fromPosition.x, logo.initialPosition.x, progress),
            y: lerp(fromPosition.y, logo.initialPosition.y, progress)
        };

        logo.setTransform(position, fromAngle + angleChange * progress);
    }

    private finishTrip({ logo }: LogoTrip) {
        logo.setTransform(logo.initialPosition, logo.initialAngle);
        logo.setType('static');
        logo.setCollisionEnabled(true);
    }
}
