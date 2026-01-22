"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trophy, RefreshCw, Home, ArrowRight, Zap, Target, Share2, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";

// Mock data for performance graph
const performanceData = [
    { time: '0s', myScore: 0, oppScore: 0 },
    { time: '15s', myScore: 10, oppScore: 5 },
    { time: '30s', myScore: 18, oppScore: 8 },
    { time: '45s', myScore: 25, oppScore: 8 },
    { time: '60s', myScore: 28, oppScore: 10 },
];

function ResultsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [result, setResult] = useState<'VICTORY' | 'DEFEAT' | 'DRAW'>('VICTORY');

    // Mock Result Data (In real app, fetch from localized state or API)
    const stats = {
        myScore: 28,
        oppScore: 10,
        myRating: 1015,
        ratingDelta: 15,
        xpEarned: 10,
        oppName: "quest687850",
        oppRating: 1029,
        oppDelta: -15
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className={`absolute inset-0 opacity-10 ${result === 'VICTORY' ? 'bg-lime-500/10' : 'bg-red-500/10'}`} />

            <div className="w-full max-w-2xl relative z-10">
                {/* Result Card */}
                <div className="bg-[#151515] border border-[#222] rounded-2xl overflow-hidden shadow-2xl">

                    {/* Header / Nav */}
                    <div className="flex justify-between items-center p-4 border-b border-[#222]">
                        <Link href="/dashboard" className="p-2 hover:bg-[#222] rounded-lg text-white/50 hover:text-white transition-colors">
                            <Home size={20} />
                        </Link>
                        <div className="flex gap-4 text-xs font-bold tracking-wider text-[#666]">
                            <span className="text-white">MATCH DETAILS</span>
                            <span>Detailed Insight</span>
                        </div>
                        <button className="p-2 hover:bg-[#222] rounded-lg text-white/50 hover:text-white transition-colors">
                            <Share2 size={20} />
                        </button>
                    </div>

                    <div className="p-8 text-center space-y-8">
                        {/* Title */}
                        <div className="relative">
                            <h1 className={`text-6xl font-black italic tracking-tighter ${result === 'VICTORY'
                                ? "bg-gradient-to-b from-cyan-300 to-cyan-500 text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                                : "text-red-500"
                                }`}>
                                {result}
                            </h1>
                            {result === 'VICTORY' && <div className="absolute -top-4 -right-4 text-yellow-400 animate-bounce"><Trophy size={32} /></div>}
                        </div>

                        {/* Score Board */}
                        <div className="flex justify-between items-center max-w-md mx-auto">
                            {/* Me */}
                            <div className="text-right">
                                <div className="text-5xl font-bold text-white mb-2">{stats.myScore}</div>
                                <div className="flex items-center justify-end gap-2 mb-1">
                                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                    <span className="font-bold text-white">naman9609</span>
                                </div>
                                <div className="text-xs text-[#888] font-mono">
                                    ({stats.myRating}) <span className="text-lime-400">▲ {stats.ratingDelta}</span>
                                </div>
                            </div>

                            <div className="text-[#333] font-mono text-xl">-</div>

                            {/* Opponent */}
                            <div className="text-left">
                                <div className="text-5xl font-bold text-[#444] mb-2">{stats.oppScore}</div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-3 h-3 rounded-full bg-[#333]"></span>
                                    <span className="font-bold text-[#666]">{stats.oppName}</span>
                                </div>
                                <div className="text-xs text-[#444] font-mono">
                                    ({stats.oppRating}) <span className="text-red-900">▼ {Math.abs(stats.oppDelta)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Rewards Grid */}
                        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#333]">
                                <div className="text-[10px] text-[#666] uppercase tracking-widest font-bold mb-1">Rating</div>
                                <div className="flex items-center justify-center gap-2 text-xl font-bold text-white">
                                    <TrendingUp size={18} className="text-lime-400" />
                                    {stats.myRating}
                                    <span className="text-lime-400 text-sm">+ {stats.ratingDelta}</span>
                                </div>
                            </div>
                            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#333]">
                                <div className="text-[10px] text-[#666] uppercase tracking-widest font-bold mb-1">Total XP</div>
                                <div className="flex items-center justify-center gap-2 text-xl font-bold text-white">
                                    <Zap size={18} className="text-yellow-400" />
                                    {stats.xpEarned}
                                    <span className="text-yellow-400 text-sm">+ {stats.xpEarned}</span>
                                </div>
                            </div>
                        </div>

                        {/* Graph */}
                        <div className="h-32 mt-8 opacity-50 hover:opacity-100 transition-opacity">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={performanceData}>
                                    <Line type="monotone" dataKey="myScore" stroke="#22d3ee" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="oppScore" stroke="#333" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-[#111] border-t border-[#222] grid grid-cols-2 gap-4">
                        <button className="flex items-center justify-center gap-2 py-3 rounded-lg border border-[#333] text-white/70 hover:bg-[#222] hover:text-white transition-all font-bold text-sm uppercase tracking-wide">
                            <RefreshCw size={16} />
                            Rematch
                        </button>
                        <Link href="/practice" className="flex items-center justify-center gap-2 py-3 rounded-lg bg-lime-500 text-black hover:bg-lime-400 transition-all font-bold text-sm uppercase tracking-wide shadow-[0_0_20px_rgba(132,204,22,0.3)] hover:shadow-[0_0_30px_rgba(132,204,22,0.5)]">
                            <Target size={16} />
                            New Game
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-white">Loading...</div>}>
            <ResultsContent />
        </Suspense>
    );
}
