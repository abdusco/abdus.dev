/*
 * Homepage line field: a warped sheet of fine ink strands, drawn live with WebGL2.
 * Ported from "FIELD — A study in lines" with the settings hardcoded:
 * density 280, depth 122%, speed 1x, wave strength 55%, wave speed 0.75x,
 * mouse rotation 11deg, fade half-life 3s.
 */
(() => {
    "use strict";

    const canvas = document.getElementById("field");
    if (!canvas) return;

    // settings
    // lines at desktop width (900px and up); narrower screens get more, up to MAX_DENSITY
    const BASE_DENSITY = 200;
    const MAX_DENSITY = 400;
    const densityFor = (width) => Math.min(MAX_DENSITY, Math.round((BASE_DENSITY * Math.max(1, 900 / width)) / 20) * 20);
    // fold depth at desktop width; narrower screens get deeper folds (square-root
    // scaling, up to MAX_DEPTH) so the sheet does not look flat on a tall, narrow canvas.
    // Rounded to 0.1 so small resizes do not regenerate the field.
    const BASE_DEPTH = 1.52;
    const MAX_DEPTH = 2.3;
    const depthFor = (width) =>
        width >= 900
            ? BASE_DEPTH
            : Math.min(MAX_DEPTH, Math.max(BASE_DEPTH, Math.round(BASE_DEPTH * Math.sqrt(900 / width) * 10) / 10));
    const SPEED = 1;
    const WAVE_STRENGTH = 0.75;
    const WAVE_SPEED = 0.95;
    const ROTATION = (11 * Math.PI) / 180;
    const DECAY = 1;
    // how long a finished field stays before the next one is drawn
    const HOLD_SECONDS = 15;

    // [paper, ink]: the site's accent (--c-accent) on the paper colour of each theme
    const PALETTES = { light: ["#eeece5", "#243ab5"], dark: ["#151d1c", "#7b8cf0"] };

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const darkQuery = matchMedia("(prefers-color-scheme: dark)");
    const isDark = () => darkQuery.matches && !document.documentElement.classList.contains("light");

    const VERTEX_SHADER = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec3 a_start;
layout(location=1) in vec3 a_end;
uniform sampler2D u_noise;
uniform vec2 u_viewport;
uniform vec4 u_camera;
uniform vec2 u_roll;
uniform vec2 u_pan;
uniform float u_scale;
uniform float u_distance;
uniform float u_strength;
uniform float u_progress;
uniform float u_segments;
uniform float u_dpr;
out float v_side;
vec3 deform(vec3 p){
  vec2 g=clamp((p.xy/16.0+1.0)*24.0,vec2(0.0),vec2(47.999));
  ivec2 c=ivec2(floor(g));vec2 f=fract(g);
  vec3 a=texelFetch(u_noise,c,0).xyz;
  vec3 b=texelFetch(u_noise,c+ivec2(1,0),0).xyz;
  vec3 d=texelFetch(u_noise,c+ivec2(0,1),0).xyz;
  vec3 e=texelFetch(u_noise,c+ivec2(1,1),0).xyz;
  return p+mix(mix(a,b,f.x),mix(d,e,f.x),f.y)*u_strength;
}
vec2 project(vec3 p){
  float x=p.x*u_camera.x+p.z*u_camera.y;
  float z=-p.x*u_camera.y+p.z*u_camera.x;
  float y=p.y*u_camera.z-z*u_camera.w;
  z=p.y*u_camera.w+z*u_camera.z;
  float perspective=u_distance/(u_distance-z);
  vec2 q=vec2(x*u_roll.x-y*u_roll.y,x*u_roll.y+y*u_roll.x);
  return u_viewport*vec2(0.5,0.47)+q*u_scale*perspective+u_pan*u_viewport;
}
void main(){
  float index=float(gl_InstanceID);
  float row=floor(index/u_segments),segment=mod(index,u_segments);
  float visible=clamp((u_progress-row)*u_segments-segment,0.0,1.0);
  vec2 a=project(deform(a_start));
  vec2 b=project(deform(mix(a_start,a_end,visible)));
  vec2 direction=b-a;
  vec2 normal=vec2(-direction.y,direction.x)/max(length(direction),0.0001);
  bool endVertex=gl_VertexID>=2;
  float side=(gl_VertexID==0||gl_VertexID==2)?-1.0:1.0;
  float halfWidth=0.31+0.5/u_dpr;
  vec2 pixel=(endVertex?b:a)+normal*halfWidth*side;
  vec2 clip=pixel/u_viewport*2.0-1.0;
  gl_Position=vec4(clip.x,-clip.y,0.0,1.0);
  v_side=halfWidth*side;
}`;

    const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec3 u_color;
uniform float u_opacity;
uniform float u_dpr;
in float v_side;
out vec4 outColor;
void main(){
  float coverage=clamp((0.31-abs(v_side))*u_dpr+0.5,0.0,1.0);
  outColor=vec4(u_color,coverage*u_opacity*0.84);
}`;

    const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

    class FieldRenderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.layers = new Set();
            this.lost = false;
            this.gl = canvas.getContext("webgl2", {
                alpha: false,
                antialias: true,
                preserveDrawingBuffer: false,
                powerPreference: "high-performance",
            });
            if (!this.gl) throw new Error("WebGL 2 unavailable");
            this.initialize();
            canvas.addEventListener("webglcontextlost", (e) => {
                e.preventDefault();
                this.lost = true;
            });
            canvas.addEventListener("webglcontextrestored", () => {
                this.lost = false;
                this.initialize();
                for (const layer of this.layers) this.uploadLayer(layer);
            });
        }

        initialize() {
            const gl = this.gl;
            const compile = (type, source) => {
                const shader = gl.createShader(type);
                gl.shaderSource(shader, source);
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    const message = gl.getShaderInfoLog(shader);
                    gl.deleteShader(shader);
                    throw new Error(message);
                }
                return shader;
            };
            const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
            const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
            this.program = gl.createProgram();
            gl.attachShader(this.program, vertex);
            gl.attachShader(this.program, fragment);
            gl.linkProgram(this.program);
            gl.deleteShader(vertex);
            gl.deleteShader(fragment);
            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(this.program));
            }
            this.uniforms = {};
            for (const name of [
                "noise",
                "viewport",
                "camera",
                "roll",
                "pan",
                "scale",
                "distance",
                "strength",
                "progress",
                "segments",
                "dpr",
                "color",
                "opacity",
            ]) {
                this.uniforms[name] = gl.getUniformLocation(this.program, "u_" + name);
            }
            this.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 49, 49, 0, gl.RGBA, gl.FLOAT, new Float32Array(49 * 49 * 4));
            this.noiseDirty = true;
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.disable(gl.DEPTH_TEST);
        }

        createLayer(rows, drawn, partial, color) {
            const segments = rows[0].length - 1;
            const data = new Float32Array(rows.length * segments * 6);
            let k = 0;
            let radius = 0;
            for (const line of rows) {
                for (const p of line) radius = Math.max(radius, Math.hypot(...p));
                for (let i = 0; i < segments; i++) {
                    data.set(line[i], k);
                    data.set(line[i + 1], k + 3);
                    k += 6;
                }
            }
            const layer = { data, segments, lineCount: rows.length, radius, drawn, partial, color, opacity: 1, age: 0 };
            this.layers.add(layer);
            if (!this.lost) this.uploadLayer(layer);
            return layer;
        }

        uploadLayer(layer) {
            const gl = this.gl;
            layer.buffer = gl.createBuffer();
            layer.vao = gl.createVertexArray();
            gl.bindVertexArray(layer.vao);
            gl.bindBuffer(gl.ARRAY_BUFFER, layer.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, layer.data, gl.STATIC_DRAW);
            for (let i = 0; i < 2; i++) {
                gl.enableVertexAttribArray(i);
                gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 24, i * 12);
                gl.vertexAttribDivisor(i, 1);
            }
            gl.bindVertexArray(null);
        }

        disposeLayer(layer) {
            if (!this.lost) {
                this.gl.deleteBuffer(layer.buffer);
                this.gl.deleteVertexArray(layer.vao);
            }
            this.layers.delete(layer);
            layer.data = null;
            layer.buffer = null;
            layer.vao = null;
        }

        resize(width, height, dpr) {
            this.width = width;
            this.height = height;
            this.dpr = dpr;
            this.canvas.width = Math.round(width * dpr);
            this.canvas.height = Math.round(height * dpr);
        }

        render(layers, camera, paper, noise, uploadNoise) {
            if (this.lost) return;
            const gl = this.gl;
            const u = this.uniforms;
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.clearColor(...hexToRgb(paper), 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(this.program);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            if (uploadNoise || this.noiseDirty) {
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 49, 49, gl.RGBA, gl.FLOAT, noise);
                this.noiseDirty = false;
            }
            gl.uniform1i(u.noise, 0);
            gl.uniform2f(u.viewport, this.width, this.height);
            gl.uniform4f(u.camera, camera.cy, camera.sy, camera.cx, camera.sx);
            gl.uniform2f(u.roll, camera.cz, camera.sz);
            gl.uniform2f(u.pan, camera.panX, camera.panY);
            gl.uniform1f(u.scale, camera.scale);
            gl.uniform1f(u.distance, camera.distance);
            gl.uniform1f(u.strength, camera.strength);
            gl.uniform1f(u.dpr, this.dpr);
            for (const layer of layers) {
                const progress = layer.drawn + layer.partial;
                const count = Math.min(layer.lineCount * layer.segments, layer.drawn * layer.segments + Math.ceil(layer.partial * layer.segments));
                if (!count) continue;
                gl.bindVertexArray(layer.vao);
                gl.uniform1f(u.progress, progress);
                gl.uniform1f(u.segments, layer.segments);
                gl.uniform3fv(u.color, hexToRgb(layer.color));
                gl.uniform1f(u.opacity, layer.opacity);
                gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
            }
            gl.bindVertexArray(null);
        }
    }

    let renderer;
    try {
        renderer = new FieldRenderer(canvas);
    } catch (error) {
        console.warn("field: WebGL 2 unavailable, skipping animation", error);
        canvas.remove();
        return;
    }

    // seeded random + improved Perlin noise (the third dimension is time)
    function rng(n) {
        return () => {
            n |= 0;
            n = (n + 0x6d2b79f5) | 0;
            let t = Math.imul(n ^ (n >>> 15), 1 | n);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function createNoise(seedValue) {
        const random = rng(seedValue);
        const values = Array.from({ length: 256 }, (_, i) => i);
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }
        const perm = Uint16Array.from({ length: 512 }, (_, i) => values[i & 255]);
        const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
        const mix = (a, b, t) => a + t * (b - a);
        const gradient = (hash, x, y, z) => {
            const h = hash & 15;
            const u = h < 8 ? x : y;
            const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
            return (h & 1 ? -u : u) + (h & 2 ? -v : v);
        };
        return (x, y, z) => {
            const fx = Math.floor(x),
                fy = Math.floor(y),
                fz = Math.floor(z);
            const X = fx & 255,
                Y = fy & 255,
                Z = fz & 255;
            x -= fx;
            y -= fy;
            z -= fz;
            const u = fade(x),
                v = fade(y),
                w = fade(z);
            const A = perm[X] + Y,
                AA = perm[A] + Z,
                AB = perm[A + 1] + Z;
            const B = perm[X + 1] + Y,
                BA = perm[B] + Z,
                BB = perm[B + 1] + Z;
            return mix(
                mix(
                    mix(gradient(perm[AA], x, y, z), gradient(perm[BA], x - 1, y, z), u),
                    mix(gradient(perm[AB], x, y - 1, z), gradient(perm[BB], x - 1, y - 1, z), u),
                    v,
                ),
                mix(
                    mix(gradient(perm[AA + 1], x, y, z - 1), gradient(perm[BA + 1], x - 1, y, z - 1), u),
                    mix(gradient(perm[AB + 1], x, y - 1, z - 1), gradient(perm[BB + 1], x - 1, y - 1, z - 1), u),
                    v,
                ),
                w,
            );
        };
    }

    const perlin = createNoise(84271);
    const gridSize = 49;
    const gridExtent = 16;
    const waveGrid = new Float32Array(gridSize * gridSize * 4);
    const clamp = (value) => Math.max(-1, Math.min(1, value));

    let w = 0,
        h = 0,
        dpr = 1,
        density = BASE_DENSITY, // set per field by densityFor(w)
        depth = BASE_DEPTH; // set per field by depthFor(w)
    // random start, so the first sweep differs on every visit
    let drawn = 0,
        partial = 0,
        seed = Math.floor(Math.random() * 100000),
        elapsed = 0,
        hold = 0,
        last = 0;
    let angleX = -0.12,
        angleY = 0.05,
        mouseX = 0,
        mouseY = 0,
        panX = 0,
        panY = 0,
        swivel = 0;
    let waveTime = Math.random() * 1000,
        noiseVersion = -1,
        dirty = true,
        visible = true;
    let active = null;
    let history = [];
    let pointerPrevious = null;
    let dark = isDark();

    const palette = () => PALETTES[dark ? "dark" : "light"];

    function updateWaveGrid() {
        const t = waveTime * 0.35;
        for (let j = 0; j < gridSize; j++) {
            for (let i = 0; i < gridSize; i++) {
                const x = ((i / (gridSize - 1)) * 2 - 1) * gridExtent;
                const y = ((j / (gridSize - 1)) * 2 - 1) * gridExtent;
                const broad = perlin(x * 0.28, y * 0.28, t);
                const detail = perlin(x * 0.56 + 13.2, y * 0.56 - 7.9, t * 0.8 + 4.2);
                const n = broad * 0.75 + detail * 0.25;
                const k = (j * gridSize + i) * 4;
                waveGrid[k] = detail * 0.2;
                waveGrid[k + 1] = broad * 0.16;
                waveGrid[k + 2] = n * 1.1 + Math.sin(x * 0.7 + y * 0.5 + waveTime * 0.8) * 0.12;
            }
        }
    }

    function retireHistory(index) {
        renderer.disposeLayer(history[index]);
        history.splice(index, 1);
    }

    function fadeHistory(seconds) {
        for (let i = history.length - 1; i >= 0; i--) {
            const layer = history[i];
            layer.age += seconds;
            layer.opacity = Math.pow(2, -layer.age / DECAY);
            if (layer.opacity <= 0.01 || layer.age >= DECAY * 7) retireHistory(i);
        }
    }

    function generate() {
        // the previous field fades out while the next one is drawn
        if (active && (drawn > 0 || partial > 0) && !reducedMotion) {
            active.drawn = drawn;
            active.partial = partial;
            history.push(active);
            if (history.length > 2) retireHistory(0);
        } else if (active) {
            renderer.disposeLayer(active);
        }

        const random = rng(seed * 31291 + 1703);
        const phases = Array.from({ length: 8 }, () => random() * Math.PI * 2);
        density = densityFor(w);
        depth = depthFor(w);
        const segments = Math.min(w < 650 ? 320 : 480, Math.max(80, Math.floor(240000 / density)));
        // golden-angle steps spread successive sweeps across all compass directions
        const sweepAngle = (seed * Math.PI * (3 - Math.sqrt(5))) % (Math.PI * 2);
        const sweepCos = Math.cos(sweepAngle);
        const sweepSin = Math.sin(sweepAngle);
        const reverseStrands = random() > 0.5;
        const rows = [];

        for (let r = 0; r < density; r++) {
            const v = (r / (density - 1) - 0.5) * 6.3;
            const line = [];
            for (let i = 0; i <= segments; i++) {
                const u = 2.75 * Math.sinh(((i / segments) * 2 - 1) * Math.asinh(4));
                // a continuous warped sheet: every ink strand lives on the same 3D surface
                const a = phases[0],
                    b = phases[1];
                const wave = Math.sin(u * 1.5 + v * 1.3 + a);
                const curl = Math.sin(v * 1.6 - u * 0.48 + b);
                let x = u + 0.34 * Math.sin(v * 1.8 + u * 0.65 + a) + 0.12 * Math.sin(v * 4.2 + b);
                let y = v + 0.3 * Math.sin(u * 1.6 + v * 0.5 + b) + 0.15 * wave;
                let z = depth * (0.52 * wave + 0.48 * curl + 0.19 * Math.sin(u * 2.6 - v * 2.5 + phases[2]));
                const dx = u - 0.65 * Math.sin(a);
                const dy = v - 0.4 * Math.cos(b);
                const radius = Math.sqrt(dx * dx + dy * dy);
                z -= depth * 0.65 * Math.exp(-radius * radius * 0.9);
                x += depth * 0.22 * Math.sin(radius * 2 + a) * dy;
                y -= depth * 0.2 * Math.sin(radius * 2 + a) * dx;
                line.push([x * sweepCos - y * sweepSin, x * sweepSin + y * sweepCos, z]);
            }
            if (reverseStrands) line.reverse();
            rows.push(line);
        }

        drawn = reducedMotion ? density : 0;
        partial = 0;
        elapsed = 0;
        hold = 0;
        active = renderer.createLayer(rows, drawn, partial, palette()[1]);
        dirty = true;
    }

    function redraw() {
        if (!active) return;
        const uploadNoise = WAVE_STRENGTH && !reducedMotion && noiseVersion !== waveTime;
        if (uploadNoise) {
            updateWaveGrid();
            noiseVersion = waveTime;
        }
        let radius = active.radius;
        for (const layer of history) radius = Math.max(radius, layer.radius);
        const camera = {
            cy: Math.cos(angleY),
            sy: Math.sin(angleY),
            cx: Math.cos(angleX),
            sx: Math.sin(angleX),
            cz: Math.cos(swivel),
            sz: Math.sin(swivel),
            scale: Math.max(w / 4.55, h / 2.7),
            distance: Math.max(4.9, radius + 5),
            panX,
            panY,
            strength: reducedMotion ? 0 : WAVE_STRENGTH,
        };
        active.drawn = drawn;
        active.partial = partial;
        renderer.render([...history, active], camera, palette()[0], waveGrid, uploadNoise);
        dirty = false;
    }

    function frame(time) {
        const elapsedSeconds = last ? (time - last) / 1000 : 1 / 60;
        const dt = Math.min(elapsedSeconds, 0.05);
        last = time;
        requestAnimationFrame(frame);
        if (document.hidden || !visible) {
            last = 0;
            return;
        }

        if (!reducedMotion) {
            waveTime += dt * WAVE_SPEED;
            const smoothing = 1 - Math.exp(-dt * 3.2);
            angleX += (-0.12 + mouseY * ROTATION - angleX) * smoothing;
            angleY += (0.05 + mouseX * ROTATION - angleY) * smoothing;
            panX += (mouseX * 0.012 - panX) * smoothing;
            panY += (mouseY * 0.012 - panY) * smoothing;
            swivel += (mouseX * mouseY * ROTATION * 0.2 - swivel) * smoothing;
        }

        if (drawn < density) {
            elapsed += dt * SPEED;
            // the duration depends on the base density, so denser fields are not drawn slower
            const t = Math.min(1, elapsed / ((BASE_DENSITY / 64) * 1.3));
            const position = density * Math.sin((t * Math.PI) / 2);
            drawn = t === 1 ? density : Math.floor(position);
            partial = drawn === density ? 0 : position - drawn;
        }

        fadeHistory(elapsedSeconds);
        redraw();

        if (drawn === density && !reducedMotion) {
            hold += dt;
            if (hold > HOLD_SECONDS) {
                seed++;
                generate();
            }
        }
    }

    function resize() {
        w = canvas.clientWidth;
        h = canvas.clientHeight;
        if (!w || !h) return;
        dpr = Math.min(devicePixelRatio || 1, 2);
        renderer.resize(w, h, dpr);
        dirty = true;
        // a different width (rotation, window resize) may need a different line count or
        // depth; height-only changes like a mobile address bar must not restart the drawing
        if (!active || densityFor(w) !== density || depthFor(w) !== depth) generate();
        else redraw();
    }

    function applyTheme() {
        dark = isDark();
        const ink = palette()[1];
        if (active) active.color = ink;
        for (const layer of history) layer.color = ink;
        dirty = true;
        if (reducedMotion) redraw();
    }

    // moving the pointer turns the sheet a little
    addEventListener("pointermove", (e) => {
        // touch is handled below: the browser cancels touch pointers once the page scrolls
        if (reducedMotion || e.pointerType === "touch") return;
        if (pointerPrevious && pointerPrevious.id === e.pointerId) {
            mouseX = clamp(mouseX + ((e.clientX - pointerPrevious.x) / innerWidth) * 2);
            mouseY = clamp(mouseY + ((e.clientY - pointerPrevious.y) / innerHeight) * 2);
        }
        pointerPrevious = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    const forgetPointer = () => (pointerPrevious = null);
    addEventListener("blur", forgetPointer);
    document.documentElement.addEventListener("pointerleave", forgetPointer);

    // touch: dragging a finger sideways turns the sheet like moving a mouse, and
    // scrolling turns it up and down (scroll events also carry the momentum after
    // the finger lifts). Scrolling down moves the content like a finger moving up,
    // so it maps to a mouse moving up.
    if (matchMedia("(pointer: coarse)").matches && !reducedMotion) {
        let touchX = null;
        let scrollY = window.scrollY;
        addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
        addEventListener(
            "touchmove",
            (e) => {
                const x = e.touches[0].clientX;
                if (touchX !== null) mouseX = clamp(mouseX + ((x - touchX) / innerWidth) * 2);
                touchX = x;
            },
            { passive: true },
        );
        const forgetTouch = () => (touchX = null);
        addEventListener("touchend", forgetTouch, { passive: true });
        addEventListener("touchcancel", forgetTouch, { passive: true });
        addEventListener(
            "scroll",
            () => {
                mouseY = clamp(mouseY - ((window.scrollY - scrollY) / innerHeight) * 2);
                scrollY = window.scrollY;
            },
            { passive: true },
        );
    }

    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(canvas);
    new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    darkQuery.addEventListener("change", applyTheme);

    resize();
    requestAnimationFrame(frame);
})();
