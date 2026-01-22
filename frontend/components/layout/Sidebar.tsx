'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Grid3X3, Trophy, User, Settings, LogOut, MessageSquare, FileText } from 'lucide-react';
import { logout } from '@/lib/auth';

const navItems = [
    { icon: Home, label: "Arena", href: "/dashboard" },
    { icon: Grid3X3, label: "Practice", href: "/practice" },
    { icon: MessageSquare, label: "TutorAI", href: "/chat" },
    { icon: FileText, label: "Reports", href: "/reports" },
    { icon: Trophy, label: "Leaderboard", href: "/leaderboard" },
    { icon: User, label: "Profile", href: "/profile" },
    { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-[70px] h-screen fixed left-0 top-0 bg-[#09090b] border-r border-white/10 flex flex-col hidden md:flex z-50 py-6 items-center">
            {/* Logo area - NxtDevs Icon */}
            <div className="h-12 flex items-center justify-center mb-10 w-full">
                <Link href="/" className="flex items-center justify-center">
                    <Image
                        src="/NxtDevs_icon.svg"
                        alt="NxtDevs"
                        width={28}
                        height={28}
                    />
                </Link>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 space-y-4 w-full px-3">
                {/* Primary Action Button (Arena) */}
                <Link href="/dashboard" className="flex items-center justify-center w-12 h-12 rounded-2xl border border-[#84cc16] bg-[#84cc16]/10 text-[#84cc16] mb-8 group transition-all hover:bg-[#84cc16]/20 shadow-[0_0_15px_rgba(132,204,22,0.15)] mx-auto">
                    <Home size={22} className="fill-current" />
                </Link>

                {navItems.filter(i => i.label !== "Arena").map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`
                                flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 mx-auto
                                ${isActive
                                    ? "text-white bg-white/5"
                                    : "text-[#52525b] hover:text-[#e4e4e7] hover:bg-white/5"
                                }
                            `}
                            title={item.label}
                        >
                            <Icon size={22} />
                        </Link>
                    );
                })}
            </nav>

            {/* Logout Button */}
            <div className="mt-auto mb-6 px-3 w-full">
                <button
                    onClick={() => logout()}
                    className="flex items-center justify-center w-12 h-12 rounded-xl text-[#52525b] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 mx-auto"
                    title="Logout"
                >
                    <LogOut size={22} />
                </button>
            </div>
        </aside>
    );
}
