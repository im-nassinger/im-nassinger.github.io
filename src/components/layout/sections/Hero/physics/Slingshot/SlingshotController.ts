import type { CanvasRenderer, PhysicsWorld, Vector } from '@/components/physics';
import { clamp } from '@/utils/math/clamp';
import { boundsOverlap, expandBounds, getBodyBounds } from './bodyBounds';
import { RubberBand } from './RubberBand';
import { SlingshotBird } from './SlingshotBird';
import { birdConfig, logoWakeMargin, revealConfig, slingshotConfig } from './slingshotConfig';
import { SlingshotRenderer } from './SlingshotRenderer';
import type { SlingshotSprites } from './slingshotSprites';
import { distanceBetween, vectorLength } from './vector';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// Ties the rubber band, the birds, the pointer and the physics world together, and draws them
// through a renderer overlay.
export class SlingshotController {
    private readonly world: PhysicsWorld;
    private readonly renderer: CanvasRenderer;
    private readonly slingshotRenderer: SlingshotRenderer;
    private readonly band = new RubberBand();
    private readonly flownBirds: SlingshotBird[] = [];
    private readonly abortController = new AbortController();
    private readonly removeStepListener: () => void;
    private readonly removeOverlay: () => void;
    private currentBird: SlingshotBird | null = null;
    private visibleRestPosition: Vector = { x: 0, y: 0 };
    private floorY = 0;
    private hasPlacement = false;
    private spriteVersion = 0;

    // 0 is hidden below the floor, 1 is fully up.
    private revealProgress = 0;
    private isPointerInRevealArea = false;
    private hideDelayLeft = 0;

    // a touch screen has no pointer hovering around to raise the slingshot, so it stays up.
    private readonly staysRevealed = !window.matchMedia('(hover: hover)').matches;
    // the finger or mouse button that grabbed the bird, so the other ones do not release it.
    private dragPointerId: number | null = null;

    constructor(world: PhysicsWorld, renderer: CanvasRenderer, sprites: SlingshotSprites) {
        this.world = world;
        this.renderer = renderer;
        this.slingshotRenderer = new SlingshotRenderer(sprites);

        this.removeStepListener = world.addStepListener((timeStep) => this.update(timeStep));

        this.removeOverlay = renderer.addOverlay({
            draw: (ctx) => this.draw(ctx),
            getSceneState: () => this.getSceneState()
        });

        this.setupPointerEvents();
    }

    private get birds() {
        const currentBirds = this.currentBird ? [this.currentBird] : [];

        return [...this.flownBirds, ...currentBirds];
    }

    private get scene() {
        return {
            band: this.band,
            birds: this.birds,
            hasBirdInPouch: this.currentBird?.state === 'loaded'
        };
    }

    private get hiddenOffset() {
        return revealConfig.hiddenOffset * (1 - easeOutCubic(this.revealProgress));
    }

    // the next bird waits on the floor behind the slingshot, and hides with it.
    private get waitingPosition() {
        return {
            x: this.band.restPosition.x + birdConfig.waitingOffsetX,
            y: this.floorY - birdConfig.radius + this.hiddenOffset
        };
    }

    private get isFullyRevealed() {
        return this.revealProgress >= 1;
    }

    // the sprites are baked again when the zoom or the screen's pixel density changes.
    setSprites(sprites: SlingshotSprites) {
        this.slingshotRenderer.setSprites(sprites);
        this.spriteVersion++;
    }

    setPlacement(restPosition: Vector, floorY: number) {
        this.visibleRestPosition = { ...restPosition };
        this.floorY = floorY;
        this.hasPlacement = true;

        this.applyReveal();
    }

    destroy() {
        this.abortController.abort();
        this.removeStepListener();
        this.removeOverlay();

        for (const bird of this.birds) bird.destroy();

        document.body.classList.remove('slingshot-hover', 'slingshot-dragging');
    }

    // the band starts at the world origin, so nothing is drawn until the slingshot is placed.
    private draw(ctx: CanvasRenderingContext2D) {
        if (!this.hasPlacement) return;

        this.slingshotRenderer.draw(ctx, this.scene);
    }

    // called by the world before every box2d step.
    private update(timeStep: number) {
        if (!this.hasPlacement) return;

        this.updateReveal(timeStep);
        this.band.update(timeStep);
        this.updateCurrentBird(timeStep);

        for (const bird of this.flownBirds) bird.updateFlight(timeStep);

        this.wakeUpTouchedLogos(timeStep);

        const lastShotBird = this.flownBirds.at(-1);
        const isReadyForNextBird = !this.currentBird && (!lastShotBird || lastShotBird.isFinished);

        if (isReadyForNextBird) this.spawnNextBird();
    }

    // rises while the pointer is around (or dragging), and hides again a moment after it leaves.
    private updateReveal(timeStep: number) {
        const wantsToBeVisible = this.staysRevealed || this.isPointerInRevealArea || this.band.isDragging;

        this.hideDelayLeft = wantsToBeVisible ? revealConfig.hideDelay : this.hideDelayLeft - timeStep;

        const direction = this.hideDelayLeft > 0 ? 1 : -1;
        const progressChange = direction * timeStep / revealConfig.duration;

        this.revealProgress = clamp(this.revealProgress + progressChange, 0, 1);
        this.applyReveal();
    }

    // moves the whole slingshot (and the bird in it) down by the hidden offset.
    private applyReveal() {
        const restPosition = {
            x: this.visibleRestPosition.x,
            y: this.visibleRestPosition.y + this.hiddenOffset
        };

        this.band.setRestPosition(restPosition);
        this.currentBird?.moveHop(this.waitingPosition, this.band.sittingPosition);
    }

