import React, { useState, useCallback } from 'react';
import ShaderCanvas from './ShaderCanvas';

const TEMPLATES = {
  fragment: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0.0, 2.094, 4.189));
    fragColor = vec4(col, 1.0);
}`,
  compute: `// Compute shader simulation (visualised as fragment)
// iResolution, iTime, iMouse are available

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    // Simulate a simple cellular automaton pattern
    float t = floor(iTime * 2.0);
    vec2 cell = floor(uv * 32.0);
    float v = fract(sin(dot(cell + t, vec2(127.1, 311.7))) * 43758.5453);
    fragColor = vec4(vec3(step(0.5, v) * uv, 0.5), 1.0);
}`,
};

export default function ShaderEditor({ value, onChange, shaderType = 'fragment' }) {
  const [liveCode, setLiveCode] = useState(value || TEMPLATES[shaderType]);
  const [previewCode, setPreviewCode] = useState(value || TEMPLATES[shaderType]);

  const handleChange = useCallback((e) => {
    setLiveCode(e.target.value);
    onChange(e.target.value);
    // Debounce preview update
    clearTimeout(window._shaderPreviewTimer);
    window._shaderPreviewTimer = setTimeout(() => setPreviewCode(e.target.value), 800);
  }, [onChange]);

  const insertTemplate = () => {
    const tpl = TEMPLATES[shaderType] || TEMPLATES.fragment;
    setLiveCode(tpl);
    setPreviewCode(tpl);
    onChange(tpl);
  };

  return (
    <div className="space-y-3">
      {/* Editor header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-black animate-pulse-slow" />
          <span className="text-xs font-mono text-gray-500">GLSL • Fragment Shader</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={insertTemplate} className="text-xs text-gray-500 hover:text-black transition-colors font-mono">
            Insert template
          </button>
        </div>
      </div>

      {/* Code editor */}
      <textarea
        className="shader-editor"
        value={liveCode}
        onChange={handleChange}
        spellCheck={false}
        rows={16}
        placeholder={TEMPLATES[shaderType]}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const s = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const newVal = liveCode.substring(0, s) + '  ' + liveCode.substring(end);
            setLiveCode(newVal);
            onChange(newVal);
            requestAnimationFrame(() => {
              e.target.selectionStart = e.target.selectionEnd = s + 2;
            });
          }
        }}
      />

      {/* Live preview */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-gray-500">LIVE PREVIEW</span>
        </div>
        <ShaderCanvas code={previewCode} height={240} autoPlay />
      </div>
    </div>
  );
}
