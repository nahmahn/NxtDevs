'use client';

import Link from "next/link";
import { Bell, Flame, ChevronDown, BarChart3, Gamepad2, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileStats {
    username: string;
    elo_rating: number;
    total_attempts: number;
    correct_attempts: number;
    accuracy: number;
    duels_played: number;
    duels_won: number;
    streak: number;
}

export function TopNav() {
    const [stats, setStats] = useState<ProfileStats | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchStats = () => {
            const userId = localStorage.getItem('user_id');

            // If no user_id, redirect to login
            if (!userId) {
                router.push('/login');
                return;
            }

            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/profile`, {
                headers: { 'X-User-Id': userId }
            })
                .then((res) => {
                    if (!res.ok) {
                        throw new Error('Failed to fetch profile');
                    }
                    return res.json();
                })
                .then(setStats)
                .catch((err) => {
                    console.error('Profile fetch error:', err);
                });
        };

        fetchStats();
        // Refresh stats every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [router]);

    // Calculate XP (simple formula: correct answers * 10)
    const xp = stats ? stats.correct_attempts * 10 : 0;

    // Get first letter of username for avatar
    const avatarLetter = stats?.username?.charAt(0).toUpperCase() || 'U';

    return (
        <header className="h-20 w-full fixed top-0 z-50 bg-[#09090b] border-b border-white/10 flex items-center justify-between px-8 md:pl-[70px]">
            {/* Left Side: Stats (Coder Style) */}
            <div className="flex items-center gap-4 ml-6">
                <div className="hidden md:flex items-center gap-3 bg-[#111] px-4 py-2 rounded-lg border border-white/5">
                    <div className="p-1.5 rounded bg-green-500/10 text-[#84cc16]">
                        <BarChart3 size={16} />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Problems Solved</div>
                        <div className="text-sm font-bold text-white font-mono leading-none">{stats?.total_attempts || 0}</div>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-3 bg-[#111] px-4 py-2 rounded-lg border border-white/5">
                    <div className="p-1.5 rounded bg-green-500/10 text-[#84cc16]">
                        <Gamepad2 size={16} />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Games Played</div>
                        <div className="text-sm font-bold text-white font-mono leading-none">{stats?.duels_played || 0}</div>
                    </div>
                </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
                {/* Notifications */}
                <button className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-white/10 transition-colors">
                    <Bell size={18} className="text-white" />
                </button>
                {/* Streak */}
                <button className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-white/10 transition-colors relative">
                    <Flame size={18} className="text-orange-500 fill-orange-500" />
                    {(stats?.streak || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 bg-orange-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {stats?.streak}
                        </span>
                    )}
                </button>

                {/* XP Pill */}
                <div className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-full border border-white/5">
                    <Trophy size={16} className="text-yellow-500" />
                    <span className="text-xs font-bold text-white">{xp} XP</span>
                </div>

                {/* Accuracy Pill */}
                <div className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-full border border-white/5">
                    <div className="w-4 h-4 rounded-full bg-[#84cc16] flex items-center justify-center text-[10px] text-black font-bold">%</div>
                    <span className="text-xs font-bold text-white">{stats?.accuracy?.toFixed(0) || 0}% accuracy</span>
                </div>

                {/* User Profile */}
                <Link href="/profile" className="flex items-center gap-3 pl-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-black border-2 border-[#111] relative">
                        <span className="relative z-10">{avatarLetter}</span>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        </div>
                    </div>
                    <div className="hidden lg:block">
                        <div className="text-sm font-bold text-white leading-tight">{stats?.username || 'Loading...'}</div>
                        <div className="text-xs font-bold text-white/40 leading-tight">{Math.round(stats?.elo_rating || 1200)} ELO</div>
                    </div>
                    <ChevronDown size={14} className="text-white/40" />
                </Link>
            </div>
        </header>
    );
}