    private updateCurrentBird(timeStep: number) {
        const bird = this.currentBird;
        if (!bird) return;

        bird.updateBlink(timeStep);

        if (bird.state === 'hopping') {
            const hasArrived = bird.updateHop(timeStep);
            if (hasArrived) this.band.sit();
            return;
        }

        if (bird.state === 'loaded') bird.followBand(this.band.bandPosition);
    }

    private spawnNextBird() {
        this.currentBird = new SlingshotBird(this.world, this.waitingPosition, this.band.sittingPosition);
    }

    // The logos float in their rack as static bodies. A logo only becomes dynamic right before a moving
    // body (a thrown bird, or a logo that is already awake) touches it, so the hit spreads from logo to
    // logo and the ones nobody touches stay in place.
    private wakeUpTouchedLogos(timeStep: number) {
        const bodies = [...this.world.bodies];

        const sleepingLogos = bodies.filter((body) => body.userData.name && body.type === 'static');
        if (sleepingLogos.length === 0) return;

        const movingBodies = bodies.filter((body) => body.userData.name && body.type === 'dynamic' && body.isCollisionEnabled);

        const movers = movingBodies.map((body) => {
            // the world only syncs transforms once per update, and this runs before every inner step.
            body.syncTransform();

            const distanceInTwoSteps = vectorLength(body.getLinearVelocity()) * timeStep * 2;
            const bounds = expandBounds(getBodyBounds(body), distanceInTwoSteps + logoWakeMargin);
            const bird = this.flownBirds.find((flownBird) => flownBird.body === body);

            return { bounds, bird };
        });

        for (const logo of sleepingLogos) {
            const logoBounds = getBodyBounds(logo);

            // a bird passing through a logo it was released inside does not touch it.
            const isTouched = movers.some(({ bounds, bird }) => !bird?.isIgnoring(logo) && boundsOverlap(bounds, logoBounds));

            if (isTouched) logo.setType('dynamic');
        }
    }

    private isInRevealArea(point: Vector) {
        const { left, right, above } = revealConfig.area;
        const rest = this.visibleRestPosition;

        const isInsideHorizontally = point.x > rest.x - left && point.x < rest.x + right;
        const isLowEnough = point.y > rest.y - above;

        return isInsideHorizontally && isLowEnough;
    }

    private isNearLoadedBird(point: Vector) {
        const bird = this.currentBird;
        if (!bird || bird.state !== 'loaded' || !this.isFullyRevealed) return false;

        return distanceBetween(point, bird.body.position) <= slingshotConfig.grabRadius;
    }

    private startDrag(point: Vector) {
        this.band.startDrag();
        this.band.stretchTo(point);

        document.body.classList.add('slingshot-dragging');
    }

    private stopDrag() {
        this.dragPointerId = null;
        this.release();
    }

    private release() {
        if (!this.band.isDragging) return;

        document.body.classList.remove('slingshot-dragging');

        const bird = this.currentBird;

        if (!bird || !this.band.isStretchedEnoughToShoot) {
            this.band.sit();
            return;
        }

        const velocity = this.band.release();

        bird.launch(velocity);

        this.currentBird = null;
        this.flownBirds.push(bird);
        this.removeOldBirds();
    }

    private removeOldBirds() {
        while (this.flownBirds.length > birdConfig.maxFlownBirds) {
            this.flownBirds.shift()?.destroy();
        }
    }

    private getSceneState() {
        const { band } = this;
        const birdStates = this.birds.flatMap((bird) => [bird.body.position.x, bird.body.position.y, bird.body.angle, bird.sprite]);

        return [
            this.hasPlacement,
            this.spriteVersion,
            band.restPosition.x, band.restPosition.y, band.bandPosition.x, band.bandPosition.y, band.bandAngle, band.state,
            ...birdStates
        ];
    }

    private setupPointerEvents() {
        const { signal } = this.abortController;
        const getWorldPosition = (event: PointerEvent) => this.renderer.getWorldPosition(event.clientX, event.clientY);
        const isFromDragPointer = (event: PointerEvent) => this.dragPointerId === event.pointerId;

        document.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            if (this.band.isDragging) return;

            const point = getWorldPosition(event);

            // a touch cannot hover over the slingshot to raise it, so pressing around it does that.
            if (event.pointerType !== 'mouse') this.isPointerInRevealArea = this.isInRevealArea(point);

            if (!this.isNearLoadedBird(point)) return;

            // stops the browser from starting a text selection under the bird.
            event.preventDefault();

            this.dragPointerId = event.pointerId;
            this.startDrag(point);
        }, { signal });

        document.addEventListener('pointermove', (event) => {
            if (this.band.isDragging && !isFromDragPointer(event)) return;

            const point = getWorldPosition(event);

            this.isPointerInRevealArea = this.isInRevealArea(point);

            if (this.band.isDragging) {
                this.band.stretchTo(point);
                return;
            }

            if (event.pointerType !== 'mouse') return;

            document.body.classList.toggle('slingshot-hover', this.isNearLoadedBird(point));
        }, { signal });

        // the pointer left the window.
        document.documentElement.addEventListener('pointerleave', () => {
            this.isPointerInRevealArea = false;
        }, { signal });

        // the page would scroll under the finger that is pulling the bird. pointerdown always comes
        // before touchstart, so the drag is already known here and only that touch is taken over.
        document.addEventListener('touchstart', (event) => {
            if (this.band.isDragging) event.preventDefault();
        }, { signal, passive: false });

        const endDrag = (event: PointerEvent) => {
            if (this.band.isDragging && !isFromDragPointer(event)) return;

            this.stopDrag();
        };

        document.addEventListener('pointerup', endDrag, { signal });
        document.addEventListener('pointercancel', endDrag, { signal });
        window.addEventListener('blur', () => this.stopDrag(), { signal });
    }
}
