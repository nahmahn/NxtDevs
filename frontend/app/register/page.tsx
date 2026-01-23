"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function RegisterPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords don't match");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Registration failed");
            }

            // Auto-login after registration
            localStorage.setItem("auth_token", data.access_token);
            localStorage.setItem("user_id", data.user_id);
            localStorage.setItem("username", data.username);

            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/google/login`);
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error("Failed to init Google login", err);
        }
    };

    return (
        <section className="relative min-h-screen w-full flex items-center justify-center lg:justify-end bg-[#030014] overflow-hidden">

            {/* Landing Page Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-purple-600/30 rounded-full blur-[150px] animate-[aurora_20s_infinite]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[150px] animate-[aurora_20s_infinite_reverse]" />
            </div>

            {/* Decorative Landing Page Elements (Text/Visuals on Left) */}
            <div className="hidden lg:flex flex-col flex-1 pl-20 pr-10 z-10 pointer-events-none">
                <h1 className="text-7xl font-bold tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                    Join the <br />
                    Algorithmic <br />
                    <span className="text-[#84cc16]">Elite.</span>
                </h1>
                <p className="text-xl text-white/50 max-w-lg">
                    Create an account to track your progress, compete in rating mode, and unlock detailed analytics.
                </p>
            </div>


            {/* Register Form (Right Side) */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 w-full max-w-md lg:mr-20 p-8 m-4 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl"
            >
                <div className="mb-6">
                    <Image
                        src="/NxtDevs_icon.svg"
                        alt="NxtDevs"
                        width={40}
                        height={40}
                    />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
                <p className="text-white/60 mb-6">Start your journey today</p>

                <button
                    onClick={handleGoogleLogin}
                    className="flex items-center justify-center w-full gap-3 bg-white text-black font-bold h-12 rounded-xl hover:bg-white/90 transition-colors mb-6"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign up with Google
                </button>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-transparent text-white/40">Or register with email</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}

                    <div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#84cc16]/50 transition-colors placeholder-white/30"
                            placeholder="Username"
                            required
                        />
                    </div>

                    <div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#84cc16]/50 transition-colors placeholder-white/30"
                            placeholder="Email"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#84cc16]/50 transition-colors placeholder-white/30"
                            placeholder="Password"
                            required
                        />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#84cc16]/50 transition-colors placeholder-white/30"
                            placeholder="Confirm"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-[#84cc16] text-black font-bold rounded-xl hover:bg-[#a3e635] transition-colors disabled:opacity-50 mt-2"
                    >
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>

                    <div className="text-center mt-4">
                        <p className="text-white/50 text-sm">
                            Already have an account?{" "}
                            <Link href="/login" className="text-[#84cc16] hover:underline font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </form>
            </motion.div>
        </section>
    );
}
