function handleRangeInput(rangeInput) {
    const valueElement = rangeInput
        .closest('.input-wrap')
        .querySelector('.value');

    const updateValue = () => valueElement.textContent = rangeInput.value;

    updateValue();

    rangeInput.addEventListener('input', updateValue);
}

const rectWidthInput = document.querySelector('#rectangle-width');
const rectHeightInput = document.querySelector('#rectangle-height');
const jointButton = document.querySelector('#joint-button');
const instructionsWrap = document.querySelector('.instructions-wrap');
const okButton = document.querySelector('#ok');
const showInfoButton = document.querySelector('#show-info-button');
const instructionsShown = localStorage.getItem('instructionsShown');

handleRangeInput(rectWidthInput);
handleRangeInput(rectHeightInput);

const cachedHasJoints = localStorage.getItem('hasJoints') === 'true';

jointButton.classList.toggle('disabled', !cachedHasJoints);

jointButton.addEventListener('click', () => {
    jointButton.classList.toggle('disabled');

    const hasJoints = !jointButton.classList.contains('disabled');

    localStorage.setItem('hasJoints', hasJoints.toString());
});

instructionsWrap.classList.toggle('hidden', instructionsShown === 'true');

okButton.addEventListener('click', () => {
    instructionsWrap.classList.add('hidden');
    localStorage.setItem('instructionsShown', 'true');
});

showInfoButton.addEventListener('click', () => {
    instructionsWrap.classList.remove('hidden');
    localStorage.setItem('instructionsShown', 'false');
});

const xmlTextarea = document.querySelector('#xml-textarea');

function debounce(callback, delay) {
    let timeoutId;

    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback(...args), delay);
    };
}

const goBackDebounce = debounce(() => xmlTextarea.scrollTop = 0, 1000);

xmlTextarea.addEventListener('keyup', goBackDebounce);

const copyButton = document.querySelector('#generate');

copyButton.addEventListener('click', generate);

function getPoints(shape, path) {
    const shapeX = parseFloat(shape.getAttribute('p0'));
    const shapeY = parseFloat(shape.getAttribute('p1'));
    const commands = [];
    const points = [];
    const n = parseInt(path.getAttribute('n'));

    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }

        toString() {
            return `${this.x},${this.y}`;
        }
    }

    for (let i = 0; i < n; i++) {
        const value = path.getAttribute('v' + i);
        if (!value) break;

        let [ x, y, dx0, dy0, dx1, dy1 ] = value.split('_').map(Number);

        x = shapeX + x;
        y = shapeY + y;

        const point = new Point(x, y);

        const hasPrevCtrlPoint = dx0 !== undefined && dy0 !== undefined;
        const hasNextCtrlPoint = dx1 !== undefined && dy1 !== undefined;

        if (hasPrevCtrlPoint) point.prevCtrlPoint = new Point(x + dx0, y + dy0);
        if (hasNextCtrlPoint) point.nextCtrlPoint = new Point(x + dx1, y + dy1);
        
        points.push(point);
    }
        
    const firstPoint = points[0];

    commands.push(`M${firstPoint}`);

    for(let i = 0; i < points.length; i ++) {
        const p1 = points[i];
        const p2 = points[i + 1] || points[0];

        if (!p1.nextCtrlPoint && p2.prevCtrlPoint) {
            // quadratic bezier curve
            commands.push(`Q${p2.prevCtrlPoint} ${p2}`);
        } else if (p1.nextCtrlPoint && p2.prevCtrlPoint) {
            // cubic bezier curve
            commands.push(`C${p1.nextCtrlPoint} ${p2.prevCtrlPoint} ${p2}`);
        } else if (p1.nextCtrlPoint && !p2.prevCtrlPoint) {
            // quadratic bezier curve
            commands.push(`Q${p1.nextCtrlPoint} ${p2}`);
        } else if (!p1.nextCtrlPoint && !p2.prevCtrlPoint) {
            // line
            commands.push(`L${p2}`);
        }
    }

    commands.pop();

    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    const width = 20000;
    const height = 10000;
    const renderScale = 0.1;
    svgElement.setAttribute('width', width * renderScale);
    svgElement.setAttribute('height', height * renderScale);
    svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const d = [];

    for (const command of commands) d.push(command);

    pathElement.setAttribute('d', d.join(' '));
    pathElement.setAttribute('fill', 'none');
    pathElement.setAttribute('stroke', 'black');
    pathElement.setAttribute('stroke-width', '6');
    
    svgElement.appendChild(pathElement);

    const length = pathElement.getTotalLength();
    const rectsPerMeter = parseFloat(rectWidthInput.value);

    points.length = 0;

    for (let i = 0; i < length; i += rectsPerMeter) {
        const point = pathElement.getPointAtLength(i);
        points.push(point);
    }

    console.log(svgElement.outerHTML);

    return points;
}

