import { Body, MouseJoint, MouseJointOpt, World } from 'planck';
import { CanvasRenderer } from './CanvasRenderer';
import { RenderOptions, RenderableJointDef } from './CanvasRenderer.types';

export type GenericMouseEvent = {
    position: { x: number; y: number };
};

export type EasyMouseJointOptions = {
    jointDef?: MouseJointOpt;
    renderer: CanvasRenderer;
    render?: RenderOptions;
} & Partial<RenderableJointDef>;

export class EasyMouseJoint {
    world: World;
    options: EasyMouseJointOptions;
    jointDef: MouseJoint | null = null;
    cursorPosition = { x: 0, y: 0 };
    abortController?: AbortController;
    hoveringBody: Body | null = null;

    constructor(world: World, options: EasyMouseJointOptions) {
        this.world = world;
        this.options = options;
    }

    getBodyAt(position: { x: number; y: number }) {
        let foundFixture;

        for (let body = this.world.getBodyList(); body; body = body.getNext()) {
            for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
                const hit = fixture.testPoint(position);
                if (hit) foundFixture = fixture;
            }
        }

        if (!foundFixture) return;

        return foundFixture.getBody();
    }

    setHoveringBody(body: Body | null) {
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

        const name = this.getBodyName(body);
        if (!name) return;

        this.setHoveringBody(body);

        const jointDef = this.options.jointDef ?? {};

        jointDef.maxForce = jointDef.maxForce ?? 5000;

        if (this.options.userData) {
            jointDef.userData = {
                ...jointDef.userData,
                ...this.options.userData
            };
        }

        this.jointDef = new MouseJoint(
            jointDef,
            this.world.createBody(),
            body,
            {
                x: position.x,
                y: position.y
            }
        );

        this.world.createJoint(this.jointDef);
    };

    getBodyName(body: Body) {
        const userData = body.getUserData() as { name?: string };
        if (!userData) return null;
        return userData.name || null;
    }

    onMouseMove({ position }: GenericMouseEvent) {
        this.cursorPosition.x = position.x;
        this.cursorPosition.y = position.y;

        if (this.jointDef) {
            this.jointDef.setTarget(position);
        } else {
            const body = this.getBodyAt(position);

            if (!body) return;

            if (this.hoveringBody === body) return;

            const name = this.getBodyName(body);

            if (!name) return;

            this.onHoverBody(body);
        }
    }

    onHoverBody(_body: Body) {
        for (let b = this.world.getBodyList(); b; b = b.getNext()) {
            const name = this.getBodyName(b);
            if (!name) continue;

            b.setDynamic();
        }
    }

    onMouseUp() {
        if (!this.jointDef) return;

        this.world.destroyJoint(this.jointDef);
        this.jointDef = null;
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
            this.onMouseMove({ position: getEventPosition(event) });
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
        this.abortController?.abort();
    }
};