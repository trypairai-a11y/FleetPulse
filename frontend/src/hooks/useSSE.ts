"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { getAccessToken } from "@/lib/api";

interface UseSSEOptions {
  url: string | null;
  onMessage?: (data: any) => void;
  enabled?: boolean;
}

/**
 * Hook for Server-Sent Events. Replaces polling patterns.
 * Automatically reconnects on disconnect with exponential backoff.
 */
export function useSSE({ url, onMessage, enabled = true }: UseSSEOptions) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);

  const connect = useCallback(() => {
    if (!url || !enabled) return;

    const token = getAccessToken();
    const separator = url.includes("?") ? "&" : "?";
    const fullUrl = token ? `${url}${separator}token=${token}` : url;

    const source = new EventSource(fullUrl, { withCredentials: true });
    sourceRef.current = source;

    source.onopen = () => {
      setConnected(true);
      retryRef.current = 0;
    };

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);
        onMessage?.(data);
      } catch {
        // Non-JSON events (heartbeat, etc.)
      }
    };

    source.onerror = () => {
      setConnected(false);
      source.close();
      // Reconnect with exponential backoff (max 30s)
      const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30000);
      retryRef.current++;
      setTimeout(connect, delay);
    };
  }, [url, enabled, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setConnected(false);
  }, []);

  return { connected, lastEvent, disconnect };
}