function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

function distanceBetween(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

function rad2deg(rad) {
    return rad * 180 / Math.PI;
}

let rectId = 0;

function generateRectangles(points) {
    const rectangles = [];
    const height = parseFloat(rectHeightInput.value);

    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        const centerX = (p1.x + p2.x) / 2;
        const centerY = (p1.y + p2.y) / 2;

        const distance = distanceBetween(p1.x, p1.y, p2.x, p2.y);
        const angle = angleBetween(p1.x, p1.y, p2.x, p2.y);

        rectangles.push({
            x: centerX,
            y: centerY,
            width: distance,
            height,
            rotation: rad2deg(angle) - 180,
            _id: rectId ++,
            _angleRad: angle
        });
    }

    return rectangles;
}

function convertRectangles(xml, rectangles, fixed) {
    const shapes = [];

    for (const rectangle of rectangles) {
        const shape = xml.createElement('sh');

        const attributes = {
            t: '0',
            p0: rectangle.x,
            p1: rectangle.y,
            p2: rectangle.width,
            p3: rectangle.height,
            p4: rectangle.rotation,
            p5: fixed ? 't' : 'f',
            p6: 'f',
            p7: '1',
            p8: '4032711',
            p9: '-1',
            p10: '100',
            p11: '1'
        };

        for (const key in attributes) {
            const value = attributes[key];
            shape.setAttribute(key, value);
        }

        shapes.push(shape);
    }

    return shapes;
}

function connectRectangles(xml, rectangles) {
    const joints = [];

    for (let i = 0; i < rectangles.length; i ++) {
        const r1 = rectangles[i];
        const r2 = rectangles[i + 1];

        if (!r2) continue;
           
        const joint = xml.createElement('j');

        const angle = r1._angleRad + Math.PI / 2;
        const x = r1.x + Math.sin(angle) * (r1.width / 2);
        const y = r1.y - Math.cos(angle) * (r1.width / 2);

        const attributes = {
            t: '0',
            x,
            y,
            b1: r1._id,
            b2: r2._id,
            ua: 90,
            la: -90,
            m: 'f',
            tq: 50,
            sp: 3,
            c: 'f'
        };

        for (const key in attributes) {
            const value = attributes[key];
            joint.setAttribute(key, value);
        }

        joints.push(joint);
    }

    console.log(joints);

    return joints;
}

function generate() {
    const xmlString = xmlTextarea.value;

    if (!xmlString) return alert('Please enter the Level XML');

    rectId = 0;

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, 'text/xml');
    const levelXML = xml.documentElement;

    const shapesContainer = levelXML.querySelector('shapes');
    const shapes = shapesContainer.querySelectorAll('sh[t="4"]');

    const hasJoints = !jointButton.classList.contains('disabled');

    let jointsContainer;

    if (hasJoints) {
        jointsContainer = levelXML.querySelector('joints');

        if (!jointsContainer) {
            jointsContainer = xml.createElement('joints');
            
            levelXML.appendChild(jointsContainer);
        }
    }

    for (const shape of shapes) {
        const path = shape.querySelector('v[f="f"]');
        if (!path) continue;

        const points = getPoints(shape, path);
        const rectangles = generateRectangles(points);
        const shapes = convertRectangles(xml, rectangles, !hasJoints);

        for (const shape of shapes) {
            shapesContainer.appendChild(shape);
        }

        if (hasJoints) {
            const joints = connectRectangles(xml, rectangles);

            for (const joint of joints) {
                jointsContainer.appendChild(joint);
            }
        }

        shapesContainer.removeChild(shape);
    }

    navigator.clipboard.writeText(levelXML.outerHTML);

    alert('Level XML copied to clipboard :)');
}