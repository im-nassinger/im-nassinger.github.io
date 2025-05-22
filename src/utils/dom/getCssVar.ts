export function getCssVar(varName: string, element = document.body) {
    return getComputedStyle(element).getPropertyValue(varName).trim();
}