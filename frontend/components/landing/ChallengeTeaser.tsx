"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ArrowRight, Code } from "lucide-react";

export function ChallengeTeaser() {
    const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");

    const handleAnswer = (isCorrect: boolean) => {
        setStatus(isCorrect ? "correct" : "incorrect");
    };

    return (
        <section className="py-24 px-6 bg-black/50 border-y border-white/5 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">

                {/* Text Content */}
                <div className="flex-1 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-400 text-sm font-bold mb-6 border border-purple-500/20">
                        <Code size={16} />
                        <span>Live Challenge</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
                        Don't just code.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Think.</span>
                    </h2>
                    <p className="text-secondary text-lg mb-8 max-w-xl mx-auto lg:mx-0">
                        Most platforms check if your code runs. We check if you understand <i>why</i> it runs efficiently.
                    </p>

                    {status === "idle" && (
                        <div className="text-sm text-white/40">Try the challenge →</div>
                    )}
                </div>

                {/* Interactive Card */}
                <div className="flex-1 w-full max-w-md">
                    <motion.div
                        className="glass-card p-6 md:p-8 rounded-2xl border border-white/10 relative overflow-hidden"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        {/* Card Header */}
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-mono text-white/40">snippet.py</span>
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                            </div>
                        </div>

                        {/* Code Snippet */}
                        <div className="font-mono text-sm bg-black/40 p-4 rounded-xl mb-6 border border-white/5 text-gray-300">
                            <p><span className="text-purple-400">def</span> <span className="text-blue-400">two_sum</span>(nums, target):</p>
                            <p className="pl-4">seen = { }</p>
                            <p className="pl-4"><span className="text-purple-400">for</span> i, num <span className="text-purple-400">in</span> enumerate(nums):</p>
                            <p className="pl-8">diff = target - num</p>
                            <p className="pl-8"><span className="text-purple-400">if</span> diff <span className="text-purple-400">in</span> seen:</p>
                            <p className="pl-12"><span className="text-purple-400">return</span> [seen[diff], i]</p>
                            <p className="pl-8">seen[num] = i</p>
                        </div>

                        {/* Question */}
                        <div className="mb-6">
                            <p className="text-white font-medium mb-4">What is the time complexity?</p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleAnswer(false)}
                                    disabled={status !== "idle"}
                                    className={`w-full p-4 rounded-xl text-left transition-all border ${status === "incorrect"
                                            ? "bg-red-500/10 border-red-500 text-red-400"
                                            : "bg-white/5 border-white/10 hover:bg-white/10 text-secondary hover:text-white"
                                        } ${status !== "idle" && "opacity-50 cursor-not-allowed"}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono">O(n²)</span>
                                        {status === "incorrect" && <X size={18} />}
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleAnswer(true)}
                                    disabled={status !== "idle"}
                                    className={`w-full p-4 rounded-xl text-left transition-all border ${status === "correct"
                                            ? "bg-green-500/10 border-green-500 text-green-400"
                                            : "bg-white/5 border-white/10 hover:bg-white/10 text-secondary hover:text-white"
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono">O(n)</span>
                                        {status === "correct" && <Check size={18} />}
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Explanation Reveal */}
                        <AnimatePresence>
                            {status === "correct" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    className="bg-green-500/10 rounded-xl p-4 border border-green-500/20"
                                >
                                    <p className="text-green-400 text-sm font-semibold mb-1">Correct!</p>
                                    <p className="text-white/70 text-sm">
                                        Using a hash map (dictionary) allows for O(1) lookups, reducing the nested loop to a single pass.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
