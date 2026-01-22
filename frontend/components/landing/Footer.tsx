import Link from "next/link";
import Image from "next/image";
import { Github, Twitter } from "lucide-react";

export function Footer() {
    return (
        <footer className="py-12 px-6 border-t border-white/5 bg-black/20">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-3">
                    <Image
                        src="/NxtDevs_logo.png"
                        alt="NxtDevs"
                        width={40}
                        height={40}
                        className="rounded-lg"
                    />
                    <div>
                        <h3 className="text-xl font-bold text-white">NxtDevs</h3>
                        <p className="text-secondary text-sm">Master Algorithmic Reasoning.</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <Link href="#" className="text-secondary hover:text-white transition-colors">
                        <Github size={20} />
                    </Link>
                    <Link href="#" className="text-secondary hover:text-white transition-colors">
                        <Twitter size={20} />
                    </Link>
                </div>

                <div className="flex gap-8 text-sm text-secondary">
                    <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
                    <Link href="#" className="hover:text-white transition-colors">Terms</Link>
                </div>
            </div>
        </footer>
    );
}
