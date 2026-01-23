"use client";

import { useEffect, useState } from "react";
import { User, Bell, Moon, Sun, Volume2, VolumeX, Shield, Trash2, Save, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

interface UserSettings {
    username: string;
    email: string;
    notifications: boolean;
    soundEffects: boolean;
    darkMode: boolean;
    showEloPublicly: boolean;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<UserSettings>({
        username: "",
        email: "",
        notifications: true,
        soundEffects: true,
        darkMode: true,
        showEloPublicly: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Fetch current user profile
        const userId = localStorage.getItem('user_id');
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/profile`, {
            headers: userId ? { 'X-User-Id': userId } : {}
        })
            .then((res) => res.json())
            .then((data) => {
                setSettings(prev => ({
                    ...prev,
                    username: data.username || "",
                    email: data.email || "",
                }));
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });

        // Load settings from localStorage
        const savedSettings = localStorage.getItem("brainwave_settings");
        if (savedSettings) {
            setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
        }
    }, []);

    const handleToggle = (key: keyof UserSettings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);

        try {
            // Save profile to backend
            const userId = localStorage.getItem('user_id');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(userId ? { 'X-User-Id': userId } : {})
                },
                body: JSON.stringify({
                    username: settings.username,
                    email: settings.email,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Failed to save profile");
            }

            const result = await response.json();

            // Update username in localStorage so it persists
            if (result.username) {
                localStorage.setItem("username", result.username);
            }

            // Update local state with the saved values from backend
            setSettings(prev => ({
                ...prev,
                username: result.username || prev.username,
                email: result.email || prev.email,
            }));

            // Save preferences to localStorage
            localStorage.setItem("brainwave_settings", JSON.stringify({
                notifications: settings.notifications,
                soundEffects: settings.soundEffects,
                darkMode: settings.darkMode,
                showEloPublicly: settings.showEloPublicly,
            }));

            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error: any) {
            console.error("Error saving settings:", error);
            setSaving(false);
            alert(error.message || "Failed to save settings. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-[#84cc16] animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/profile" className="p-2 rounded-full bg-[#151515] border border-white/10 hover:border-white/20 transition-colors">
                    <ArrowLeft size={20} className="text-white/60" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-white">Settings</h1>
                    <p className="text-sm text-white/40">Manage your account preferences</p>
                </div>
            </div>

            {/* Profile Section */}
            <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <User size={16} className="text-[#84cc16]" />
                        Profile
                    </h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block">Username</label>
                        <input
                            type="text"
                            value={settings.username}
                            onChange={(e) => setSettings(prev => ({ ...prev, username: e.target.value }))}
                            className="w-full bg-[#0c0c0c] border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#84cc16]/50"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block">Email</label>
                        <input
                            type="email"
                            value={settings.email}
                            onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Add your email"
                            className="w-full bg-[#0c0c0c] border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#84cc16]/50 placeholder:text-white/20"
                        />
                    </div>
                </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Bell size={16} className="text-cyan-400" />
                        Preferences
                    </h2>
                </div>
                <div className="divide-y divide-white/5">
                    {/* Notifications Toggle */}
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0c0c0c] flex items-center justify-center">
                                <Bell size={18} className="text-white/60" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Notifications</div>
                                <div className="text-xs text-white/40">Receive duel invites and updates</div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleToggle("notifications")}
                            className={`w-12 h-7 rounded-full transition-colors relative ${settings.notifications ? 'bg-[#84cc16]' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${settings.notifications ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Sound Effects Toggle */}
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0c0c0c] flex items-center justify-center">
                                {settings.soundEffects ? <Volume2 size={18} className="text-white/60" /> : <VolumeX size={18} className="text-white/60" />}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Sound Effects</div>
                                <div className="text-xs text-white/40">Play sounds for correct/incorrect answers</div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleToggle("soundEffects")}
                            className={`w-12 h-7 rounded-full transition-colors relative ${settings.soundEffects ? 'bg-[#84cc16]' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${settings.soundEffects ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Dark Mode Toggle */}
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0c0c0c] flex items-center justify-center">
                                {settings.darkMode ? <Moon size={18} className="text-white/60" /> : <Sun size={18} className="text-white/60" />}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Dark Mode</div>
                                <div className="text-xs text-white/40">Use dark theme (recommended)</div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleToggle("darkMode")}
                            className={`w-12 h-7 rounded-full transition-colors relative ${settings.darkMode ? 'bg-[#84cc16]' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${settings.darkMode ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Privacy Section */}
            <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Shield size={16} className="text-purple-400" />
                        Privacy
                    </h2>
                </div>
                <div className="divide-y divide-white/5">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0c0c0c] flex items-center justify-center">
                                <Shield size={18} className="text-white/60" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Show ELO Publicly</div>
                                <div className="text-xs text-white/40">Display your rating on leaderboard</div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleToggle("showEloPublicly")}
                            className={`w-12 h-7 rounded-full transition-colors relative ${settings.showEloPublicly ? 'bg-[#84cc16]' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${settings.showEloPublicly ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-[#151515] rounded-2xl border border-red-500/20 overflow-hidden">
                <div className="px-6 py-4 border-b border-red-500/20">
                    <h2 className="text-sm font-bold text-red-400 flex items-center gap-2">
                        <Trash2 size={16} />
                        Danger Zone
                    </h2>
                </div>
                <div className="p-6">
                    <button className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/10 transition-colors">
                        Reset Progress
                    </button>
                    <p className="text-xs text-white/30 mt-2">This will reset your ELO rating and all statistics. This action cannot be undone.</p>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${saved
                        ? 'bg-[#84cc16] text-black'
                        : 'bg-white text-black hover:bg-gray-200'
                        }`}
                >
                    {saving ? (
                        <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                    ) : saved ? (
                        <Check size={16} />
                    ) : (
                        <Save size={16} />
                    )}
                    {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
