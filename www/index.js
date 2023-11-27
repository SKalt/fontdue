// @ts-check
import * as wasm from "fontdue-you-see-it";
import {memory} from "fontdue-you-see-it/fontdue_you_see_it_bg";

function getCanvasA() {
    const existing = document.getElementById("canvas-a");
    if (existing) {
        return /** @type {HTMLCanvasElement} */(existing);
    }
    const elem = document.createElement("canvas");
    elem.id = "canvas-a";
    document.getElementById("samples").appendChild(elem);
    return elem;
}

function getCanvasB() {
    const existing = document.getElementById("canvas-b");
    if (existing) {
        return /** @type {HTMLCanvasElement} */(existing);
    }
    const elem = document.createElement("canvas");
    elem.id = "canvas-b";
    document.getElementById("samples").appendChild(elem);
    return elem;
}

/**
 * @param {Uint8ClampedArray} buffer 
 * @param {number} width 
 * @param {number} height 
 */
function logFormatted(buffer, width, height) {
    let lines = [];
    for (let y = 0; y < height; y++) {
        let line = [];
        for (let x = 0; x < width; x++) {
            let val = "" + buffer[y * width + x];
            while (val.length < 3) {
                val = " " + val;
            }
            line.push(val);
        }
        lines.push(line.join(" "));
    }
    console.log(lines.join("\n"))
    console.log(width, height);
}

/**
 * 
 * @param {number} x 
 * @param {number} min 
 * @param {number} max 
 */
function clamp(x, min, max) {
    return x < min ? min : x > max ? max : x;
}

/**
 * @param {number} intensity
 */
function linearIntensityTosRGBIntensity(intensity) {
    const scaled = intensity / 255;
    const converted = scaled <= 0.0031308 ? scaled * 12.92 : 1.055 * Math.pow(scaled, 1/2.4) - 0.055;
    const rescaled = converted * 255;
    return clamp(Math.round(rescaled), 0, 255);
}

function renderFontdueCharacter(char = "¾", size = 600) {
    const rednerResult = wasm.render(size, char);
    const textureRaw = new Uint8ClampedArray(memory.buffer, rednerResult.bitmap.offset(), rednerResult.bitmap.size());
    const clampedFullColor = new Uint8ClampedArray(textureRaw.length * 4);
    for (let i = 0; i < textureRaw.length; i++) {
        const intensity = linearIntensityTosRGBIntensity(255 - textureRaw[i]);
        clampedFullColor[i*4] = intensity;
        clampedFullColor[i*4 + 1] = intensity;
        clampedFullColor[i*4 + 2] = intensity;
        clampedFullColor[i*4 + 3] = 255;
    }
    const image = new ImageData(clampedFullColor, rednerResult.width, rednerResult.height);
    const elem = getCanvasA();
    elem.height = rednerResult.height + 20;
    elem.width = rednerResult.width + 20;
    const ctx = elem.getContext("2d");
    ctx.putImageData(image, 10, 10);
    const [xmin, ymin] = [rednerResult.xmin, rednerResult.ymin];
    rednerResult.free();
    return [elem.height, elem.width, xmin, ymin];
}

function renderBuiltinCharacter(char = "¾", xmin, ymin, height = 200, width = 200, size = 600) {
    const elem = getCanvasB();
    elem.height = height;
    elem.width = width;
    const ctx = elem.getContext("2d");
    ctx.font = `${size}px 'Roboto Mono'`;
    ctx.fillText(char, 10 - xmin, height + ymin - 10);
}

function init() {
    const input = /** @type {HTMLInputElement} */(document.getElementById("input"));
    input.addEventListener("change", function () {
        const present = wasm.has_glyph(this.value);
        const char = present ? this.value : "?";
        const [height, width, xmin, ymin] = renderFontdueCharacter(char);
        renderBuiltinCharacter(char, xmin, ymin, height, width);
        /** @type {HTMLElement} */(document.getElementById("warning")).innerHTML = present ? "" : "Character missing from font bundled into page.";
    });
    const [height, width, xmin, ymin] = renderFontdueCharacter();
    renderBuiltinCharacter(undefined, xmin, ymin, height, width);
}

if (/** @type {*} */(document).fonts && /** @type {*} */(document).fonts.ready) {
    /** @type {*} */(document).fonts.ready.then(init);
}
else {
    init();
}
