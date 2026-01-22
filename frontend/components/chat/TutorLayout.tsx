import React from 'react';
import { Sidebar } from '../layout/Sidebar';
import { ContextSidebar } from './ContextSidebar';

interface TutorLayoutProps {
    children: React.ReactNode;
}

export function TutorLayout({ children }: TutorLayoutProps) {
    return (
        <div className="flex h-screen w-full bg-[#0a0a0c] overflow-hidden font-sans text-slate-300 selection:bg-[#f97316]/30">
            {/* Left Main Navigation */}
            <Sidebar />

            {/* Main Content Area (Chat) */}
            <main className="flex-1 flex flex-col h-full ml-[70px] bg-transparent">
                {children}
            </main>

            {/* Right Context Sidebar */}
            <ContextSidebar />
        </div>
    );
}
