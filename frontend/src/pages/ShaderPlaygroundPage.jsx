import React, { useState, useCallback } from 'react';
import ShaderEditor from '../components/ShaderEditor';
import ShaderCanvas from '../components/ShaderCanvas';

const DEFAULT_SHADER = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0.0, 2.094, 4.189));
    fragColor = vec4(col, 1.0);
}`;

export default function ShaderPlaygroundPage() {
  const [code, setCode] = useState(DEFAULT_SHADER);
  const [previewCode, setPreviewCode] = useState(DEFAULT_SHADER);

  const handleCodeChange = useCallback((newCode) => {
    setCode(newCode);
    // Debounce preview update
    clearTimeout(window._shaderPreviewTimer);
    window._shaderPreviewTimer = setTimeout(() => setPreviewCode(newCode), 300);
  }, []);

  const downloadCode = () => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(code));
    element.setAttribute('download', 'shader.glsl');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-black border-b border-gray-300 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">Shader Playground</h1>
            <p className="text-gray-500 text-sm">Preview GLSL shaders in real-time</p>
          </div>
          <button
            onClick={downloadCode}
            className="btn btn-primary text-sm"
          >
            Download Code
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor side */}
        <div className="flex-1 flex flex-col border-r border-gray-300 overflow-hidden">
          <div className="bg-white border-b border-gray-300 px-6 py-3">
            <p className="text-xs font-mono text-gray-600">GLSL Fragment Shader</p>
          </div>
          <div className="flex-1 overflow-auto bg-white">
            <div className="p-4">
              <textarea
                className="shader-editor font-mono text-sm"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const s = e.target.selectionStart;
                    const end = e.target.selectionEnd;
                    const newVal = code.substring(0, s) + '  ' + code.substring(end);
                    handleCodeChange(newVal);
                    requestAnimationFrame(() => {
                      e.target.selectionStart = e.target.selectionEnd = s + 2;
                    });
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Preview side */}
        <div className="flex-1 flex flex-col border-l border-gray-300 overflow-hidden">
          <div className="bg-white border-b border-gray-300 px-6 py-3">
            <p className="text-xs font-mono text-gray-600">Live Preview</p>
          </div>
          <div className="flex-1 overflow-hidden bg-black">
            <ShaderCanvas code={previewCode} width="100%" height="100%" autoPlay={true} />
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="bg-white border-t border-gray-300 px-6 py-3 text-xs text-gray-600 font-mono">
        <p>Available uniforms: iResolution, iTime, iMouse, iFrame</p>
      </div>
    </div>
  );
}
