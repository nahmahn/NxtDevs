'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, AlertCircle, Target } from 'lucide-react';
import { tutorApi, TutorState } from '@/lib/api/tutor';
import { KnowledgeGraph } from './KnowledgeGraph';

export function ContextSidebar() {
    const [state, setState] = useState<TutorState | null>(null);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchState = async () => {
            try {
                const data = await tutorApi.getTutorState();
                if (data) {
                    setState(data);
                } else {
                    setError("Failed to load context");
                }
            } catch (err) {
                setError("Connection failed");
            } finally {
                setLoading(false);
            }
        };
        fetchState();

        // Refresh every 30s to keep sync with quiz attempts
        const interval = setInterval(fetchState, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <aside className="w-80 h-full bg-[#0a0a0c] border-l border-white/5 flex flex-col p-6">
            <div className="animate-pulse space-y-4">
                <div className="h-6 w-3/4 bg-white/5 rounded" />
                <div className="h-32 w-full bg-white/5 rounded-xl" />
            </div>
        </aside>
    );

    if (error || !state) return (
        <aside className="w-80 h-full bg-[#0a0a0c] border-l border-white/5 flex flex-col p-6">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="mb-2" />
                <p>{error || "No context available"}</p>
                <button onClick={() => window.location.reload()} className="mt-2 text-xs underline">Retry</button>
            </div>
        </aside>
    );

    return (
        <aside className="w-80 h-full bg-[#0a0a0c] border-l border-white/5 flex flex-col overflow-y-auto">
            <div className="p-6 space-y-8">
                {/* Header */}
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                        <Brain className="text-orange-500" size={20} />
                        Student Context
                    </h2>
                    <p className="text-sm text-white/40">Real-time learning analysis</p>
                </div>

                {/* Overall Accuracy */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 shadow-xl">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                            <Target size={18} />
                        </div>
                        <span className="text-sm font-medium text-white/80">Overall Accuracy</span>
                    </div>
                    <div className="text-4xl font-bold text-white mb-2 tracking-tight">
                        {Math.round(state.stats.overall_accuracy)}%
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">
                        {state.stats.total_correct} correct / {state.stats.total_attempts} total
                    </div>
                </div>

                {/* Knowledge Graph */}
                <div>
                    <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <TrendingUp size={12} /> Topic Mastery
                    </h3>
                    <KnowledgeGraph stats={state.stats.topic_stats} />
                </div>

                {/* Recent Struggles */}
                {state.stats.recent_mistakes.length > 0 && (
                    <div>
                        <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AlertCircle size={12} /> Focus Areas
                        </h3>
                        <div className="space-y-2">
                            {state.stats.recent_mistakes.slice(0, 3).map((mistake, i) => (
                                <div key={i} className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-200/70 leading-relaxed hover:bg-red-500/10 transition-colors">
                                    {mistake.replace(/^- /, '')}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
