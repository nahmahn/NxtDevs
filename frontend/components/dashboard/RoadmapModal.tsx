"use client";

import { X, CheckCircle2, Lock, ArrowRight, Play, Map, Youtube, Lightbulb } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface Problem {
    title: string;
    slug: string;
    difficulty: string;
    reason?: string;
}

interface Phase {
    phase: string;
    focus: string;
    description?: string;
    video_query?: string;
    problems: Problem[];
}

interface RoadmapModalProps {
    isOpen: boolean;
    onClose: () => void;
    roadmap: Phase[];
}

export function RoadmapModal({ isOpen, onClose, roadmap }: RoadmapModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-[#151515] border border-white/10 w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1a1a1a]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-[#ffa116]/20 to-[#ffa116]/5 rounded-xl border border-[#ffa116]/20">
                            <Map size={24} className="text-[#ffa116]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight uppercase">Personalized Curriculum</h2>
                            <p className="text-sm text-white/50">AI-Architected path to technical mastery</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="overflow-y-auto p-8 custom-scrollbar bg-[#0a0a0a]">
                    {!roadmap || roadmap.length === 0 ? (
                        <div className="text-center py-32">
                            <p className="text-white/40 text-base">No roadmap found. Please sync your LeetCode data.</p>
                        </div>
                    ) : (
                        <div className="space-y-12 relative max-w-4xl mx-auto">
                            {/* Connector Line */}
                            <div className="absolute left-[27px] top-12 bottom-12 w-0.5 bg-white/10" />

                            {roadmap.map((phase, index) => (
                                <div key={index} className="relative pl-20 group">
                                    {/* Phase Node */}
                                    <div className={`
                                        absolute left-0 top-0 w-14 h-14 rounded-2xl border-4 flex items-center justify-center font-black text-xl z-10 bg-[#0a0a0a] transition-all duration-500
                                        ${index === 0
                                            ? 'border-[#ffa116] text-[#ffa116] shadow-[0_0_30px_rgba(255,161,22,0.3)] scale-110'
                                            : 'border-[#333] text-[#555]'}
                                    `}>
                                        {index + 1}
                                    </div>

                                    {/* Content Card */}
                                    <div className={`
                                        rounded-3xl border p-8 transition-all duration-500
                                        ${index === 0
                                            ? 'bg-gradient-to-r from-[#ffa116]/5 to-transparent border-[#ffa116]/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)]'
                                            : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100 grayscale hover:grayscale-0'}
                                    `}>
                                        {/* Phase Header */}
                                        <div className="flex items-start justify-between gap-6 mb-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md ${index === 0 ? 'bg-[#ffa116] text-black' : 'bg-white/10 text-white/50'}`}>
                                                        {phase.phase}
                                                    </span>
                                                    {index > 0 && <Lock size={14} className="text-white/30" />}
                                                </div>
                                                <h3 className="text-2xl font-bold text-white leading-tight">{phase.focus}</h3>
                                                {phase.description && (
                                                    <p className="text-white/60 text-sm leading-relaxed max-w-2xl">
                                                        {phase.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action Button Area */}
                                            <div className="flex flex-col items-end gap-3 shrink-0">
                                                {index === 0 ? (
                                                    <div className="flex flex-col gap-2 items-end">
                                                        <span className="text-[10px] font-bold text-[#ffa116] uppercase tracking-wider animate-pulse">
                                                            Active Phase
                                                        </span>
                                                        {phase.video_query && (
                                                            <Link
                                                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(phase.video_query)}`}
                                                                target="_blank"
                                                                className="flex items-center gap-2 px-4 py-2 bg-[#ff0000]/10 hover:bg-[#ff0000]/20 text-red-500 rounded-xl text-xs font-bold uppercase transition-all border border-red-500/20 hover:scale-105"
                                                            >
                                                                <Youtube size={16} />
                                                                Watch Tutorial
                                                            </Link>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="px-3 py-1.5 rounded-lg border border-white/10 text-white/20 text-xs font-bold uppercase">
                                                        Locked
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Problem Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {phase.problems.map((prob, i) => (
                                                <Link
                                                    key={i}
                                                    href={`https://leetcode.com/problems/${prob.slug}`}
                                                    target="_blank"
                                                    className={`
                                                        p-4 rounded-xl border flex flex-col gap-3 group/link relative overflow-hidden
                                                        ${index === 0
                                                            ? 'bg-black/40 border-white/10 hover:border-[#ffa116]/50 hover:bg-[#ffa116]/5'
                                                            : 'bg-black/20 border-white/5 pointer-events-none'}
                                                        transition-all
                                                    `}
                                                >
                                                    {index === 0 && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover/link:translate-x-[100%] transition-transform duration-1000" />}

                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className={`font-bold mb-1 ${index === 0 ? 'text-white group-hover/link:text-[#ffa116]' : 'text-white/40'}`}>
                                                                {prob.title}
                                                            </div>
                                                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${prob.difficulty === 'Easy' ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/10' :
                                                                    prob.difficulty === 'Medium' ? 'border-amber-500/20 text-amber-500 bg-amber-500/10' :
                                                                        'border-rose-500/20 text-rose-500 bg-rose-500/10'
                                                                }`}>
                                                                {prob.difficulty}
                                                            </span>
                                                        </div>
                                                        <Play size={16} className={`
                                                            ${index === 0 ? 'text-[#ffa116] opacity-0 group-hover/link:opacity-100 -translate-x-2 group-hover/link:translate-x-0' : 'hidden'} 
                                                            transition-all duration-300
                                                        `} />
                                                    </div>

                                                    {/* Reason (Detail) */}
                                                    {prob.reason && (
                                                        <div className="flex items-start gap-2 pt-2 border-t border-white/5 mt-auto">
                                                            <Lightbulb size={12} className={index === 0 ? "text-yellow-500/70 mt-0.5" : "text-white/10"} />
                                                            <p className={`text-[11px] leading-snug ${index === 0 ? "text-white/60" : "text-white/20"}`}>
                                                                {prob.reason}
                                                            </p>
                                                        </div>
                                                    )}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
