import { profile } from '@/utils/profiler/profiler.ts';
import { scaleVector } from './geometry.ts';
import type { Vector } from './geometry.ts';
import { loadBox2D } from './loadBox2D.ts';
import type { Box2D, JointId, WorldId } from './loadBox2D.ts';
import { PhysicsBody } from './PhysicsBody.ts';
import type { BodyType, PhysicsUserData } from './PhysicsBody.ts';

export type WorldOptions = {
    gravity?: Vector;
    subStepCount?: number;
    // box2d caps the contact stiffness at a quarter of the step rate, so stiff contacts need short
    // steps: each update is split into this many box2d steps (with subStepCount substeps each).
    stepsPerUpdate?: number;
    bullet?: boolean;
    // how fast overlapping bodies are pushed apart, in meters per second.
    contactPushMaxVelocity?: number;
    // stiffness of the soft contacts, in hertz. box2d advises at most a quarter of the substep rate.
    contactHertz?: number;
    lengthScale?: number;
};

export type BodyOptions = {
    type?: BodyType;
    position?: Vector;
    angle?: number;
    bullet?: boolean;
    enableSleep?: boolean;
    userData?: PhysicsUserData;
};

export type SpringJointOptions = {
    bodyA: PhysicsBody;
    bodyB: PhysicsBody;
    localAnchorB: Vector;
    hertz: number;
    dampingRatio: number;
    maxForce: number;
};

type StepListener = (timeStep: number) => void;

// box2d's tolerances (linear slop, hull welding, collinear removal) are tuned for objects between
// 0.1 and 10 meters. Our logos are 1 meter wide with centimeter-sized rounded corners, which box2d
// would flatten. Every length is multiplied by this factor on the way in and divided on the way out,
// which is what b2SetLengthUnitsPerMeter would do if the wasm binding exposed it.
const defaultLengthScale = 10;

// box2d's default, in meters per second.
const defaultContactPushMaxVelocity = 3;

export class PhysicsWorld {
    readonly box2d: Box2D;
    readonly id: WorldId;
    readonly bodies = new Set<PhysicsBody>();
    readonly subStepCount: number;
    readonly stepsPerUpdate: number;
    readonly bullet: boolean;
    // box2d units per meter, see defaultLengthScale.
    readonly lengthScale: number;
    private readonly stepListeners = new Set<StepListener>();
    private destroyed = false;

    static async create(options: WorldOptions = {}) {
        const box2d = await loadBox2D();
        return new PhysicsWorld(box2d, options);
    }

    private constructor(box2d: Box2D, options: WorldOptions) {
        this.box2d = box2d;
        this.subStepCount = options.subStepCount ?? 4;
        this.stepsPerUpdate = options.stepsPerUpdate ?? 1;
        this.bullet = options.bullet ?? false;
        this.lengthScale = options.lengthScale ?? defaultLengthScale;

        const worldDef = box2d.b2DefaultWorldDef();
        const gravity = scaleVector(options.gravity ?? { x: 0, y: 10 }, this.lengthScale);

        worldDef.gravity.Set(gravity.x, gravity.y);

        // these defaults are speeds tuned for meters.
        worldDef.restitutionThreshold *= this.lengthScale;
        worldDef.hitEventThreshold *= this.lengthScale;
        worldDef.maximumLinearSpeed *= this.lengthScale;

        if (options.contactHertz !== undefined) worldDef.contactHertz = options.contactHertz;

        this.id = box2d.b2CreateWorld(worldDef);

        // the speed at which overlapping bodies are pushed apart is not part of b2WorldDef in this
        // binding, so it is set after creation. Left unscaled, overlaps would resolve 10x slower.
        const contactPushMaxVelocity = (options.contactPushMaxVelocity ?? defaultContactPushMaxVelocity) * this.lengthScale;

        box2d.b2World_SetContactTuning(this.id, worldDef.contactHertz, worldDef.contactDampingRatio, contactPushMaxVelocity);

        worldDef.delete();
    }

    get isDestroyed() {
        return this.destroyed;
    }

