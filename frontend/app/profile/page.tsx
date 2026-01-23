"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Flame, Zap, Trophy, Gamepad2, BarChart3, Brain, Puzzle, Activity, User, ArrowRight, Share2, ChevronDown, Hexagon } from "lucide-react";
import { RatingHistoryGraph } from "@/components/profile/RatingHistoryGraph";
import SpotlightCard from '@/components/ui/SpotlightCard';
import CountUp from '@/components/ui/CountUp';
import TiltedCard from '@/components/ui/TiltedCard';
import LeetCodeAnalysisCard from "@/components/profile/LeetCodeAnalysisCard";

export default function ProfilePage() {
    const [stats, setStats] = useState<any>(null);
    const [leetcodeStats, setLeetCodeStats] = useState<any>(null);

    useEffect(() => {
        const userId = localStorage.getItem('user_id');
        const token = localStorage.getItem('auth_token');

        // Fetch user profile
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/profile`, {
            headers: userId ? { 'X-User-Id': userId } : {}
        })
            .then((res) => res.json())
            .then(setStats)
            .catch((err) => console.error(err));

        // Fetch LeetCode stats
        if (token) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leetcode/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(setLeetCodeStats)
                .catch(err => console.error("LeetCode fetch error:", err));
        }
    }, []);

    if (!stats) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-[#84cc16] animate-spin" />
            </div>
        );
    }

    const rank = stats.elo_rating < 1100 ? "NOVICE" : "AMATEUR";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (Main Content) */}
            <div className="lg:col-span-2 space-y-8">
                {/* Banner & Profile Info */}
                <div className="relative">
                    {/* Banner */}
                    <div className="h-48 rounded-3xl overflow-hidden bg-[#a7f3d0] relative border border-white/5">
                        {/* Abstract Pattern - SVG Background */}
                        <svg className="absolute inset-0 w-full h-full opacity-40 text-black" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M0 20 L20 40 M20 0 L40 20" stroke="currentColor" strokeWidth="2" fill="none" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#pattern)" />
                            {/* Floating Shapes */}
                            <circle cx="20%" cy="30%" r="20" fill="currentColor" fillOpacity="0.1" />
                            <rect x="60%" y="50%" width="40" height="40" transform="rotate(45 60 50)" fill="currentColor" fillOpacity="0.1" />
                        </svg>

                        {/* Center Rank Text */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-4xl font-black text-black tracking-tighter uppercase opacity-80">{rank}</span>
                        </div>

                        {/* Edit Button */}
                        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md p-2 rounded-full text-white cursor-pointer hover:scale-110 transition-transform">
                            <ArrowRight size={16} className="rotate-[-45deg]" />
                        </div>
                    </div>

                    {/* Avatar & Info */}
                    <div className="flex flex-col md:flex-row items-end md:items-end gap-6 px-4 -mt-10 relative z-10">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-[#f97316] border-[6px] border-[#09090b] flex items-center justify-center shadow-2xl relative overflow-hidden">
                                <User size={40} className="text-black fill-black/20" />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                            </div>
                            <div className="absolute font-black text-[10px] bg-black text-white px-2 py-0.5 rounded-full bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border border-white/20 whitespace-nowrap">
                                Lvl. 10
                            </div>
                        </div>

                        <div className="flex-1 mb-1">
                            <h1 className="text-2xl font-black text-white tracking-tight">{stats.username}</h1>
                            <div className="flex items-center gap-3 text-sm font-medium text-white/40">
                                <span>@{stats.username}</span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span className="text-[#84cc16]">0 Friends</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 mb-1 w-full md:w-auto">
                            <button className="px-4 py-2 rounded-full border border-white/10 bg-[#151515] text-[10px] font-bold text-white/60 hover:text-white hover:border-white/30 transition-all flex items-center gap-2">
                                <Plus size={12} /> Add College
                            </button>
                            <button className="px-4 py-2 rounded-full border border-white/10 bg-[#151515] text-[10px] font-bold text-white/60 hover:text-white hover:border-white/30 transition-all flex items-center gap-2">
                                <Plus size={12} /> Add Socials
                            </button>
                            <button className="px-5 py-2 rounded-full bg-[#84cc16] text-black text-[10px] font-black tracking-wide hover:bg-[#a3e635] transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(132,204,22,0.3)]">
                                <User size={12} className="fill-current" /> ADD MORE FRIENDS
                            </button>
                            <button className="p-2 rounded-full border border-white/10 bg-[#151515] text-white/40 hover:text-white hover:border-white/30 transition-all">
                                <Share2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>



                {/* Ratings Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-bold text-white/40 tracking-widest uppercase">Ratings</h3>
                        <ArrowRight size={14} className="text-white/20" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'ELO RATING', value: stats.elo_rating || 1200, color: "text-[#84cc16]", icon: "zap" },
                            { label: 'DUELS WON', value: stats.duels_won || 0, color: "text-cyan-400", icon: "trophy" },
                            { label: 'WIN RATE', value: stats.win_rate || 0, suffix: '%', color: "text-teal-400", icon: "chart" },
                            { label: 'QUESTIONS', value: stats.duel_questions_solved || 0, color: "text-emerald-400", icon: "brain" },
                        ].map((stat, i) => (
                            <SpotlightCard key={i} className="!bg-[#151515] !p-5 !rounded-2xl !border-white/5 flex flex-col justify-between h-28 group hover:border-white/10 transition-colors relative overflow-hidden">
                                <div className="z-10 relative">
                                    <div className="flex items-center gap-2 mb-1 opacity-60">
                                        {stat.icon === "zap" && <Zap size={12} className="text-[#84cc16]" />}
                                        {stat.icon === "trophy" && <Trophy size={12} className="text-cyan-400" />}
                                        {stat.icon === "chart" && <BarChart3 size={12} className="text-teal-400" />}
                                        {stat.icon === "brain" && <Brain size={12} className="text-emerald-400" />}
                                        <span className="text-[10px] font-bold tracking-wide">{stat.label}</span>
                                    </div>
                                    <div className={`text-2xl font-black tracking-tight ${stat.color} tabular-nums`}>
                                        <CountUp to={stat.value} duration={1.5} />{stat.suffix || ''}
                                    </div>
                                </div>
                                <div className="absolute bottom-0 right-0 p-8 opacity-5 pointer-events-none">
                                    {stat.icon === "zap" && <Zap size={60} />}
                                    {stat.icon === "trophy" && <Trophy size={60} />}
                                    {stat.icon === "chart" && <BarChart3 size={60} />}
                                    {stat.icon === "brain" && <Brain size={60} />}
                                </div>
                            </SpotlightCard>
                        ))}
                    </div>
                </div>

                {/* LeetCode Analysis */}
                {leetcodeStats && leetcodeStats.linked && (
                    <LeetCodeAnalysisCard stats={leetcodeStats} />
                )}
            </div>

            {/* Right Column (Sidebar) */}
            <div className="space-y-6">
                {/* Rank Card */}
                {/* Rank Card */}
                <div className="h-[320px] w-full relative z-10">
                    <TiltedCard
                        containerHeight="100%"
                        containerWidth="100%"
                        imageHeight="100%"
                        imageWidth="100%"
                        rotateAmplitude={8}
                        scaleOnHover={1.02}
                        showMobileWarning={false}
                        showTooltip={false}
                        displayOverlayContent={false}
                    >
                        <div className="bg-[#151515] rounded-3xl p-6 border border-white/5 h-full flex flex-col relative overflow-hidden group">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-8 z-10 relative">
                                <div className="flex items-center gap-2 text-xs font-bold text-white bg-[#09090b] border border-white/10 px-3 py-1.5 rounded-lg">
                                    <Zap size={12} className="text-[#84cc16]" />
                                    <span>Duel Rank</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-[#09090b] border border-white/10 flex items-center justify-center">
                                    <ArrowRight size={14} className="text-white/40" />
                                </div>
                            </div>

                            {/* Hexagon Rank */}
                            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                                <div className="relative mb-4">
                                    <Hexagon size={100} className="text-[#a7f3d0] fill-[#a7f3d0]/10 stroke-[1.5]" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-2 h-2 rotate-45 bg-[#a7f3d0]" />
                                    </div>
                                </div>
                                <h2 className="text-lg font-black text-[#a7f3d0] tracking-wider uppercase">{rank}</h2>
                            </div>

                            {/* Progress */}
                            <div className="z-10 relative mt-auto">
                                <div className="h-1.5 w-full bg-[#09090b] rounded-full overflow-hidden flex mb-2">
                                    <div
                                        className="h-full bg-[#a7f3d0] rounded-full shadow-[0_0_10px_rgba(167,243,208,0.4)]"
                                        style={{ width: `${Math.min(100, ((stats.elo_rating - 1000) / 200) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                    <span>ELO Rating</span>
                                    <span className="text-white font-mono tabular-nums">
                                        <CountUp to={Math.round(stats.elo_rating)} duration={2} />
                                    </span>
                                </div>
                            </div>

                            {/* Background Glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#a7f3d0]/5 pointer-events-none" />
                        </div>
                    </TiltedCard>
                </div>

                {/* Rating History Graph */}
                <RatingHistoryGraph />

                {/* Stats Overview */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white mb-2">Duel Stats</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Wins', value: stats.duels_won || 0, icon: <Trophy size={20} className="fill-current" />, color: 'text-[#6ee7b7]', bg: 'bg-[#2a2a2a]' },
                            { label: 'Losses', value: stats.duels_lost || 0, icon: <Flame size={20} className="fill-current" />, color: 'text-[#fca5a5]', bg: 'bg-[#2a2a2a]' },
                            { label: 'Total Duels', value: stats.duels_played || 0, icon: <Gamepad2 size={20} className="fill-current" />, color: 'text-[#93c5fd]', bg: 'bg-[#2a2a2a]' },
                            { label: 'Accuracy', value: stats.accuracy || 0, suffix: '%', icon: <BarChart3 size={20} className="fill-current" />, color: 'text-[#c4b5fd]', bg: 'bg-[#2a2a2a]' }
                        ].map((item, i) => (
                            <SpotlightCard key={i} className="!bg-[#151515] !p-4 !rounded-2xl !border-white/5 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color}`}>
                                    {item.icon}
                                </div>
                                <div>
                                    <div className="text-lg font-black leading-none mb-1 tabular-nums">
                                        <CountUp to={item.value} duration={1.5} />{item.suffix || ''}
                                    </div>
                                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wide">{item.label}</div>
                                </div>
                            </SpotlightCard>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
