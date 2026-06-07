import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Props {
  sid: string;
  className?: string;
  alt?: string;
  onClick?: () => void;
}

export function AuthenticatedImage({ sid, className, alt = 'Damage photo', onClick }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    fetch(api.mediaUrl(sid), { headers: api.mediaHeaders() })
      .then(r => {
        if (!r.ok) throw new Error('fetch failed');
        return r.blob();
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setError(true));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sid]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 text-xs ${className}`}
      >
        Failed
      </div>
    );
  }

  if (!src) {
    return <div className={`animate-pulse bg-slate-200 ${className}`} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    />
  );
}
