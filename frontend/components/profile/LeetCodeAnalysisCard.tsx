"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Zap, Brain, Crosshair, TrendingUp, AlertCircle } from "lucide-react";
import SpotlightCard from "@/components/ui/SpotlightCard";

interface LeetCodeStats {
    linked: boolean;
    username?: string;
    total_solved?: number;
    easy?: number;
    medium?: number;
    hard?: number;
    ranking?: number;
    thinking_patterns?: Record<string, string>;
    tag_stats?: Record<string, number>;
    streak?: number;
    streak_active?: boolean;
}

interface Props {
    stats: LeetCodeStats;
}

export default function LeetCodeAnalysisCard({ stats }: Props) {
    if (!stats || !stats.linked) return null;

    const riskData = useMemo(() => {
        const easy = stats.easy || 0;
        const hard = stats.hard || 0;
        const total = stats.total_solved || 1;

        // Simple heuristic for "Risk Appetite" based on Hard/Easy ratio
        return [
            { name: "Safe (Easy)", value: easy, color: "#10b981" }, // Emerald-500
            { name: "Balanced (Med)", value: stats.medium || 0, color: "#f59e0b" }, // Amber-500
            { name: "Risky (Hard)", value: hard, color: "#ef4444" }, // Rose-500
        ];
    }, [stats]);

    return (
        <SpotlightCard className="!bg-[#151515] !rounded-2xl !border-white/5 !p-6 col-span-2 md:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#ffa116]/10 rounded-xl">
                    <Zap size={20} className="text-[#ffa116]" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white tracking-wide uppercase">LeetCode Thinking Profile</h3>
                    <p className="text-xs text-white/40">Cognitive analysis based on {stats.total_solved} solved problems</p>
                </div>
            </div>

            {/* Streak Badge */}
            <div className="absolute top-6 right-6 flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                <div className={`w-2 h-2 rounded-full ${stats.streak_active ? 'bg-orange-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-xs font-bold text-white/60">
                    {stats.streak || 0} Day Streak
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Visual Chart */}
                <div className="h-[200px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={riskData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {riskData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff', fontSize: '12px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-white">{stats.total_solved}</span>
                        <span className="text-[10px] items-center text-white/40 uppercase tracking-widest font-bold">Solved</span>
                    </div>
                </div>

                {/* Insights List */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Detected Patterns</h4>

                    {stats.thinking_patterns && Object.keys(stats.thinking_patterns).length > 0 ? (
                        Object.entries(stats.thinking_patterns).map(([category, insight], i) => {
                            // Skip complex objects (like recommended_problems) to prevent React Error #31
                            if (!insight || (typeof insight === 'object' && !Array.isArray(insight))) return null;
                            if (Array.isArray(insight) && insight.length > 0 && typeof insight[0] === 'object') return null;

                            const displayContent = Array.isArray(insight) ? insight.join(". ") : String(insight);

                            return (
                                <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Brain size={14} className="text-purple-400" />
                                        <span className="text-[10px] font-bold text-white/60 uppercase">{category.replace(/_/g, " ")}</span>
                                    </div>
                                    <p className="text-sm font-medium text-white line-clamp-3">{displayContent}</p>
                                </div>
                            );
                        })
                    ) : (
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center gap-3">
                            <AlertCircle size={16} className="text-white/40" />
                            <p className="text-xs text-white/40">Solve more problems to unlock insights.</p>
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="text-center p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <div className="text-[10px] text-emerald-500 font-bold mb-0.5">EASY</div>
                            <div className="text-lg font-black text-white">{stats.easy}</div>
                        </div>
                        <div className="text-center p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            <div className="text-[10px] text-amber-500 font-bold mb-0.5">MED</div>
                            <div className="text-lg font-black text-white">{stats.medium}</div>
                        </div>
                        <div className="text-center p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                            <div className="text-[10px] text-rose-500 font-bold mb-0.5">HARD</div>
                            <div className="text-lg font-black text-white">{stats.hard}</div>
                        </div>
                    </div>
                </div>
            </div>
        </SpotlightCard>
    );
}
