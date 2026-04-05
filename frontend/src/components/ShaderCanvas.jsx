import React, { useEffect, useRef, useState, useCallback } from 'react';

const VERT = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

function wrapFragment(code) {
  // Support both raw GLSL and Shadertoy-style mainImage
  if (code.includes('mainImage')) {
    return `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform int iFrame;

${code}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}`;
  }
  // Assume raw main()
  return `precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform int iFrame;
${code}`;
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(err);
  }
  return shader;
}

function link(gl, vert, frag) {
  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog));
  }
  return prog;
}

export default function ShaderCanvas({ code, width = '100%', height = 300, autoPlay = true, className = '' }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ running: false, frame: 0, startTime: 0, raf: null, mouse: [0, 0, 0, 0] });
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(autoPlay);
  const [fps, setFps] = useState(0);
  const fpsRef = useRef({ frames: 0, last: 0 });
  const programRef = useRef(null);
  const glRef = useRef(null);

  // Set canvas element width/height for proper WebGL rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setCanvasDimensions = () => {
      let w, h;

      // Determine width
      if (typeof width === 'number') {
        w = width;
      } else {
        // For percentage/string widths, use parent or fallback
        const parentWidth = canvas.parentElement?.clientWidth;
        w = parentWidth && parentWidth > 0 ? parentWidth : 512;
      }

      // Determine height
      if (typeof height === 'number') {
        h = height;
      } else {
        const parentHeight = canvas.parentElement?.clientHeight;
        h = parentHeight && parentHeight > 0 ? parentHeight : 512;
      }

      // Always set explicit pixel dimensions
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);

      // Set viewport if GL context exists
      const gl = glRef.current;
      if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    // Set dimensions immediately
    setCanvasDimensions();

    // Also set on next frame to ensure parent is measured
    const timerId = setTimeout(setCanvasDimensions, 0);

    return () => clearTimeout(timerId);
  }, [width, height]);

  const buildProgram = useCallback((gl, src) => {
    try {
      const wrapped = wrapFragment(src);
      const vert = compile(gl, gl.VERTEX_SHADER, VERT);
      const frag = compile(gl, gl.FRAGMENT_SHADER, wrapped);
      const prog = link(gl, vert, frag);
      setError('');
      return prog;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: false });
    if (!gl) { setError('WebGL not supported'); return; }
    glRef.current = gl;

    // Set viewport to canvas dimensions
    gl.viewport(0, 0, canvas.width, canvas.height);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.mouse[0] = e.clientX - rect.left;
      stateRef.current.mouse[1] = canvas.height - (e.clientY - rect.top);
    };
    const onMouseDown = (e) => {
      stateRef.current.mouse[2] = e.clientX - canvas.getBoundingClientRect().left;
      stateRef.current.mouse[3] = canvas.height - (e.clientY - canvas.getBoundingClientRect().top);
    };
    const onMouseUp = () => { stateRef.current.mouse[2] = 0; stateRef.current.mouse[3] = 0; };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      gl.deleteBuffer(buf);
    };
  }, []);

  // Rebuild program when code changes
  useEffect(() => {
    const gl = glRef.current;
    if (!gl || !code) return;
    if (programRef.current) gl.deleteProgram(programRef.current);
    const prog = buildProgram(gl, code);
    programRef.current = prog;
    stateRef.current.startTime = performance.now();
    stateRef.current.frame = 0;
  }, [code, buildProgram]);

  // Render loop
  useEffect(() => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    if (!gl || !canvas) return;

    const render = (now) => {
      if (!stateRef.current.running) return;
      const prog = programRef.current;
      if (!prog) { stateRef.current.raf = requestAnimationFrame(render); return; }

      gl.useProgram(prog);
      const posLoc = gl.getAttribLocation(prog, 'position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const t = (now - stateRef.current.startTime) / 1000;
      const setU = (name, fn) => { const l = gl.getUniformLocation(prog, name); if (l !== null) fn(l); };
      setU('iResolution', l => gl.uniform2f(l, canvas.width, canvas.height));
      setU('iTime', l => gl.uniform1f(l, t));
      setU('iFrame', l => gl.uniform1i(l, stateRef.current.frame));
      setU('iMouse', l => gl.uniform4fv(l, stateRef.current.mouse));

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      stateRef.current.frame++;

      // FPS counter
      fpsRef.current.frames++;
      if (now - fpsRef.current.last > 500) {
        setFps(Math.round(fpsRef.current.frames / ((now - fpsRef.current.last) / 1000)));
        fpsRef.current = { frames: 0, last: now };
      }

      stateRef.current.raf = requestAnimationFrame(render);
    };

    stateRef.current.running = playing;
    if (playing) stateRef.current.raf = requestAnimationFrame(render);
    else cancelAnimationFrame(stateRef.current.raf);

    return () => {
      stateRef.current.running = false;
      cancelAnimationFrame(stateRef.current.raf);
    };
  }, [playing]);

  const restart = () => {
    stateRef.current.startTime = performance.now();
    stateRef.current.frame = 0;
  };

  return (
    <div className={`canvas-wrap ${className}`} style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Controls overlay */}
      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        {fps > 0 && playing && (
          <span className="font-mono text-xs text-white bg-black/70 px-1.5 py-0.5">
            {fps} fps
          </span>
        )}
        <button
          onClick={() => { setPlaying(p => !p); }}
          className="bg-black/80 border border-gray-600 hover:border-white text-white hover:text-white
                     text-xs font-mono px-2 py-1 transition-colors"
        >
          {playing ? '[||]' : '[>]'}
        </button>
        <button
          onClick={restart}
          title="Restart"
          className="bg-black/80 border border-gray-600 hover:border-white text-white hover:text-white
                     text-xs font-mono px-2 py-1 transition-colors"
        >
          [R]
        </button>
      </div>

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-black/90 p-3 overflow-auto">
          <div className="text-white text-xs font-mono whitespace-pre-wrap">
            ERROR:{'\n'}{error}
          </div>
        </div>
      )}
    </div>
  );
}
