export async function loadSVG(svgElement) {
    const hasContent = svgElement.children.length > 0;

    if (hasContent) return;

    const src = svgElement.getAttribute('src');
    const response = await fetch(src);

    if (!response.ok) {
        throw new Error(`Failed to fetch SVG: ${response.statusText}`);
    }

    svgElement.removeAttribute('src');

    const text = await response.text();
    const temp = document.createElement('div');

    temp.innerHTML = text;

    const newElement = temp.querySelector('svg');

    for (const { name, value } of svgElement.attributes) {
        newElement.setAttribute(name, value);
    }

    svgElement.replaceWith(newElement);
}

export function loadAllSVGs() {
    const svgElements = document.querySelectorAll('svg[src]');

    for (const svgElement of svgElements) loadSVG(svgElement);
}