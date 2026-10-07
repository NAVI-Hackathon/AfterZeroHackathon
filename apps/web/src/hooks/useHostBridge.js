import { useCallback, useEffect, useRef, useState } from 'react';
import { HostMessageSchema, naviMessage, parseAllowedOrigins, readMessage } from '../../../../shared/embed.js';

// Host websites allowed to embed NAVI (comma-separated origins). Empty = embedding disabled.
const allowedOrigins = parseAllowedOrigins(import.meta.env?.VITE_EMBED_ALLOWED_ORIGINS);

/**
 * Bridge to the host page when NAVI runs inside an iframe.
 * Handshake works in both orders: NAVI announces itself to every allowed origin (postMessage
 * with a non-matching targetOrigin is silently dropped), and the host answers with host:hello.
 */
export function useHostBridge(enabled) {
  const [hostOrigin, setHostOrigin] = useState(null);
  const originRef = useRef(null);

  useEffect(() => {
    if (!enabled || window.parent === window || !allowedOrigins.length) return undefined;
    const onMessage = event => {
      const message = readMessage(event, { allowedOrigins, expectedSource: window.parent, schema: HostMessageSchema });
      if (message?.type !== 'host:hello' || originRef.current) return;
      originRef.current = event.origin;
      setHostOrigin(event.origin);
      window.parent.postMessage(naviMessage('navi:ready'), event.origin);
    };
    window.addEventListener('message', onMessage);
    for (const origin of allowedOrigins) window.parent.postMessage(naviMessage('navi:ready'), origin);
    return () => window.removeEventListener('message', onMessage);
  }, [enabled]);

  /** Send to the verified host only. Returns false when no host is connected. */
  const send = useCallback(message => {
    if (!originRef.current) return false;
    window.parent.postMessage(message, originRef.current);
    return true;
  }, []);

  return { connected: Boolean(hostOrigin), send };
}
