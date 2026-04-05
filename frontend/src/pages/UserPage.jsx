import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getShaders } from '../api';
import ShaderCard from '../components/ShaderCard';

export default function UserPage() {
  const { id } = useParams();
  const [shaders, setShaders] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShaders({ limit: 50 }).then(({ data }) => {
      const mine = data.shaders.filter(s => s.author_id === id);
      setShaders(mine);
      if (mine.length) setUsername(mine[0].author_name);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-slide-up bg-white">
      <div className="mb-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-black border border-black flex items-center justify-center font-mono text-white font-bold text-lg">
          {username ? username[0].toUpperCase() : '?'}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-black">
            {username ? `@${username}` : 'User'}
          </h1>
          <p className="text-gray-500 text-sm">{shaders.length} shader{shaders.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="card h-64 animate-pulse bg-gray-100" />)}
        </div>
      ) : shaders.length === 0 ? (
        <p className="text-gray-500 text-center py-16 text-sm">No shaders published yet</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shaders.map(s => <ShaderCard key={s.id} shader={s} />)}
        </div>
      )}
    </div>
  );
}
