"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export interface DuelMessage {
    type: string;
    [key: string]: any;
}

interface UseDuelSocketOptions {
    duelId: string | null;
    username?: string | null;
    onMessage: (message: DuelMessage) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
}

export function useDuelSocket({ duelId, username, onMessage, onConnect, onDisconnect }: UseDuelSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    // Track current duelId to prevent stale closure reconnections
    const duelIdRef = useRef(duelId);
    useEffect(() => {
        duelIdRef.current = duelId;
    }, [duelId]);

    // Store callbacks in refs to avoid triggering reconnection on every render
    const onMessageRef = useRef(onMessage);
    const onConnectRef = useRef(onConnect);
    const onDisconnectRef = useRef(onDisconnect);

    // Keep refs updated with latest callbacks
    useEffect(() => {
        onMessageRef.current = onMessage;
        onConnectRef.current = onConnect;
        onDisconnectRef.current = onDisconnect;
    });

    const connect = useCallback(() => {
        // Use ref to get CURRENT duelId, not stale closure value!
        const currentDuelId = duelIdRef.current;
        if (!currentDuelId) {
            console.log("[WS] Not connecting - duelId is null");
            return;
        }

        // Clean up existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }


        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        // Replace http/https with ws/wss
        const wsUrl = apiUrl.replace(/^http/, 'ws');
        const url = `${wsUrl}/api/v1/ws/duel/${currentDuelId}${username ? `?user=${username}` : ''}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("[WS] Connected to duel:", currentDuelId);
            setIsConnected(true);
            reconnectAttempts.current = 0;
            onConnectRef.current?.();
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log("[WS] Received:", message);
                onMessageRef.current(message);
            } catch (e) {
                console.error("[WS] Failed to parse message:", e);
            }
        };

        ws.onclose = (event) => {
            console.log("[WS] Disconnected:", event.code, event.reason);
            setIsConnected(false);
            onDisconnectRef.current?.();

            // Attempt reconnection - but only if duelId is still valid!
            if (duelIdRef.current && reconnectAttempts.current < maxReconnectAttempts) {
                reconnectAttempts.current++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
                console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
                setTimeout(connect, delay);
            } else if (!duelIdRef.current) {
                console.log("[WS] Not reconnecting - duelId is now null");
            }
        };

        ws.onerror = (error) => {
            console.error("[WS] Error:", error);
        };
    }, [username]); // Remove duelId from deps - we use ref now!

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const sendMessage = useCallback((message: object) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn("[WS] Cannot send, not connected");
        }
    }, []);

    // Connect when duelId changes
    useEffect(() => {
        if (duelId) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [duelId, connect, disconnect]);

    // Ping to keep connection alive
    useEffect(() => {
        if (!isConnected) return;

        const pingInterval = setInterval(() => {
            sendMessage({ type: "PING" });
        }, 30000);

        return () => clearInterval(pingInterval);
    }, [isConnected, sendMessage]);

    return {
        isConnected,
        sendMessage,
        disconnect,
        reconnect: connect
    };
}
