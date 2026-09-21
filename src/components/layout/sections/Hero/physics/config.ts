// every logo is 1x1 meter, so this is the on-screen size of a logo.
export const pixelsPerMeter = 68;
export const wallThickness = 100;

// keeps the on-screen acceleration at 1000px/s², so the logos fall at the same visual speed at any scale.
const gravityInPixels = 1000;
export const worldGravity = gravityInPixels / pixelsPerMeter;
export const rackItemRadius = 0.75;

// box2d v3 contacts are springs, and their stiffness is capped at a quarter of the step rate. At one
// step per frame the logos could sink up to ~30cm into each other when thrown or dragged; splitting
// each frame into 4 steps allows 60Hz contacts, which keeps the overlaps under ~5cm (measured with
// the real logo shapes) for about 0.7ms of extra cpu per frame while they move.
export const physicsWorldOptions = {
    stepsPerUpdate: 4,
    subStepCount: 2,
    contactHertz: 60
};

const queryParams = new URLSearchParams(window.location.href.split('?')[1]);

// draws the collision polygons of every body over the logos. enabled with ?physics_debug=true
export const debugPhysics = queryParams.get('physics_debug') === 'true';

export const themeLogoColors = {
    dark: 'rgba(255, 255, 255, 1)',
    light: 'rgba(0, 0, 0, 0.875)'
};