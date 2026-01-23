"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, TrendingUp, User, Target, Activity, RefreshCw } from "lucide-react";
import CountUp from '@/components/ui/CountUp';

interface LeaderboardEntry {
    rank: number;
    username: string;
    elo_rating: number;
    total_attempts: number;
    correct_attempts: number;
    accuracy: number;
    is_current_user?: boolean;
}

interface LeaderboardData {
    leaderboard: LeaderboardEntry[];
    total_users: number;
    current_user_rank: number | null;
    current_user: LeaderboardEntry | null;
}

export default function Leaderboard() {
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeaderboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const userId = localStorage.getItem('user_id');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leaderboard?limit=20`, {
                headers: userId ? { 'X-User-Id': userId } : {}
            });
            if (!res.ok) throw new Error("Failed to load leaderboard");
            const result = await res.json();
            setData(result);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    // Skeleton loading
    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b border-[#222] pb-4">
                    <div>
                        <div className="w-48 h-8 bg-white/10 rounded animate-pulse mb-2" />
                        <div className="w-32 h-4 bg-white/5 rounded animate-pulse" />
                    </div>
                    <Trophy size={32} className="text-[#ffd60a]" />
                </div>
                <div className="bg-[#151515] rounded-2xl p-4 border border-white/5 animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10" />
                        <div className="space-y-2">
                            <div className="w-24 h-4 bg-white/10 rounded" />
                            <div className="w-16 h-3 bg-white/5 rounded" />
                        </div>
                    </div>
                </div>
                <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b border-white/5">
                            <div className="w-8 h-4 bg-white/10 rounded animate-pulse" />
                            <div className="w-32 h-4 bg-white/10 rounded animate-pulse" />
                            <div className="flex-1" />
                            <div className="w-16 h-4 bg-white/10 rounded animate-pulse" />
                            <div className="w-12 h-4 bg-white/5 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <Activity size={32} className="text-red-500" />
                </div>
                <p className="text-white/50">{error || "Failed to load leaderboard"}</p>
                <button
                    onClick={fetchLeaderboard}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium"
                >
                    <RefreshCw size={16} /> Retry
                </button>
            </div>
        );
    }

    const { leaderboard, current_user_rank, current_user, total_users } = data;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Global Leaderboard</h1>
                    <p className="text-sm text-white/50">{total_users} players ranked by ELO rating</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchLeaderboard}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw size={16} className="text-white/50" />
                    </button>
                    <Trophy size={32} className="text-[#ffd60a]" />
                </div>
            </div>

            {/* Current User Stats */}
            {current_user && (
                <div className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-2xl p-4 border border-orange-500/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                                <User size={20} className="text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">{current_user.username}</p>
                                <p className="text-xs text-white/50">
                                    Your Rank: <span className="text-orange-400 font-bold">#{current_user_rank}</span> of {total_users}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-xs text-white/50">Rating</p>
                                <p className="text-lg font-bold text-lime-400 tabular-nums">
                                    <CountUp to={Math.round(current_user.elo_rating)} />
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-white/50">Accuracy</p>
                                <p className="text-lg font-bold text-cyan-400">{current_user.accuracy}%</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-white/50">Problems</p>
                                <p className="text-lg font-bold text-white tabular-nums">
                                    <CountUp to={current_user.total_attempts} />
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Table */}
            <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[#222]">
                            <th className="text-left p-4 text-xs font-medium text-white/50">RANK</th>
                            <th className="text-left p-4 text-xs font-medium text-white/50">USER</th>
                            <th className="text-right p-4 text-xs font-medium text-white/50">RATING</th>
                            <th className="text-right p-4 text-xs font-medium text-white/50">ACCURACY</th>
                            <th className="text-right p-4 text-xs font-medium text-white/50">PROBLEMS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((entry) => (
                            <tr
                                key={entry.rank}
                                className={`border-b border-[#222] hover:bg-white/5 transition-colors ${entry.is_current_user ? 'bg-orange-500/10' : ''
                                    }`}
                            >
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        {entry.rank === 1 && <Trophy size={16} className="text-[#ffd60a]" />}
                                        {entry.rank === 2 && <Medal size={16} className="text-[#c0c0c0]" />}
                                        {entry.rank === 3 && <Medal size={16} className="text-[#cd7f32]" />}
                                        <span className={`font-mono text-sm ${entry.is_current_user ? 'text-orange-400 font-bold' : 'text-white/70'
                                            }`}>
                                            #{entry.rank}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm ${entry.is_current_user ? 'text-white font-medium' : 'text-white/80'
                                            }`}>
                                            {entry.username}
                                        </span>
                                        {entry.is_current_user && (
                                            <span className="px-2 py-0.5 rounded-full bg-orange-500 text-xs text-white font-medium">You</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <TrendingUp size={12} className="text-lime-400" />
                                        <span className="text-sm font-bold text-lime-400 tabular-nums">
                                            <CountUp to={Math.round(entry.elo_rating)} duration={1} />
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <span className={`text-sm font-medium ${entry.accuracy >= 70 ? 'text-lime-400' :
                                        entry.accuracy >= 50 ? 'text-amber-400' : 'text-white/50'
                                        }`}>
                                        {entry.accuracy}%
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <span className="text-sm text-white/50">{entry.total_attempts}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {leaderboard.length === 0 && (
                <div className="text-center py-12">
                    <Target size={48} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/50">No players on the leaderboard yet.</p>
                    <p className="text-xs text-white/30 mt-1">Complete Rating Mode questions to appear here!</p>
                </div>
            )}

            {/* Info Note */}
            <p className="text-xs text-center text-white/40">
                Rankings based on ELO rating. All modes contribute to leaderboard ranking.
            </p>
        </div>
    );
}

