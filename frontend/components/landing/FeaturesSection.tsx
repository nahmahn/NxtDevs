"use client";

import React from "react";
import { cn } from "@/lib/utils";
import createGlobe from "cobe";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Brain, Trophy, Zap, Code2, LineChart, MessageSquare } from "lucide-react";


export default function FeaturesSection() {
    const features = [
        {
            title: "Mental Models, Not Just Syntax",
            description:
                "We track 20+ cognitive axes—from Premature Optimization to Greedy Bias—to build your personalized thinking profile.",
            skeleton: <SkeletonOne />,
            className:
                "col-span-1 lg:col-span-4 border-b lg:border-r border-white/10",
        },
        {
            title: "Ranked 1v1 Duels",
            description:
                "Test your intuition against real opponents. Fair ELO matchmaking ensures you're always pushed, never overwhelmed.",
            skeleton: <SkeletonTwo />,
            className: "border-b col-span-1 lg:col-span-2 border-white/10",
        },
        {
            title: "AI-Powered Coaching",
            description:
                "Get instant, personalized feedback on *why* your approach failed. It's like having a senior engineer review every submission.",
            skeleton: <SkeletonThree />,
            className:
                "col-span-1 lg:col-span-3 lg:border-r border-white/10",
        },
        {
            title: "Global Mastery",
            description:
                "Compete on the global leaderboard. Watch your rating climb as you master increasingly complex constraints.",
            skeleton: <SkeletonFour />,
            className: "col-span-1 lg:col-span-3 border-b lg:border-none border-white/10",
        },
    ];
    return (
        <div className="relative z-20 py-20 lg:py-40 max-w-7xl mx-auto">
            <div className="px-8 text-center">
                <h4 className="text-3xl lg:text-5xl lg:leading-tight max-w-5xl mx-auto tracking-tight font-bold text-white mb-6">
                    The Complete <span className="text-[#84cc16]">Growth Engine</span>
                </h4>

                <p className="text-lg max-w-2xl mx-auto text-white/50">
                    NxtDevs isn't just a question bank. It's a closed-loop system designed to identify, target, and eliminate your algorithmic weaknesses.
                </p>
            </div>

            <div className="relative">
                <div className="grid grid-cols-1 lg:grid-cols-6 mt-16 xl:border rounded-3xl border-white/10 bg-black/20 overflow-hidden">
                    {features.map((feature) => (
                        <FeatureCard key={feature.title} className={feature.className}>
                            <FeatureTitle>{feature.title}</FeatureTitle>
                            <FeatureDescription>{feature.description}</FeatureDescription>
                            <div className="h-full w-full">{feature.skeleton}</div>
                        </FeatureCard>
                    ))}
                </div>
            </div>
        </div>
    );
}

const FeatureCard = ({
    children,
    className,
}: {
    children?: React.ReactNode;
    className?: string;
}) => {
    return (
        <div className={cn(`p-8 relative overflow-hidden`, className)}>
            {children}
        </div>
    );
};

const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
    return (
        <p className="max-w-5xl mx-auto text-left tracking-tight text-white text-2xl font-bold mb-3">
            {children}
        </p>
    );
};

const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
    return (
        <p className={cn(
            "text-base text-left max-w-4xl text-white/50",
            "text-left max-w-lg mx-0 mb-8"
        )}>
            {children}
        </p>
    );
};

// Skeleton 1: Thinking Profile (Radar Like)
export const SkeletonOne = () => {
    return (
        <div className="relative flex py-4 px-2 gap-10 h-full">
            <div className="w-full p-6 mx-auto bg-black/40 border border-white/10 rounded-xl shadow-2xl group h-full relative overflow-hidden">
                <div className="absolute top-4 right-4 flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>

                <div className="mt-4 space-y-4">
                    {/* Fake Progress Bars */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-white/60">
                            <span>Greedy Bias</span>
                            <span>84%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: "84%" }}
                                transition={{ duration: 1.5, delay: 0.2 }}
                                className="h-full bg-purple-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-white/60">
                            <span>Constraint Checking</span>
                            <span>42%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: "42%" }}
                                transition={{ duration: 1.5, delay: 0.4 }}
                                className="h-full bg-yellow-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-white/60">
                            <span>Edge Case Detection</span>
                            <span>91%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: "91%" }}
                                transition={{ duration: 1.5, delay: 0.6 }}
                                className="h-full bg-green-500"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Skeleton 2: Ranked Duels (Badge/Versus)
export const SkeletonTwo = () => {
    return (
        <div className="relative flex flex-col items-center justify-center p-8 h-full w-full">
            <div className="flex items-center gap-4 relative z-10">
                {/* Player 1 */}
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-[2px]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white font-bold text-xl">
                            You
                        </div>
                    </div>
                    <span className="text-cyan-400 font-mono text-sm mt-2">1423</span>
                </div>

                <div className="text-2xl font-black text-white/20 italic">VS</div>

                {/* Player 2 */}
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border border-white/20 p-[2px] opacity-60">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white/50 font-bold text-xl">
                            Opp
                        </div>
                    </div>
                    <span className="text-white/40 font-mono text-sm mt-2">1450</span>
                </div>
            </div>

            {/* Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl" />
        </div>
    );
};

// Skeleton 3: AI Coach (Chat)
export const SkeletonThree = () => {
    return (
        <div className="relative flex gap-4 h-full group p-4">
            <div className="flex flex-col gap-3 w-full max-w-[80%]">
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 text-sm text-white/80">
                    <span className="text-purple-400 font-bold block mb-1">AI Coach</span>
                    Your logic for <code className="bg-white/10 px-1 rounded text-xs">two_sum</code> accounts for O(n²), but the constraint N=10⁵ requires O(n).
                </div>

                <div className="bg-[#84cc16]/10 border border-[#84cc16]/20 rounded-2xl rounded-tl-sm p-4 text-sm text-white/90 self-start">
                    Try using a hash map to store complements.
                </div>
            </div>
        </div>
    );
};


// Skeleton 4: Globe (Leaderboard)
export const SkeletonFour = () => {
    return (
        <div className="h-60 md:h-60 flex flex-col items-center relative bg-transparent mt-10">
            <Globe className="absolute -right-0 md:-right-0 -bottom-80 md:-bottom-72" />
        </div>
    );
};

export const Globe = ({ className }: { className?: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let phi = 0;

        if (!canvasRef.current) return;

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: 600 * 2,
            height: 600 * 2,
            phi: 0,
            theta: 0,
            dark: 1,
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: 6,
            baseColor: [0.3, 0.3, 0.3],
            markerColor: [0.5, 0.8, 0.2], // brainwave green
            glowColor: [0.1, 0.1, 0.1],
            markers: [
                { location: [37.7595, -122.4367], size: 0.03 },
                { location: [40.7128, -74.006], size: 0.1 },
                { location: [28.6139, 77.2090], size: 0.05 }, // Delhi
                { location: [51.5074, -0.1278], size: 0.05 }, // London
            ],
            onRender: (state) => {
                state.phi = phi;
                phi += 0.005;
            },
        });

        return () => {
            globe.destroy();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: 600, height: 600, maxWidth: "100%", aspectRatio: 1 }}
            className={className}
        />
    );
};
