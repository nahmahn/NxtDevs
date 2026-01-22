"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, Code2, Terminal } from "lucide-react";
import GradientText from "@/components/ui/GradientText";

export function Hero() {
    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-[aurora_15s_infinite]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-[aurora_15s_infinite_reverse]" />
            </div>

            {/* Floating Code Snippets (Decorative) */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 1.5 }}
                className="absolute left-[10%] top-[30%] hidden lg:block p-4 glass rounded-xl border-l-4 border-purple-500"
            >
                <Code2 className="text-purple-400 mb-2" size={24} />
                <div className="space-y-2">
                    <div className="w-32 h-2 bg-white/10 rounded" />
                    <div className="w-24 h-2 bg-white/10 rounded" />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2, duration: 1.5 }}
                className="absolute right-[10%] bottom-[40%] hidden lg:block p-4 glass rounded-xl border-l-4 border-cyan-500"
            >
                <Terminal className="text-cyan-400 mb-2" size={24} />
                <div className="space-y-2">
                    <div className="w-28 h-2 bg-white/10 rounded" />
                    <div className="w-36 h-2 bg-white/10 rounded" />
                </div>
            </motion.div>

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 max-w-4xl mx-auto"
            >
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-purple    -500/30 text-sm text-purple-300 mb-8"
                >
                    <Sparkles size={14} className="animate-pulse" />
                    <span>Thinking-First Coding Platform</span>
                </motion.div>

                {/* Headline */}
                <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-tight">
                    <span className="text-white">Master Algorithmic</span>
                    <br />
                    <div className="flex justify-center">
                        <GradientText
                            colors={["#c084fc", "#db2777", "#c084fc", "#db2777", "#c084fc"]}
                            animationSpeed={6}
                            showBorder={false}
                            className="text-6xl md:text-8xl font-bold tracking-tight"
                        >
                            Reasoning
                        </GradientText>
                    </div>
                </h1>

                <p className="text-lg md:text-xl text-secondary max-w-2xl mx-auto mb-12">
                    Train your intuition for constraint analysis, approach selection, and assumption spotting.
                    <br className="hidden md:block" />
                    MCQ-based reasoning that separates adaptive learning from fair evaluation.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <Link
                        href="/dashboard"
                        className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg overflow-hidden transition-transform hover:scale-105"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative flex items-center gap-2">
                            Start Practice Mode
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                    </Link>

                    <Link
                        href="/practice"
                        className="px-8 py-4 rounded-full glass hover:bg-white/5 text-white font-medium text-lg transition-all hover:scale-105"
                    >
                        View Question Types
                    </Link>
                </div>
            </motion.div>
        </section>
    );
}
