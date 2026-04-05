import React from 'react';
import { Link } from 'react-router-dom';
import ShaderCanvas from './ShaderCanvas';

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ShaderCard({ shader }) {
  return (
    <Link to={`/shader/${shader.id}`} className="card-hover block group animate-fade-in">
      {/* Preview */}
      <div className="relative" style={{ height: 180 }}>
        <ShaderCanvas
          code={shader.fragment_code}
          height={180}
          autoPlay
          className="w-full"
        />
        {/* Type badge */}
        <span className={`absolute top-2 left-2 badge text-xs font-mono
          ${shader.shader_type === 'compute' ? 'bg-gray-200 text-black border border-gray-400' : 'bg-white text-black border border-gray-300'}`}>
          {shader.shader_type}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2 bg-white">
        <h3 className="font-display font-semibold text-black group-hover:text-gray-700 transition-colors truncate">
          {shader.title}
        </h3>

        {shader.description && (
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">{shader.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span className="font-mono">@{shader.author_name}</span>
          <div className="flex items-center gap-3">
            <span>{shader.likes_count} likes</span>
            <span>{shader.views} views</span>
            <span>{fmtDate(shader.created_at)}</span>
          </div>
        </div>

        {shader.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {shader.tags.slice(0, 4).map(t => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
