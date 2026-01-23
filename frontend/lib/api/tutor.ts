import { getAuthHeaders } from '../auth';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
    id?: string;
    actions?: string[]; // Log of agent actions (e.g., tool usage)
}

export interface ChatResponse {
    reply: string;
    session_id?: string;
    actions?: string[];
}

export interface TutorState {
    stats: {
        overall_accuracy: number;
        total_correct: number;
        total_attempts: number;
        topic_stats: Record<string, {
            correct: number;
            total: number;
            accuracy: number;
            status: string;
        }>;
        recent_mistakes: string[];
    };
    session_id: string;
}

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/v1` || 'http://localhost:8000/api/v1';

export const tutorApi = {
    getTutorState: async (): Promise<TutorState | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/tutor/state`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
            });

            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Error fetching tutor state:', error);
            return null;
        }
    },

    sendMessage: async (message: string, context?: any): Promise<ChatResponse> => {
        try {
            const response = await fetch(`${API_BASE_URL}/tutor/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    message,
                    include_context: true,
                    ...context
                }),
            });

            if (response.status === 401) {
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            return await response.json();
        } catch (error) {
            // console.error('Error sending message:', error);
            throw error;
        }
    },

    streamMessage: async (
        message: string,
        onChunk: (chunk: string) => void,
        onAction?: (action: string) => void,
        context?: any
    ): Promise<void> => {
        try {
            const response = await fetch(`${API_BASE_URL}/tutor/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    message,
                    include_context: true,
                    ...context
                }),
            });

            if (!response.ok || !response.body) throw new Error('Failed to stream message');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);

                // Handle action tokens specially
                if (text.includes('__ACTION__:')) {
                    const lines = text.split('\n');
                    for (const line of lines) {
                        if (!line) continue;
                        if (line.startsWith('__ACTION__:')) {
                            onAction?.(line.replace('__ACTION__:', ''));
                        } else {
                            onChunk(line);
                        }
                    }
                } else {
                    // Raw text stream - just send it directly
                    onChunk(text);
                }
            }
        } catch (error) {
            console.error('Stream error:', error);
            throw error;
        }
    },

    getSuggestions: async (): Promise<string[]> => {
        try {
            const response = await fetch(`${API_BASE_URL}/tutor/suggestions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
            });

            if (!response.ok) return [];
            const data = await response.json();
            return data.suggestions || [];
        } catch (error) {
            return [];
        }
    },

    clearHistory: async (): Promise<void> => {
        try {
            await fetch(`${API_BASE_URL}/tutor/clear-history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
            });
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    }
};
