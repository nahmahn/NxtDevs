import { useState } from "react";
import { Activity, TrendingUp, AlertTriangle, CheckCircle2, Target, ArrowRight, Zap, Code2, Brain, ExternalLink, Play, Map } from "lucide-react";
import Link from "next/link";
import { RoadmapModal } from "./RoadmapModal";

interface LeetCodeStats {
    total_solved?: number;
    easy?: number;
    medium?: number;
    hard?: number;
    tag_stats?: Record<string, number>;
    thinking_patterns?: any; // Now allows the rich JSON object
}

const DEFAULT_PROBLEMS = [
    { title: "Merge Intervals", slug: "merge-intervals", difficulty: "Medium" },
    { title: "Insert Interval", slug: "insert-interval", difficulty: "Medium" },
    { title: "Non-overlapping Intervals", slug: "non-overlapping-intervals", difficulty: "Medium" }
];

export function LeetCodeAnalysis({ stats }: { stats: LeetCodeStats }) {
    const [showRoadmap, setShowRoadmap] = useState(false);

    if (!stats || !stats.total_solved) return null;

    // Derived Logic
    const sortedTags = stats.tag_stats
        ? Object.entries(stats.tag_stats).sort(([, a], [, b]) => b - a)
        : [];

    const strongestTopic = sortedTags.length > 0 ? sortedTags[0][0] : "None";
    const weakestTopic = sortedTags.length > 3 ? sortedTags[sortedTags.length - 1][0] : "Dynamic Programming";

    // Check if we have the new AI Report
    const aiReport = stats.thinking_patterns?.overall_assessment
        ? stats.thinking_patterns
        : null;

    // If AI report exists, use its assessment. If not, fallback to heuristic text.
    const mainText = aiReport
        ? aiReport.overall_assessment
        : `Your strongest domain is ${strongestTopic}. To reach the next tier, focus on ${weakestTopic}.`;

    const focusArea = weakestTopic;
    const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-');

    // Use AI recommended problems if available, otherwise use defaults
    const problemSet = aiReport?.recommended_problems && aiReport.recommended_problems.length > 0
        ? aiReport.recommended_problems
        : DEFAULT_PROBLEMS;

    return (
        <div className="space-y-6">
            <div className="bg-[#151515] rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-32 bg-gradient-to-bl from-[#ffa116]/5 to-transparent rounded-full blur-[60px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <Brain size={20} className="text-[#ffa116]" />
                            <h2 className="text-base font-bold text-white tracking-tight">
                                {aiReport ? "AI Personalized Coach" : "AI Analytical Report"}
                            </h2>
                        </div>
                        {aiReport && (
                            <div className="flex items-center gap-2">

                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Main Assessment - Compact */}
                        <div className="lg:col-span-7 flex flex-col justify-between">
                            <div className="bg-black/20 p-6 rounded-2xl border border-white/5 h-full flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Assessment</h3>
                                    <p className="text-white/90 leading-relaxed text-base font-medium">
                                        {mainText}
                                    </p>
                                </div>

                                {aiReport?.roadmap && (
                                    <div className="mt-8 pt-6 border-t border-white/5">
                                        <button
                                            onClick={() => setShowRoadmap(true)}
                                            className="group w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#ffa116]/10 to-transparent border border-[#ffa116]/20 rounded-xl hover:border-[#ffa116]/40 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-[#ffa116]/20 rounded-lg text-[#ffa116]">
                                                    <Map size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-sm font-black text-white group-hover:text-[#ffa116] transition-colors">LAUNCH CURRICULUM</div>
                                                    <div className="text-[10px] text-white/50">3-Phase Personalized Roadmap</div>
                                                </div>
                                            </div>
                                            <ArrowRight size={18} className="text-[#ffa116] transform group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actionable Insights - Denser */}
                        <div className="lg:col-span-5 space-y-4">
                            {aiReport ? (
                                <>
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-xl">
                                        <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <CheckCircle2 size={14} /> Strengths
                                        </h4>
                                        <ul className="text-sm text-emerald-100/80 list-none space-y-2 pl-1">
                                            {aiReport.strengths?.slice(0, 3).map((s: string, i: number) => <li key={i}>• {s}</li>)}
                                        </ul>
                                    </div>
                                    <div className="bg-red-500/5 border border-red-500/10 p-5 rounded-xl">
                                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Target size={14} /> Focus Areas
                                        </h4>
                                        <ul className="text-sm text-red-100/80 list-none space-y-2 pl-1">
                                            {aiReport.recommendations?.slice(0, 3).map((s: string, i: number) => <li key={i}>• {s}</li>)}
                                        </ul>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <div className="bg-white/5 border border-white/10 p-5 rounded-xl flex items-center gap-4">
                                        <Target size={24} className="text-[#ffa116]" />
                                        <div>
                                            <div className="text-base font-bold text-white">Focus: {focusArea}</div>
                                            <div className="text-sm text-white/40">Recommended Drill Topic</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Problem Recommendation - Horizontal Slice */}
                            <div className="pt-2">
                                <Link
                                    href={`https://leetcode.com/problemset/all/?topicSlugs=${slugify(focusArea)}`}
                                    target="_blank"
                                    className="block w-full text-center py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-colors uppercase tracking-widest"
                                >
                                    Start {focusArea} Drill →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <RoadmapModal
                isOpen={showRoadmap}
                onClose={() => setShowRoadmap(false)}
                roadmap={aiReport?.roadmap || []}
            />
        </div>
    );
}
