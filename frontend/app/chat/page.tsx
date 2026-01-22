'use client';

import React from 'react';

import ChatInterface from '@/components/chat/ChatInterface';
import { TutorLayout } from '@/components/chat/TutorLayout';

export default function ChatPage() {
    return (
        <TutorLayout>
            <div className="flex-1 h-full flex flex-col relative">
                {/* Header */}
                <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-medium text-white/60">TutorAI Online</span>
                        </div>
                    </div>
                </header>

                {/* Chat Area */}
                <div className="flex-1 relative overflow-hidden">
                    <ChatInterface />
                </div>
            </div>
        </TutorLayout>
    );
}
