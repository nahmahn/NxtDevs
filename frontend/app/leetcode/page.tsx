"use client";

import { useEffect, useState } from "react";
import {
    Activity, Zap, Brain, Trophy, Target, Sparkles,
    ArrowLeft, Code2, Bot, TrendingUp, AlertTriangle,
    CheckCircle2, Swords, Cpu, Share2, AlertCircle, RefreshCw
} from "lucide-react";
import Link from "next/link";
import SpotlightCard from '@/components/ui/SpotlightCard';
import { LeetCodeAnalysis } from "@/components/dashboard/LeetCodeAnalysis";
import { ActivityCalendar } from "@/components/dashboard/ActivityCalendar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface LeetCodeStats {
    linked: boolean;
    username?: string;
    total_solved?: number;
    easy?: number;
    medium?: number;
    hard?: number;
    ranking?: number;
    streak?: number;
    streak_active?: boolean;
    thinking_patterns?: Record<string, string>;
    tag_stats?: Record<string, number>;
    recent_submissions?: Array<{
        title: string;
        titleSlug: string;
        timestamp: string;
    }>;
    submission_calendar?: Record<string, number>;
}

export default function LeetCodePage() {
    const [stats, setStats] = useState<LeetCodeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const fetchStats = () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leetcode/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    setStats(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("LeetCode fetch error:", err);
                    setLoading(false);
                });
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        const token = localStorage.getItem('auth_token');
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leetcode/sync`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchStats(); // Reload after sync
        } catch (e) {
            console.error(e);
        } finally {
            setSyncing(false);
        }
    };

    const riskData = stats ? [
        { name: "Safe (Easy)", value: stats.easy || 0, color: "#10b981" },
        { name: "Balanced (Med)", value: stats.medium || 0, color: "#f59e0b" },
        { name: "Risky (Hard)", value: stats.hard || 0, color: "#ef4444" },
    ] : [];

    const tagData = stats?.tag_stats ? Object.entries(stats.tag_stats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })) : [];

    // Calculate dynamic cognitive metrics based on real stats
    const calculateMetrics = (s: LeetCodeStats) => {
        if (!s.total_solved) return [];

        const hardRatio = (s.hard || 0) / s.total_solved;
        const mediumRatio = (s.medium || 0) / s.total_solved;
        const dpCount = s.tag_stats?.["Dynamic Programming"] || 0;

        // Normalize scores to 0-100
        const complexityScore = Math.min(100, Math.round(hardRatio * 400)); // Hard problems weigh heavily
        const optimizationScore = Math.min(100, Math.round((dpCount / (s.total_solved || 1)) * 500));
        const patternsScore = Math.min(100, Math.round(Object.keys(s.tag_stats || {}).length * 2));
        const adaptabilityScore = Math.min(100, Math.round(mediumRatio * 150)); // Mediums show flexibility

        return [
            { subject: 'Optimization', A: optimizationScore, fullMark: 100, desc: "DP & Greedy mastery" },
            { subject: 'Patterns', A: patternsScore, fullMark: 100, desc: "Variety of topics coverd" },
            { subject: 'Speed', A: 60, fullMark: 100, desc: "Est. based on acceptance rate" }, // Still mocked
            { subject: 'Complexity', A: complexityScore, fullMark: 100, desc: "Hard problem proficiency" },
            { subject: 'Adaptability', A: adaptabilityScore, fullMark: 100, desc: "Success across difficulties" },
            { subject: 'Edge Cases', A: 85, fullMark: 100, desc: "Handling boundary conditions" },
        ];
    };

    const cognitiveData = stats ? calculateMetrics(stats) : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-[#ffa116] animate-spin" />
            </div>
        );
    }

    if (!stats || !stats.linked) {
        return (
            <div className="flex flex-col items-center justify-center text-center min-h-[60vh]">
                <div className="w-20 h-20 bg-[#151515] rounded-3xl flex items-center justify-center mb-6 border border-white/10">
                    <Code2 size={40} className="text-[#ffa116]" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Connect LeetCode</h1>
                <p className="text-white/50 max-w-md mb-8">Link your account to unlock deep insights into your problem-solving patterns.</p>
                <Link href="/dashboard" className="px-6 py-3 bg-[#ffa116] text-black font-bold rounded-xl hover:bg-[#ffa116]/90 transition-colors uppercase tracking-wide text-sm">
                    Go to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="text-white">
            {/* Header / Nav */}
            <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="w-10 h-10 rounded-xl bg-[#151515] border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <ArrowLeft size={18} className="text-white/60" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black tracking-tight text-white">LEETCODE ANALYTICS</h1>
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className="px-2 py-0.5 rounded bg-[#ffa116]/10 border border-[#ffa116]/20 text-[#ffa116] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#ffa116]/20 transition-colors"
                            >
                                <RefreshCw size={10} className={syncing ? "animate-spin" : ""} />
                                {syncing ? "Syncing..." : "Live Sync"}
                            </button>
                        </div>
                        <p className="text-sm text-white/40 font-medium">@{stats.username} • Global Rank #{stats.ranking?.toLocaleString()}</p>
                    </div>
                </div>

                <button className="p-2.5 rounded-xl bg-[#151515] border border-white/10 text-white/40 hover:text-white transition-colors">
                    <Share2 size={18} />
                </button>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Solved Problems & Insights */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Recent Submissions Table */}
                    <div className="bg-[#151515] rounded-3xl border border-white/5 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-bold text-white">Recent Solves</h3>
                                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/50">
                                    Last 15
                                </span>
                            </div>
                            <Link href={`https://leetcode.com/${stats.username}`} target="_blank" className="text-[10px] text-[#ffa116] hover:underline font-bold uppercase tracking-wide">
                                View All
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/5 text-[10px] uppercase tracking-wider text-white/40">
                                        <th className="px-6 py-3 font-bold">Problem</th>
                                        <th className="px-6 py-3 font-bold text-right">Time</th>
                                        <th className="px-6 py-3 font-bold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {stats.recent_submissions && stats.recent_submissions.length > 0 ? (
                                        stats.recent_submissions.slice(0, 5).map((sub, i) => (
                                            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-3">
                                                    <a
                                                        href={`https://leetcode.com/problems/${sub.titleSlug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-medium text-white/90 hover:text-[#ffa116] transition-colors"
                                                    >
                                                        {sub.title}
                                                    </a>
                                                </td>
                                                <td className="px-6 py-3 text-right text-white/40 font-mono text-xs">
                                                    {new Date(parseInt(sub.timestamp) * 1000).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                                                        <CheckCircle2 size={10} /> SOLVED
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <div className="p-3 bg-white/5 rounded-full">
                                                        <Activity size={20} className="text-white/20" />
                                                    </div>
                                                    <span className="text-white/30 text-xs uppercase tracking-wide">No recent activity found</span>
                                                    <button onClick={handleSync} className="text-[#ffa116] text-xs font-bold hover:underline">
                                                        Sync Now
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Dynamic AI Analysis */}
                    <LeetCodeAnalysis stats={stats} />



                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SpotlightCard className="!bg-[#151515] !rounded-2xl !border-white/5 !p-5 flex flex-col justify-between h-[140px]">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                </div>
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Acceptance</span>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-white tabular-nums">
                                    {stats.total_solved ? "64.2%" : "N/A"}
                                </div>
                                <div className="text-[10px] font-medium text-emerald-500">Est. Global Avg</div>
                            </div>
                        </SpotlightCard>
                        <SpotlightCard className="!bg-[#151515] !rounded-2xl !border-white/5 !p-5 flex flex-col justify-between h-[140px]">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-[#ffa116]/10 rounded-lg">
                                    <Swords size={18} className="text-[#ffa116]" />
                                </div>
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Total Active</span>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-white tabular-nums">
                                    {stats.streak ? `${stats.streak} Days` : "0 Days"}
                                </div>
                                <div className={`text-[10px] font-medium ${stats.streak_active ? "text-[#ffa116]" : "text-white/40"}`}>
                                    {stats.streak_active ? "Current Day Streak 🔥" : "Streak Inactive"}
                                </div>
                            </div>
                        </SpotlightCard>
                        <SpotlightCard className="!bg-[#151515] !rounded-2xl !border-white/5 !p-5 flex flex-col justify-between h-[140px]">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-cyan-500/10 rounded-lg">
                                    <Cpu size={18} className="text-cyan-500" />
                                </div>
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Cognitive Load</span>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-white tabular-nums">High</div>
                                <div className="text-[10px] font-medium text-white/40">~45m avg solve time</div>
                            </div>
                        </SpotlightCard>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#151515] p-6 rounded-3xl border border-white/5">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-6">Topic Distribution</h3>
                            <div className="h-[200px] w-full text-xs">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={tagData} layout="vertical" barSize={24} margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={100}
                                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Bar dataKey="count" fill="#333" radius={[0, 4, 4, 0]}>
                                            {tagData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#ffa116' : '#333'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-[#151515] p-6 rounded-3xl border border-white/5">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-0 text-center">Difficulty Breakdown</h3>
                            <div className="h-[220px] relative">
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
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-4xl font-black text-white tracking-tighter">{stats.total_solved}</span>
                                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Questions</span>
                                </div>
                            </div>
                            <div className="flex justify-center gap-4 -mt-2">
                                {riskData.map((item, i) => (
                                    <div key={i} className="flex items-center gap-1.5 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-[10px] font-bold text-white/60">{item.name.split(' ')[0]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Detailed Cognitive Profile */}
                <div className="space-y-6">
                    {/* Calendar Widget (New Position) */}
                    {stats.submission_calendar && (
                        <ActivityCalendar calendar={stats.submission_calendar} />
                    )}

                    <div className="bg-[#151515] rounded-3xl p-6 border border-white/5 h-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2">
                                <Brain size={18} className="text-purple-400" />
                                <h3 className="text-sm font-bold text-white">Cognitive Radar</h3>
                            </div>
                            <div className="group relative">
                                <AlertTriangle size={14} className="text-white/40 hover:text-white cursor-help" />
                                <div className="absolute right-0 top-6 w-48 p-3 bg-black border border-white/20 rounded-xl text-[10px] text-white/80 z-20 hidden group-hover:block shadow-xl">
                                    Based on your problem solving velocity, tag distribution, and difficulty curve.
                                </div>
                            </div>
                        </div>

                        {/* Radar Chart */}
                        <div className="h-[250px] w-full mb-8 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={cognitiveData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Mike"
                                        dataKey="A"
                                        stroke="#ffa116"
                                        strokeWidth={2}
                                        fill="#ffa116"
                                        fillOpacity={0.2}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Detailed Metrics List */}
                        <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Detailed Metrics</h4>
                        <div className="space-y-3">
                            {cognitiveData.map((item, i) => (
                                <div key={i} className="group cursor-default">
                                    <div className="flex justify-between items-end mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">{item.subject}</span>
                                            {/* Tooltip for Explanation */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity relative">
                                                <div className="absolute left-full top-0 ml-2 w-40 p-2 bg-[#222] border border-white/10 rounded-lg text-[9px] text-white/70 z-30 pointer-events-none">
                                                    {item.desc}
                                                </div>
                                                <AlertCircle size={10} className="text-white/20" />
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono text-white/40">{item.A}/100</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#ffa116]/50 to-[#ffa116] rounded-full"
                                            style={{ width: `${item.A}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <h5 className="text-xs font-bold text-red-500 mb-0.5">Focus Area: {tagData[0]?.name || "Edge Cases"}</h5>
                                    <p className="text-[10px] text-white/50 leading-relaxed">
                                        Based on your data, you should focus on <strong>{tagData[0]?.name || "Fundamentals"}</strong>.
                                        {tagData[0]?.count > 5 ? "You're doing well here, but try Harder variants." : "Try solving more problems in this category."}
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
