"use client";

import { useState, useEffect } from "react";
import { Link as LinkIcon, RefreshCw, CheckCircle2, AlertCircle, Code2, TrendingUp, Zap } from "lucide-react";
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
    last_synced?: string;
}

export default function LeetCodeWidget() {
    const [stats, setStats] = useState<LeetCodeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [linking, setLinking] = useState(false);
    const [usernameInput, setUsernameInput] = useState("");
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("auth_token");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leetcode/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleLink = async () => {
        if (!usernameInput) return;
        setLinking(true);
        setError(null);
        try {
            const token = localStorage.getItem("auth_token");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leetcode/link`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ username: usernameInput })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Failed to link account");
            }

            await fetchStats();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLinking(false);
        }
    };

    const handleSync = async () => {
        setLinking(true);
        try {
            const token = localStorage.getItem("auth_token");
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leetcode/sync`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchStats();
        } catch (err) {
            console.error(err);
        } finally {
            setLinking(false);
        }
    };

    if (loading) {
        return (
            <SpotlightCard className="!p-5 !bg-[#151515] !rounded-2xl !border-white/5 animate-pulse h-[200px]">
                <div />
            </SpotlightCard>
        );
    }

    // STATE: NOT LINKED
    if (!stats?.linked) {
        return (
            <div className="bg-[#151515] rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-10 bg-orange-500/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover:bg-orange-500/10 transition-colors duration-500" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-[#ffa116]/10 rounded-lg">
                            <Code2 size={16} className="text-[#ffa116]" />
                        </div>
                        <h3 className="text-[11px] font-bold text-white/50 tracking-wider">LEETCODE INTEGRATION</h3>
                    </div>

                    <p className="text-sm text-white/80 mb-4 leading-relaxed">
                        Link your LeetCode account to analyze your solving patterns and detect cognitive biases.
                    </p>

                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder="LeetCode Username"
                            value={usernameInput}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ffa116]/50 transition-colors placeholder:text-white/20"
                        />
                        <button
                            onClick={handleLink}
                            disabled={linking || !usernameInput}
                            className="w-full py-2 bg-[#ffa116] hover:bg-[#ffa116]/90 disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-bold uppercase tracking-wide rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            {linking ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : (
                                <LinkIcon size={14} />
                            )}
                            {linking ? "Verifying..." : "Connect Account"}
                        </button>
                    </div>

                    {error && (
                        <div className="mt-3 flex items-center gap-2 text-red-400 text-xs">
                            <AlertCircle size={12} />
                            <span className="truncate">{error}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // STATE: LINKED
    const topPattern = stats.thinking_patterns && Object.keys(stats.thinking_patterns).length > 0
        ? Object.entries(stats.thinking_patterns)[0]
        : null;

    return (
        <div className="bg-[#151515] rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 p-10 bg-[#ffa116]/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[#ffa116]/10 rounded-lg">
                            <Code2 size={16} className="text-[#ffa116]" />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-bold text-[#ffa116] tracking-wider">LEETCODE SYNCED</h3>
                            <p className="text-[9px] text-white/30 truncate max-w-[100px]">{stats.username}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={linking}
                        className="text-white/20 hover:text-white transition-colors"
                    >
                        <RefreshCw size={14} className={linking ? "animate-spin" : ""} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-black/20 rounded-xl p-2.5 border border-white/5">
                        <span className="text-[9px] text-white/40 font-bold uppercase block mb-0.5">Total Solved</span>
                        <span className="text-lg font-black text-white">{stats.total_solved}</span>
                    </div>
                    <div className="bg-black/20 rounded-xl p-2.5 border border-white/5">
                        <span className="text-[9px] text-white/40 font-bold uppercase block mb-0.5">Global Rank</span>
                        <span className="text-lg font-black text-white">#{stats.ranking?.toLocaleString()}</span>
                    </div>
                </div>

                <div className="mt-4">
                    <a href="/leetcode" className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 group/link transition-all">
                        <div className="flex items-center gap-2">
                            <Zap size={14} className="text-[#ffa116]" />
                            <span className="text-[10px] font-bold text-white/50 group-hover/link:text-white transition-colors">View AI Analysis</span>
                        </div>
                        <TrendingUp size={14} className="text-white/20 group-hover/link:text-[#ffa116] transition-colors" />
                    </a>
                </div>

                <div className="mt-4 flex gap-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${((stats.easy || 0) / (stats.total_solved || 1)) * 100}%` }}
                    />
                    <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${((stats.medium || 0) / (stats.total_solved || 1)) * 100}%` }}
                    />
                    <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${((stats.hard || 0) / (stats.total_solved || 1)) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1.5 px-0.5">
                    <span className="text-[9px] text-emerald-500 font-bold">{stats.easy} Easy</span>
                    <span className="text-[9px] text-amber-500 font-bold">{stats.medium} Med</span>
                    <span className="text-[9px] text-rose-500 font-bold">{stats.hard} Hard</span>
                </div>
            </div>
        </div>
    );
}