    createBody(options: BodyOptions = {}) {
        const { b2DefaultBodyDef, b2BodyType, b2CreateBody, b2MakeRot } = this.box2d;

        const type = options.type ?? 'static';
        const position = scaleVector(options.position ?? { x: 0, y: 0 }, this.lengthScale);
        const bodyDef = b2DefaultBodyDef();

        const box2DTypes = {
            static: b2BodyType.b2_staticBody,
            kinematic: b2BodyType.b2_kinematicBody,
            dynamic: b2BodyType.b2_dynamicBody
        };

        bodyDef.type = box2DTypes[type];
        bodyDef.position.Set(position.x, position.y);
        bodyDef.isBullet = options.bullet ?? this.bullet;
        bodyDef.sleepThreshold *= this.lengthScale;

        if (options.enableSleep !== undefined) bodyDef.enableSleep = options.enableSleep;

        if (options.angle) {
            const rotation = b2MakeRot(options.angle);
            bodyDef.rotation = rotation;
            rotation.delete();
        }

        const bodyId = b2CreateBody(this.id, bodyDef);

        bodyDef.delete();

        const body = new PhysicsBody(this.box2d, bodyId, type, options.userData ?? {}, this.lengthScale);

        this.bodies.add(body);

        return body;
    }

    destroyBody(body: PhysicsBody) {
        if (!this.bodies.delete(body)) return;
        if (this.destroyed) return;

        this.box2d.b2DestroyBody(body.id);
        body.markDestroyed();
    }

    // A soft spring pulling a point of bodyB towards bodyA's origin (used for mouse dragging).
    createSpringJoint(options: SpringJointOptions) {
        const { b2DefaultMotorJointDef, b2CreateMotorJoint } = this.box2d;
        const jointDef = b2DefaultMotorJointDef();

        jointDef.base.bodyIdA = options.bodyA.id;
        jointDef.base.bodyIdB = options.bodyB.id;
        const localAnchorB = scaleVector(options.localAnchorB, this.lengthScale);

        jointDef.base.localFrameB.p.Set(localAnchorB.x, localAnchorB.y);
        jointDef.linearHertz = options.hertz;
        jointDef.linearDampingRatio = options.dampingRatio;
        // masses are kept in kilograms, so forces scale linearly with length.
        jointDef.maxSpringForce = options.maxForce * this.lengthScale;
        jointDef.maxVelocityForce = 0;
        jointDef.maxVelocityTorque = 0;

        const jointId = b2CreateMotorJoint(this.id, jointDef);

        jointDef.delete();

        return jointId;
    }

    // Stops two bodies from colliding with each other, until the joint is destroyed.
    createFilterJoint(bodyA: PhysicsBody, bodyB: PhysicsBody) {
        const { b2DefaultFilterJointDef, b2CreateFilterJoint } = this.box2d;
        const jointDef = b2DefaultFilterJointDef();

        jointDef.base.bodyIdA = bodyA.id;
        jointDef.base.bodyIdB = bodyB.id;

        const jointId = b2CreateFilterJoint(this.id, jointDef);

        jointDef.delete();

        return jointId;
    }

    destroyJoint(jointId: JointId) {
        if (this.destroyed) return;
        if (!this.box2d.b2Joint_IsValid(jointId)) return;

        this.box2d.b2DestroyJoint(jointId, true);
    }

    // Moves a kinematic body so it reaches the target at the end of the next step.
    setKinematicTarget(body: PhysicsBody, target: Vector, timeStep: number) {
        const { b2Transform, b2Body_SetTargetTransform } = this.box2d;
        const transform = new b2Transform();
        const scaledTarget = scaleVector(target, this.lengthScale);

        transform.p.Set(scaledTarget.x, scaledTarget.y);
        transform.q.SetAngle(0);

        b2Body_SetTargetTransform(body.id, transform, timeStep);

        transform.delete();
    }

    addStepListener(listener: StepListener) {
        this.stepListeners.add(listener);

        return () => {
            this.stepListeners.delete(listener);
        };
    }

    findBodyAt(point: Vector, predicate: (body: PhysicsBody) => boolean = () => true) {
        let foundBody: PhysicsBody | null = null;

        for (const body of this.bodies) {
            if (!predicate(body)) continue;
            if (body.containsPoint(point)) foundBody = body;
        }

        return foundBody;
    }

    step(timeStep: number) {
        if (this.destroyed) return;

        const innerTimeStep = timeStep / this.stepsPerUpdate;

        profile('physics:box2d-step', () => {
            for (let i = 0; i < this.stepsPerUpdate; i++) {
                for (const listener of this.stepListeners) {
                    listener(innerTimeStep);
                }

                this.box2d.b2World_Step(this.id, innerTimeStep, this.subStepCount);
            }
        });

        profile('physics:sync-transforms', () => {
            for (const body of this.bodies) {
                if (body.type !== 'static') body.syncTransform();
            }
        });
    }

    destroy() {
        if (this.destroyed) return;

        this.destroyed = true;
        this.stepListeners.clear();

        for (const body of this.bodies) {
            body.markDestroyed();
        }

        this.bodies.clear();
        this.box2d.b2DestroyWorld(this.id);
    }
}
