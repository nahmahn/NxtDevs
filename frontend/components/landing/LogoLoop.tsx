"use client";

import { motion } from "framer-motion";
import { SiPython, SiReact, SiNextdotjs, SiTypescript, SiTailwindcss, SiPostgresql, SiOpenai, SiFastapi } from "react-icons/si";
import { Database } from "lucide-react";

const logos = [
    { icon: SiNextdotjs, name: "Next.js" },
    { icon: SiTypescript, name: "TypeScript" },
    { icon: SiTailwindcss, name: "Tailwind" },
    { icon: SiPython, name: "Python" },
    { icon: SiFastapi, name: "FastAPI" },
    { icon: SiPostgresql, name: "PostgreSQL" },
    { icon: SiOpenai, name: "OpenAI" },
    { icon: SiReact, name: "React" },
];

export function LogoLoop() {
    return (
        <section className="py-12 overflow-hidden relative z-10">
            {/* Gradient Masks */}
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#030014] to-transparent z-20" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#030014] to-transparent z-20" />

            <div className="flex w-full">
                <motion.div
                    className="flex items-center gap-20 px-8 whitespace-nowrap"
                    animate={{ x: "-50%" }}
                    transition={{
                        repeat: Infinity,
                        ease: "linear",
                        duration: 40
                    }}
                >
                    {[...logos, ...logos, ...logos, ...logos].map((logo, index) => (
                        <div key={index} className="flex items-center gap-3 text-white/40 hover:text-white/80 transition-colors group cursor-default">
                            <logo.icon size={28} />
                            <span className="font-semibold text-lg">{logo.name}</span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
