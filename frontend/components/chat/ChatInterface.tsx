'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, StopCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { tutorApi, ChatMessage } from '../../lib/api/tutor';
import { MessageBubble } from './MessageBubble';
import { SuggestionChips } from './SuggestionChips';

export default function ChatInterface() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load persistence
    useEffect(() => {
        const saved = localStorage.getItem('chat_history');
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse chat history');
            }
        }

        // Fetch suggestions
        tutorApi.getSuggestions().then(setSuggestions);
    }, []);

    // Save persistence
    useEffect(() => {
        localStorage.setItem('chat_history', JSON.stringify(messages));
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim() || isLoading) return;

        const userMsg: ChatMessage = {
            role: 'user',
            content: textToSend,
            timestamp: new Date().toISOString(),
            id: Date.now().toString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        try {
            // Create placeholder for bot message
            const botMsgId = (Date.now() + 1).toString();
            const botMsg: ChatMessage = {
                role: 'assistant',
                content: '',
                timestamp: new Date().toISOString(),
                id: botMsgId,
                actions: []
            };

            setMessages(prev => [...prev, botMsg]);

            // Use refs for accumulation to avoid excessive re-renders
            let accumulatedContent = '';
            let accumulatedActions: string[] = [];
            let lastUpdateTime = 0;
            const UPDATE_INTERVAL = 50; // ms - throttle UI updates

            await tutorApi.streamMessage(
                textToSend,
                (chunk) => {
                    accumulatedContent += chunk;
                    const now = Date.now();
                    // Throttle updates to reduce jank
                    if (now - lastUpdateTime > UPDATE_INTERVAL) {
                        lastUpdateTime = now;
                        setMessages(prev => prev.map(msg =>
                            msg.id === botMsgId
                                ? { ...msg, content: accumulatedContent }
                                : msg
                        ));
                    }
                },
                (action) => {
                    accumulatedActions.push(action);
                    setMessages(prev => prev.map(msg =>
                        msg.id === botMsgId
                            ? { ...msg, actions: [...accumulatedActions] }
                            : msg
                    ));
                }
            );

            // Final update to ensure all content is rendered
            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId
                    ? { ...msg, content: accumulatedContent }
                    : msg
            ));
            scrollToBottom();

        } catch (error: any) {
            const errorMsg: ChatMessage = {
                role: 'assistant',
                content: error.message === 'Unauthorized'
                    ? "Please log in to chat with the tutor."
                    : "Sorry, I'm having trouble connecting right now. Please try again.",
                timestamp: new Date().toISOString(),
                id: Date.now().toString()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = async () => {
        if (confirm('Clear chat history?')) {
            await tutorApi.clearHistory();
            setMessages([]);
            localStorage.removeItem('chat_history');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 scrollbar-none space-y-6">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-500 space-y-4 mt-20">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/10 flex items-center justify-center">
                            <Send size={28} className="text-orange-500/50" />
                        </div>
                        <div className="text-center space-y-1">
                            <h2 className="text-base font-medium text-white/80">AI Tutor Ready</h2>
                            <p className="text-xs max-w-[200px] text-white/40">Ask about algorithms, debug code, or explore concepts.</p>
                        </div>
                    </div>
                )}

                <AnimatePresence mode="popLayout" initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id || msg.timestamp}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            layout={false}
                        >
                            <MessageBubble {...msg} />
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center space-x-2 text-zinc-500 text-xs ml-14 uppercase tracking-widest font-medium"
                    >
                        <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span>Thinking...</span>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Floating Input Area */}
            <div className="absolute bottom-4 left-0 right-0 px-6 md:px-12 z-20">
                <div className="relative max-w-3xl mx-auto">
                    {messages.length < 2 && !isLoading && (
                        <div className="mb-3 flex justify-center flex-wrap gap-2">
                            <SuggestionChips
                                suggestions={suggestions}
                                onSelect={handleSend}
                                isLoading={isLoading}
                            />
                        </div>
                    )}

                    <div className="relative flex items-end bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl focus-within:border-orange-500/30 focus-within:bg-[#0a0a0a] transition-all duration-300 ring-1 ring-white/5">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleInput}
                            onKeyDown={handleKeyDown}
                            placeholder="Message your Tutor..."
                            className="w-full bg-transparent text-gray-200 p-4 pr-12 max-h-40 resize-none focus:outline-none text-sm placeholder:text-zinc-600 scrollbar-none"
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            className={clsx(
                                "absolute right-2 bottom-2 p-2.5 rounded-xl transition-all duration-200 transform",
                                input.trim() && !isLoading
                                    ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-600/20 hover:scale-105 active:scale-95"
                                    : "text-zinc-700 cursor-not-allowed"
                            )}
                        >
                            {isLoading ? <StopCircle size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                    <div className="text-center mt-3">
                        <span className="text-[10px] text-zinc-600 tracking-wide">
                            AI can make mistakes. Verify important info.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
