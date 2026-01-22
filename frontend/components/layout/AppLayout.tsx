"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Landing page and auth pages have no app shell
    const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/register";

    if (isPublicPage) {
        return (
            <div className="min-h-screen bg-[#1a1a1a] text-white">
                {children}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white font-sans">
            <TopNav />
            <Sidebar />
            <main className="pt-24 md:pl-[90px] min-h-screen transition-all duration-300">
                <div className="w-full px-8 py-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
