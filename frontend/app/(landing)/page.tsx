"use client";

import { Hero } from "@/components/landing/Hero";
import FeaturesSection from "@/components/landing/FeaturesSection";
import { Footer } from "@/components/landing/Footer";
import { VisualPipeline } from "@/components/landing/VisualPipeline";
import { ChallengeTeaser } from "@/components/landing/ChallengeTeaser";
import { LogoLoop } from "@/components/landing/LogoLoop";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import LightRays from "@/components/ui/LightRays";

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-[#030014] overflow-x-hidden text-white selection:bg-purple-500/30 relative">
            <LightRays
                raysOrigin="top-center"
                raysColor="#4079ff"
                raysSpeed={0.5}
                className="!absolute inset-0 z-0 opacity-40 pointer-events-none"
            />
            {/* Top Left Logo */}
            <Link href="/" className="absolute top-6 left-6 z-50 flex items-center gap-3 group">
                <Image
                    src="/NxtDevs_logo.png"
                    alt="NxtDevs"
                    width={48}
                    height={48}
                    className="rounded-lg"
                />
                <span className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                    NxtDevs
                </span>
            </Link>

            {/* Top Right Auth Buttons */}
            <div className="absolute top-6 right-6 z-50 flex items-center gap-6">
                <Link
                    href="/login"
                    className="text-sm font-bold text-white/70 hover:text-white transition-colors"
                >
                    Login
                </Link>
                <Link
                    href="/register"
                    className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                    Create Account
                    <ArrowRight size={14} />
                </Link>
            </div>

            {/* Content Wrapper */}
            <div className="relative z-10">
                <Hero />
                <LogoLoop />
                <ChallengeTeaser />
                <VisualPipeline />
                <FeaturesSection />
                <Footer />
            </div>
        </main>
    );
}
