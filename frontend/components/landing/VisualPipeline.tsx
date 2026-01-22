"use client";

import { motion } from "framer-motion";
import { ScanSearch, BrainCircuit, Code2, ArrowRight } from "lucide-react";

const steps = [
    {
        title: "Constraint Analysis",
        description: "Identify hidden bottlenecks before writing a single line of code.",
        icon: ScanSearch,
        color: "text-cyan-400",
        bg: "bg-cyan-400/10",
        border: "border-cyan-400/20"
    },
    {
        title: "Pattern Recognition",
        description: "Map requirements to algorithmic patterns (Sliding Window, DFS, DP).",
        icon: BrainCircuit,
        color: "text-purple-400",
        bg: "bg-purple-400/10",
        border: "border-purple-400/20"
    },
    {
        title: "Implementation",
        description: "Convert logic to clean, optimized code with confidence.",
        icon: Code2,
        color: "text-green-400",
        bg: "bg-green-400/10",
        border: "border-green-400/20"
    }
];

export function VisualPipeline() {
    return (
        <section className="py-32 px-6 relative overflow-hidden">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">How It Works</h2>
                    <p className="text-secondary text-lg max-w-2xl mx-auto">
                        A structured approach to deconstruct any coding problem.
                    </p>
                </motion.div>

                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-400/20 via-purple-400/20 to-green-400/20" />

                    {steps.map((step, index) => (
                        <motion.div
                            key={step.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2 }}
                            className="relative z-10 group"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className={`w-24 h-24 rounded-2xl ${step.bg} ${step.border} border flex items-center justify-center mb-8 relative group-hover:scale-110 transition-transform duration-300`}>
                                    <step.icon size={40} className={step.color} />

                                    {/* Pulse Effect */}
                                    <div className={`absolute inset-0 rounded-2xl ${step.bg} blur-xl opacity-0 group-hover:opacity-50 transition-opacity`} />
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                                <p className="text-secondary leading-relaxed max-w-xs">{step.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
