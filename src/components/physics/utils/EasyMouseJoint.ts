import type { JointId, PhysicsBody, PhysicsWorld, Vector } from '../engine/index.ts';
import type { CanvasRenderer } from './CanvasRenderer.ts';
import { profile } from '@/utils/profiler/profiler.ts';

export type GenericMouseEvent = {
    position: Vector;
};

export type EasyMouseJointOptions = {
    renderer: CanvasRenderer;
    maxForce?: number;
    hertz?: number;
    dampingRatio?: number;
};

type ActiveDrag = {
    mouseBody: PhysicsBody;
    jointId: JointId;
    target: Vector;
};

// Box2D v3 has no mouse joint: dragging uses a kinematic body that follows the cursor,
// attached to the grabbed body by a motor joint acting as a spring.
export class EasyMouseJoint {
    world: PhysicsWorld;
    options: EasyMouseJointOptions;
    drag: ActiveDrag | null = null;
    cursorPosition = { x: 0, y: 0 };
    abortController?: AbortController;
    hoveringBody: PhysicsBody | null = null;
    removeStepListener: (() => void) | null = null;

    constructor(world: PhysicsWorld, options: EasyMouseJointOptions) {
        this.world = world;
        this.options = options;
    }

    getBodyName(body: PhysicsBody) {
        return body.userData.name || null;
    }

    getBodyAt(position: Vector) {
        return this.world.findBodyAt(position, (body) => !!this.getBodyName(body));
    }

    setHoveringBody(body: PhysicsBody | null) {
        this.hoveringBody = body;

        document.body.classList.toggle('hovering-body', !!body);

        if (this.hoveringBody) {
            const selection = window.getSelection();

            if (selection) selection.removeAllRanges();
        }

        const className = document.body.getAttribute('class');

        if (!className) document.body.removeAttribute('class');
    }

    onMouseDown({ position }: GenericMouseEvent) {
        this.onMouseUp();

        const body = this.getBodyAt(position);
        if (!body) return;

        this.setHoveringBody(body);

        const { maxForce = 5000, hertz = 5, dampingRatio = 0.7 } = this.options;

        const mouseBody = this.world.createBody({
            type: 'kinematic',
            position,
            bullet: false,
            enableSleep: false
        });

        const jointId = this.world.createSpringJoint({
            bodyA: mouseBody,
            bodyB: body,
            localAnchorB: body.toLocalPoint(position),
            hertz,
            dampingRatio,
            maxForce
        });

        this.drag = { mouseBody, jointId, target: { ...position } };

        this.removeStepListener = this.world.addStepListener((timeStep) => {
            if (!this.drag) return;
            this.world.setKinematicTarget(this.drag.mouseBody, this.drag.target, timeStep);
        });
    }

    onMouseMove({ position }: GenericMouseEvent) {
        this.cursorPosition.x = position.x;
        this.cursorPosition.y = position.y;

        if (this.drag) {
            this.drag.target.x = position.x;
            this.drag.target.y = position.y;
            return;
        }

        const body = this.getBodyAt(position);

        if (!body) return;
        if (this.hoveringBody === body) return;

        this.onHoverBody(body);
    }

    // hovering a body that is already moving (like a thrown bird) does not wake the others up.
    onHoverBody(hoveredBody: PhysicsBody) {
        if (hoveredBody.type !== 'static') return;

        for (const body of this.world.bodies) {
            if (!this.getBodyName(body)) continue;

            body.setType('dynamic');
        }
    }

    onMouseUp() {
        if (!this.drag) return;

        this.removeStepListener?.();
        this.removeStepListener = null;

        this.world.destroyJoint(this.drag.jointId);
        this.world.destroyBody(this.drag.mouseBody);

        this.drag = null;
        this.setHoveringBody(null);
    }

    setupEvents() {
        this.removeEvents();

        const ctrl = new AbortController();
        const { signal } = ctrl;

        this.abortController = ctrl;

        const renderer = this.options.renderer;
        const getEventPosition = (event: PointerEvent) => (
            renderer.getWorldPosition(event.clientX, event.clientY)
        );

        document.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            (event.target as Element).setPointerCapture(event.pointerId);
            this.onMouseDown({ position: getEventPosition(event) });
        }, { signal });

        document.addEventListener('pointermove', (event) => {
            profile('physics:pointer-move', () => this.onMouseMove({ position: getEventPosition(event) }));
        }, { signal });

        document.addEventListener('pointerup', () => {
            this.onMouseUp();
        }, { signal });

        document.addEventListener('pointercancel', () => {
            this.onMouseUp();
        }, { signal });

        window.addEventListener('blur', () => {
            this.onMouseUp();
        }, { signal });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.onMouseUp();
        }, { signal });
    }

    removeEvents() {
        this.onMouseUp();
        this.abortController?.abort();
    }
};
