(async () => {
    "use strict";

    const figure = document.querySelector(".portrait-effect");
    if (!figure) return;

    const image = figure.querySelector("img");
    const canvas = figure.querySelector("canvas");
    const imageFrame = figure.querySelector(".portrait-effect__image");

    // Keep the theme's loading background until the photograph can be uploaded.
    try {
        await image.decode();
    } catch (error) {
        imageFrame.classList.remove("is-loading");
        return;
    }

    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!gl) {
        imageFrame.classList.remove("is-loading");
        return;
    }

    const vertexSource = `#version 300 es
    precision highp float;
    in vec2 a_position;
    out vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }`;

    const fragmentSource = `#version 300 es
    precision highp float;
    uniform sampler2D u_image;
    uniform vec2 u_resolution;
    uniform vec2 u_image_size;
    uniform vec2 u_mouse;
    uniform float u_pixel_size;
    uniform float u_contrast;
    uniform float u_amount;
    uniform float u_motion;
    uniform float u_focus;
    uniform float u_fine_size;
    uniform float u_radius;
    uniform vec2 u_direction;
    uniform float u_blob;
    uniform float u_time;
    uniform float u_stretch;
    uniform vec3 u_shadow;
    uniform vec3 u_highlight;
    in vec2 v_uv;
    out vec4 out_color;

    float bayer4(ivec2 p) {
      int x = p.x & 3;
      int y = p.y & 3;
      int index = y * 4 + x;
      float values[16] = float[16](
        0.0, 8.0, 2.0, 10.0,
        12.0, 4.0, 14.0, 6.0,
        3.0, 11.0, 1.0, 9.0,
        15.0, 7.0, 13.0, 5.0
      );
      return (values[index] + 0.5) / 16.0;
    }

    vec3 ditherAt(vec2 uv, float cell) {
      vec2 cell_count = max(vec2(1.0), u_resolution / cell);
      vec2 cell_uv = (floor(uv * cell_count) + 0.5) / cell_count;
      // Match object-fit: cover while keeping the photo's aspect ratio.
      float viewport_aspect = u_resolution.x / u_resolution.y;
      float image_aspect = u_image_size.x / u_image_size.y;
      vec2 cover_scale = vec2(min(1.0, viewport_aspect / image_aspect), min(1.0, image_aspect / viewport_aspect));
      vec2 image_uv = (cell_uv - 0.5) * cover_scale + 0.5;
      vec3 source = texture(u_image, image_uv).rgb;
      float luminance = dot(source, vec3(0.2126, 0.7152, 0.0722));
      luminance = clamp((luminance - 0.5) * u_contrast + 0.5, 0.0, 1.0);
      ivec2 pattern = ivec2(floor(uv * u_resolution / cell));
      float threshold = bayer4(pattern);
      float ink = step(threshold, luminance);
      vec3 dithered = mix(u_shadow, u_highlight, ink);
      return mix(source, dithered, u_amount);
    }

    void main() {
      vec2 pixel = v_uv * u_resolution;
      vec2 pointer = u_mouse * u_resolution;
      float cell = u_pixel_size;
      float radius = u_radius * u_focus * u_motion;

      // Subdivide whole tiles. Every fragment in a tile makes the same
      // decision, preserving square cells and a fixed image sampling grid.
      for (int level = 0; level < 3; level++) {
        vec2 center = (floor(pixel / cell) + 0.5) * cell;
        if (cell * 0.5 < u_fine_size) break;
        vec2 delta = center - pointer;
        // Shape only the focus mask; image coordinates remain untouched.
        vec2 local = vec2(
          dot(delta, u_direction) / (1.0 + u_stretch * 0.6 * u_blob),
          dot(delta, vec2(-u_direction.y, u_direction.x)) / (1.0 - u_stretch * 0.12 * u_blob)
        );
        float theta = atan(local.y, local.x + 0.0001);
        float lobes = 0.55 * sin(theta * 3.0 + u_time * 0.7)
                    + 0.3 * sin(theta * 5.0 - u_time * 0.45 + 1.1)
                    + 0.15 * sin(theta * 2.0 + u_time * 0.3 + 2.0);
        float boundary = radius * (1.0 + u_blob * 0.35 * lobes);
        if (length(local) >= boundary) break;
        cell *= 0.5;
        radius *= 0.72;
      }
      out_color = vec4(ditherAt(v_uv, cell), 1.0);
    }`;

    const compile = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(error);
        }
        return shader;
    };

    let program;
    try {
        const vertex = compile(gl.VERTEX_SHADER, vertexSource);
        const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
        program = gl.createProgram();
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    } catch (error) {
        console.warn("about dither: unable to initialize WebGL", error);
        imageFrame.classList.remove("is-loading");
        return;
    }

    const locations = Object.fromEntries(
        ["image", "resolution", "image_size", "mouse", "pixel_size", "contrast", "amount", "motion", "focus", "fine_size", "radius", "direction", "blob", "time", "stretch", "shadow", "highlight"].map(
            (name) => [name, gl.getUniformLocation(program, `u_${name}`)],
        ),
    );
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.useProgram(program);
    gl.uniform1i(locations.image, 0);
    gl.uniform2f(locations.image_size, image.naturalWidth, image.naturalHeight);

    // Blend the chosen mobile profile at 500px into the desktop profile
    // at 1200px. Sizes retain the original 1440px viewport calibration.
    const values = () => {
        const viewportWidth = window.innerWidth;
        const blend = Math.max(0, Math.min(1, (viewportWidth - 500) / 700));
        const scale = viewportWidth / 1440;
        const interpolate = (mobile, desktop) => mobile + (desktop - mobile) * blend;
        return {
            pixelSize: interpolate(7, 6) * scale,
            fineSize: interpolate(3, 1.5) * scale,
            radius: interpolate(715, 475) * scale,
            motion: interpolate(0.83, 0.65),
            contrast: 1.2,
            amount: 1,
            blob: 0.84,
        };
    };

    let width = 0;
    let height = 0;
    let dpr = 1;
    let mouse = [0.5, 0.5];
    let targetMouse = [0.5, 0.5];
    let angle = 0;
    let targetAngle = 0;
    let previousPointer = null;
    let speed = 0;
    let blobTime = 0;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let focus = 0;
    let focusTarget = 0;
    let lastTime = 0;
    let frame = 0;
    let dirty = true;
    let revealed = false;
    const darkQuery = matchMedia("(prefers-color-scheme: dark)");
    const hexToRgb = (hex) => {
        const value = Number.parseInt(hex.slice(1), 16);
        return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
    };
    let palette;
    const updatePalette = () => {
        const dark = darkQuery.matches && !document.documentElement.classList.contains("light");
        // In light mode, shadows become accent ink and highlights become paper.
        const paper = getComputedStyle(imageFrame).backgroundColor.match(/[\d.]+/g).slice(0, 3).map((value) => Number(value) / 255);
        palette = dark
            ? { shadow: hexToRgb("#0e1614"), highlight: hexToRgb("#7b8cf0") }
            : { shadow: hexToRgb("#243ab5"), highlight: paper };
        dirty = true;
        requestRender();
    };

    const resize = () => {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        if (!width || !height) return;
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        dirty = true;
        requestRender();
    };

    const render = (time) => {
        frame = 0;
        const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
        lastTime = time;
        const animateBlob = !document.hidden && !reducedMotion.matches && focusTarget > 0 && values().blob > 0;
        if (animateBlob) {
            blobTime += dt;
            dirty = true;
        }
        if (speed > 0.001) {
            speed *= Math.exp(-dt * 3);
            dirty = true;
        } else {
            speed = 0;
        }
        const angleDelta = Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle));
        if (Math.abs(angleDelta) > 0.001) {
            angle += angleDelta * (1 - Math.exp(-dt * 2));
            dirty = true;
        } else if (angle !== targetAngle) {
            angle = targetAngle;
            dirty = true;
        }
        const mouseX = mouse[0] + (targetMouse[0] - mouse[0]) * (1 - Math.exp(-dt * 16));
        const mouseY = mouse[1] + (targetMouse[1] - mouse[1]) * (1 - Math.exp(-dt * 16));
        if (Math.abs(mouseX - mouse[0]) > 0.001 || Math.abs(mouseY - mouse[1]) > 0.001) {
            mouse = [mouseX, mouseY];
            dirty = true;
        } else if (mouse[0] !== targetMouse[0] || mouse[1] !== targetMouse[1]) {
            mouse = [...targetMouse];
            dirty = true;
        }
        const nextFocus = focus + (focusTarget - focus) * (1 - Math.exp(-dt * 7));
        if (Math.abs(nextFocus - focus) > 0.002) {
            focus = nextFocus;
            dirty = true;
        } else {
            dirty ||= focus !== focusTarget;
            focus = focusTarget;
        }

        if (dirty) {
            const current = values();
            gl.clearColor(...palette.highlight, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(program);
            gl.bindVertexArray(vao);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform2f(locations.resolution, canvas.width, canvas.height);
            gl.uniform2f(locations.mouse, mouse[0], mouse[1]);
            gl.uniform1f(locations.pixel_size, current.pixelSize * dpr);
            gl.uniform1f(locations.contrast, current.contrast);
            gl.uniform1f(locations.amount, current.amount);
            gl.uniform1f(locations.motion, current.motion);
            gl.uniform1f(locations.focus, focus);
            gl.uniform1f(locations.fine_size, current.fineSize * dpr);
            gl.uniform1f(locations.radius, current.radius * dpr);
            gl.uniform2f(locations.direction, Math.cos(angle), Math.sin(angle));
            gl.uniform1f(locations.blob, current.blob);
            gl.uniform1f(locations.time, blobTime);
            gl.uniform1f(locations.stretch, reducedMotion.matches ? 0 : speed);
            gl.uniform3fv(locations.shadow, palette.shadow);
            gl.uniform3fv(locations.highlight, palette.highlight);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            if (!revealed) {
                revealed = true;
                requestAnimationFrame(() => {
                    imageFrame.classList.add("is-ready");
                    imageFrame.classList.remove("is-loading");
                });
            }
            dirty = false;
        }
        if (
            Math.abs(targetMouse[0] - mouse[0]) > 0.001 ||
            Math.abs(targetMouse[1] - mouse[1]) > 0.001 ||
            Math.abs(Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle))) > 0.001 ||
            Math.abs(focusTarget - focus) > 0.002 || speed > 0.001 || animateBlob
        ) {
            requestRender();
        }
    };

    function requestRender() {
        if (!frame) frame = requestAnimationFrame(render);
    }

    const updateFocus = (clientX, clientY, timeStamp) => {
        const rect = canvas.getBoundingClientRect();
        if (
            clientX < rect.left || clientX > rect.right ||
            clientY < rect.top || clientY > rect.bottom
        ) {
            clearFocus();
            return;
        }
        const next = [(clientX - rect.left) / rect.width, 1 - (clientY - rect.top) / rect.height];
        if (previousPointer) {
            const dx = (next[0] - previousPointer.position[0]) * rect.width;
            const dy = (next[1] - previousPointer.position[1]) * rect.height;
            const seconds = Math.max(0.008, (timeStamp - previousPointer.time) / 1000);
            speed = Math.min(1, Math.hypot(dx, dy) / seconds / window.innerWidth);
            // Keep mouse-driven tilt within roughly 14 degrees. The slow
            // boundary undulations animate independently of this tilt.
            if (Math.hypot(dx, dy) > 1) targetAngle = Math.atan2(dy, dx) * 0.08;
        }
        previousPointer = { position: next, time: timeStamp };
        targetMouse = next;
        focusTarget = 1;
        dirty = true;
        requestRender();
    };

    const clearFocus = () => {
        previousPointer = null;
        focusTarget = 0;
        requestRender();
    };
    document.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "touch") updateFocus(event.clientX, event.clientY, event.timeStamp);
    });

    // Passive touch events continue to arrive during scrolling, even when
    // the browser cancels pointer events to take over a pan gesture.
    const followTouch = (event) => {
        const touch = event.touches[0];
        if (touch) updateFocus(touch.clientX, touch.clientY, event.timeStamp);
        else clearFocus();
    };
    document.addEventListener("touchstart", followTouch, { passive: true });
    document.addEventListener("touchmove", followTouch, { passive: true });
    document.addEventListener("touchend", followTouch, { passive: true });
    document.addEventListener("touchcancel", clearFocus, { passive: true });
    document.documentElement.addEventListener("pointerleave", (event) => {
        if (event.pointerType !== "touch") clearFocus();
    });
    window.addEventListener("blur", clearFocus);
    document.addEventListener("visibilitychange", () => {
        lastTime = 0;
        requestRender();
    });

    new ResizeObserver(resize).observe(imageFrame);
    new MutationObserver(updatePalette).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    darkQuery.addEventListener("change", updatePalette);
    window.addEventListener("resize", resize);
    updatePalette();
    resize();
    requestRender();
})();
