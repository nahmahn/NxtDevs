"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Lock, Trophy, Calendar, BarChart3, Puzzle, Activity, Brain, Sparkles, Gamepad2,
    Target, Zap, Award, TrendingUp, CheckCircle2, Star, Flame, Clock
} from "lucide-react";

import SpotlightCard from '@/components/ui/SpotlightCard';
import CountUp from '@/components/ui/CountUp';
import BlurText from '@/components/ui/BlurText';
import LeetCodeWidget from '@/components/dashboard/LeetCodeWidget';

interface UserStats {
    username: string;
    elo_rating: number;
    biases: {
        Greedy: number;
        Blindness: number;
        Premature: number;
    };
    total_attempts: number;
}

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    unlocked: boolean;
    progress?: number;
    maxProgress?: number;
}

export default function Dashboard() {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const userId = localStorage.getItem('user_id');
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/profile`, {
            headers: userId ? { 'X-User-Id': userId } : {}
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load profile");
                return res.json();
            })
            .then(setStats)
            .catch((err) => {
                console.error(err);
                setError(err.message);
            })
            .finally(() => setLoading(false));
    }, []);

    // Calculate XP from total attempts (10 XP per attempt)
    const xp = stats ? stats.total_attempts * 10 : 0;
    const level = Math.floor(xp / 100) + 1;
    const xpInCurrentLevel = xp % 100;
    const xpToNextLevel = 100;

    // Calculate progress for unlocking modes
    const modesUnlockProgress = stats ? Math.min(stats.total_attempts, 5) : 0;
    const modesUnlocked = modesUnlockProgress >= 3;

    // Generate achievements based on stats
    const achievements: Achievement[] = stats ? [
        {
            id: "first_blood",
            name: "First Blood",
            description: "Complete your first question",
            icon: <Target size={16} className="text-red-400" />,
            unlocked: stats.total_attempts >= 1,
        },
        {
            id: "streak_3",
            name: "Hot Streak",
            description: "Get 3 correct in a row",
            icon: <Flame size={16} className="text-orange-400" />,
            unlocked: stats.total_attempts >= 5, // Simplified for MVP
        },
        {
            id: "level_5",
            name: "Rising Star",
            description: "Reach Level 5",
            icon: <Star size={16} className="text-yellow-400" />,
            unlocked: level >= 5,
            progress: level,
            maxProgress: 5,
        },
        {
            id: "rating_1300",
            name: "Contender",
            description: "Reach 1300 ELO rating",
            icon: <TrendingUp size={16} className="text-cyan-400" />,
            unlocked: stats.elo_rating >= 1300,
            progress: Math.min(stats.elo_rating, 1300),
            maxProgress: 1300,
        },
        {
            id: "attempts_10",
            name: "Dedicated",
            description: "Complete 10 questions",
            icon: <CheckCircle2 size={16} className="text-green-400" />,
            unlocked: stats.total_attempts >= 10,
            progress: Math.min(stats.total_attempts, 10),
            maxProgress: 10,
        },
        {
            id: "attempts_50",
            name: "Veteran",
            description: "Complete 50 questions",
            icon: <Award size={16} className="text-purple-400" />,
            unlocked: stats.total_attempts >= 50,
            progress: Math.min(stats.total_attempts, 50),
            maxProgress: 50,
        },
    ] : [];

    const unlockedAchievements = achievements.filter(a => a.unlocked).length;

    const duels = [
        { id: 1, title: "PRACTICE MODE", subtitle: "Adaptive learning, no pressure", category: "practice", type: "card-orange", locked: false, badge: "Recommended", href: "/practice", icon: <Brain size={100} /> },
        { id: 2, title: "RATING MODE", subtitle: "Compete for global ranking", category: "rating", type: "card-blue", locked: false, href: "/rating", icon: <Trophy size={100} /> },
        { id: 3, title: "1V1 DUELS", subtitle: "Real-time battles", category: "duel", type: "card-teal", locked: false, href: "/duel", icon: <Gamepad2 size={100} /> },
        { id: 5, title: "LEETCODE ANALYTICS", subtitle: "Biases & Thinking Profile", category: "analytics", type: "card-dark border-[#ffa116]/40 bg-[#ffa116]/5 hover:bg-[#ffa116]/10", locked: false, href: "/leetcode", icon: <Activity size={100} className="text-[#ffa116]" /> },
        { id: 4, title: "DAILY CHALLENGE", subtitle: "Fresh problems every day", category: "daily", type: "card-purple", locked: true, href: "#", icon: <Calendar size={100} /> },
        { id: 6, title: "PROBLEM SETS", subtitle: "Curated collections", category: "sets", type: "card-dark", locked: true, href: "#", icon: <Puzzle size={100} /> },
    ];

    // Loading skeleton
    if (loading) {
        return (
            <div className="flex gap-8 w-full p-6">
                <div className="flex-1 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-white/10 animate-pulse" />
                        <div className="space-y-2">
                            <div className="w-32 h-5 rounded bg-white/10 animate-pulse" />
                            <div className="w-48 h-3 rounded bg-white/5 animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-[170px] rounded-2xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                </div>
                <div className="w-[300px] space-y-5 hidden xl:block">
                    <div className="h-[200px] rounded-2xl bg-white/5 animate-pulse" />
                    <div className="h-[150px] rounded-2xl bg-white/5 animate-pulse" />
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <Activity size={32} className="text-red-500" />
                </div>
                <p className="text-white/50">Failed to load dashboard. Is the backend running?</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-white text-black rounded-lg font-medium"
                >
                    Retry
                </button>
            </div>
        );
    }



    // ... existing code ...

    return (
        <div className="flex gap-8 w-full p-6">
            {/* Main Content */}
            <div className="flex-1 space-y-8">
                {/* User Welcome & XP Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center border-2 border-white/20 shadow-lg shadow-orange-500/20">
                            <Sparkles className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                Welcome back,
                                <BlurText
                                    text={`${stats.username}!`}
                                    className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60"
                                    delay={0.05}
                                    animateBy="letters"
                                />
                            </h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-white/50">Level <CountUp to={level} duration={1} /></span>
                                <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-lime-400 to-emerald-400 rounded-full transition-all duration-500"
                                        style={{ width: `${(xpInCurrentLevel / xpToNextLevel) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-white/30">{xpInCurrentLevel}/{xpToNextLevel} XP</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <SpotlightCard className="!p-0 !bg-transparent !border-none overflow-visible">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] rounded-lg border border-white/5">
                                <Zap size={14} className="text-amber-400" />
                                <span className="text-sm font-bold text-white tabular-nums">
                                    <CountUp to={xp} duration={2} separator="," /> XP
                                </span>
                            </div>
                        </SpotlightCard>
                        <SpotlightCard className="!p-0 !bg-transparent !border-none overflow-visible">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] rounded-lg border border-white/5">
                                <Trophy size={14} className="text-cyan-400" />
                                <span className="text-sm font-bold text-white tabular-nums">
                                    <CountUp to={Math.round(stats.elo_rating)} duration={2} separator="," />
                                </span>
                            </div>
                        </SpotlightCard>
                    </div>
                </div>

                {/* Section Header */}
                <div>
                    <h2 className="text-[11px] font-bold text-white/40 mb-4 tracking-wider uppercase">Arena Modes</h2>

                    {/* Main Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {duels.map((duel) => (
                            <Link
                                key={duel.id}
                                href={duel.locked ? "#" : duel.href}
                                className={`
                                    ${duel.type} p-5 rounded-2xl relative group transition-all duration-300
                                    ${duel.locked ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-2xl cursor-pointer'}
                                    h-[170px] flex flex-col justify-between overflow-hidden
                                `}
                            >
                                {/* Active State Background Pattern */}
                                {!duel.locked && (
                                    <div className="absolute inset-0 opacity-10">
                                        <div className="absolute top-0 right-0 p-10 bg-white/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                )}

                                {duel.badge && (
                                    <div className={`absolute top-3 right-3 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[9px] font-bold shadow-sm z-20 ${duel.badge === "Coming Soon" ? "bg-white/10 text-white/60" : "bg-lime-500/20 text-lime-400 border border-lime-500/30"
                                        }`}>
                                        {duel.badge}
                                    </div>
                                )}

                                {duel.locked && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-20">
                                        <Lock size={24} className="text-white/40" />
                                    </div>
                                )}

                                {/* Icon Graphic (Corner Watermark) */}
                                <div className="absolute -bottom-4 -right-4 opacity-10 transform rotate-[-10deg] pointer-events-none transition-transform group-hover:scale-110 duration-500">
                                    {duel.icon}
                                </div>

                                {/* Mode Indicator */}
                                <div className="relative z-10 w-2/3 mt-2">
                                    <div className="flex items-center gap-2 opacity-60">
                                        <div className="h-0.5 w-4 bg-white/60 rounded-full" />
                                        <span className="text-[10px] font-bold tracking-widest uppercase">{duel.category}</span>
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-lg font-black mb-0.5 leading-tight tracking-tight uppercase">{duel.title}</h3>
                                    {duel.subtitle && <p className="text-[10px] font-bold opacity-60 uppercase tracking-wide">{duel.subtitle}</p>}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Progress Tip */}
                <div className="bg-[#111] rounded-xl p-4 flex items-center gap-4 max-w-lg border-l-4 border-[#84cc16]">
                    <div className="text-xs text-white/60">
                        <span className="text-[#84cc16] font-bold">{stats.total_attempts} QUESTIONS SOLVED</span>
                        {modesUnlocked ? (
                            <span> — Keep going to unlock more achievements!</span>
                        ) : (
                            <span> — Complete {3 - modesUnlockProgress} more to unlock new modes</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-[300px] space-y-5 hidden xl:block">
                {/* LeetCode Integration */}
                <LeetCodeWidget />

                {/* Ratings Card */}
                <div className="bg-[#151515] rounded-2xl p-5 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[11px] font-bold text-white/30 tracking-wider">YOUR STATS</h3>
                        <Link href="/profile" className="text-[10px] text-white/30 hover:text-white/60 transition-colors">
                            View Profile →
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <SpotlightCard className="!p-3.5 !bg-[#0a0a0a] !rounded-xl !border-white/5">
                            <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                                <Trophy size={10} className="text-cyan-400" />
                                <span className="text-[9px] font-bold tracking-wide">ELO RATING</span>
                            </div>
                            <div className="text-xl font-black tracking-tight leading-none text-cyan-400 tabular-nums">
                                <CountUp
                                    to={Math.round(stats.elo_rating)}
                                    duration={2.5}
                                    separator=","
                                />
                            </div>
                        </SpotlightCard>
                        <SpotlightCard className="!p-3.5 !bg-[#0a0a0a] !rounded-xl !border-white/5">
                            <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                                <Target size={10} className="text-lime-400" />
                                <span className="text-[9px] font-bold tracking-wide">QUESTIONS</span>
                            </div>
                            <div className="text-xl font-black tracking-tight leading-none text-lime-400 tabular-nums">
                                <CountUp
                                    to={stats.total_attempts}
                                    duration={2}
                                    separator=","
                                />
                            </div>
                        </SpotlightCard>
                        <SpotlightCard className="!p-3.5 !bg-[#0a0a0a] !rounded-xl !border-white/5">
                            <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                                <Zap size={10} className="text-amber-400" />
                                <span className="text-[9px] font-bold tracking-wide">LEVEL</span>
                            </div>
                            <div className="text-xl font-black tracking-tight leading-none text-amber-400 tabular-nums">
                                <CountUp to={level} duration={1.5} />
                            </div>
                        </SpotlightCard>
                        <SpotlightCard className="!p-3.5 !bg-[#0a0a0a] !rounded-xl !border-white/5">
                            <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                                <Star size={10} className="text-purple-400" />
                                <span className="text-[9px] font-bold tracking-wide">BADGES</span>
                            </div>
                            <div className="text-xl font-black tracking-tight leading-none text-purple-400 tabular-nums">
                                <CountUp to={unlockedAchievements} duration={1} />
                            </div>
                        </SpotlightCard>
                    </div>
                </div>

                {/* Achievements */}
                <div className="bg-[#151515] rounded-2xl p-5 border border-white/5">
                    <h3 className="text-[11px] font-bold text-white/30 tracking-wider mb-4">ACHIEVEMENTS</h3>

                    <div className="space-y-2.5">
                        {achievements.slice(0, 4).map((achievement) => (
                            <div
                                key={achievement.id}
                                className={`bg-[#0a0a0a] p-3 rounded-xl border transition-colors ${achievement.unlocked
                                    ? 'border-white/10'
                                    : 'border-white/5 opacity-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${achievement.unlocked ? 'bg-white/10' : 'bg-white/5'
                                        }`}>
                                        {achievement.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-white truncate">{achievement.name}</span>
                                            {achievement.unlocked && (
                                                <CheckCircle2 size={12} className="text-lime-400 flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-white/40 truncate">{achievement.description}</p>
                                        {!achievement.unlocked && achievement.progress !== undefined && (
                                            <div className="mt-1.5 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-white/20 rounded-full"
                                                    style={{ width: `${(achievement.progress / (achievement.maxProgress || 1)) * 100}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Link
                        href="/profile"
                        className="block mt-3 text-center text-[10px] text-white/30 hover:text-white/60 transition-colors"
                    >
                        View all {achievements.length} achievements →
                    </Link>
                </div>

                {/* Quick Actions */}
                <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5">
                    <h3 className="text-[11px] font-bold text-white/30 tracking-wider mb-4">QUICK START</h3>
                    <div className="space-y-2">
                        <Link
                            href="/practice"
                            className="block w-full p-3 bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-500/30 rounded-xl text-center text-sm font-bold text-orange-400 hover:from-orange-500/30 hover:to-pink-500/30 transition-colors"
                        >
                            Start Practice →
                        </Link>
                        <Link
                            href="/leaderboard"
                            className="block w-full p-3 bg-white/5 border border-white/10 rounded-xl text-center text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            View Leaderboard
                        </Link>
                    </div>
                </div>

                {/* Calendar Widget */}
                <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5">
                    <h3 className="text-[11px] font-bold text-white/30 tracking-wider mb-4">ACTIVITY</h3>
                    {/* Placeholder for now until we wire up the prop */}
                    <div className="text-center text-xs text-white/30">
                        Check LeetCode page for detailed calendar
                    </div>
                </div>
            </div>
        </div>
    );
}
