import { loadAllSVGs } from './svg.js';
import { loadNavbar } from './navbar.js';

loadAllSVGs();

window.addEventListener('load', () => {
    loadNavbar();
    document.body.removeAttribute('class');
});