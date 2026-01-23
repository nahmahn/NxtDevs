"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { QuestionCard } from "@/components/question/QuestionCard";
import Link from "next/link";
import { ArrowLeft, Award, AlertCircle, Clock, Target, Trophy, AlertTriangle, RefreshCw } from "lucide-react";

interface Question {
    id: string;
    content: string;
    options: { id: string; content: string }[];
    difficulty_tier: number;
    active_constraints: Record<string, string>;
}

interface RatingSessionStats {
    questionsAnswered: number;
    correctAnswers: number;
    ratingChange: number;
    currentRating: number;
}

export default function RatingMode() {
    const [question, setQuestion] = useState<Question | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submissionResult, setSubmissionResult] = useState<any>(null);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [sessionStats, setSessionStats] = useState<RatingSessionStats>({
        questionsAnswered: 0,
        correctAnswers: 0,
        ratingChange: 0,
        currentRating: 1200
    });

    // Time tracking
    const startTimeRef = useRef<number>(Date.now());

    const fetchQuestion = useCallback(async () => {
        setLoading(true);
        setSubmissionResult(null);
        setError(null);

        try {
            const userId = localStorage.getItem('user_id');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/questions/next?mode=rating`, {
                headers: userId ? { 'X-User-Id': userId } : {}
            });

            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }

            const data = await res.json();

            if (!data || !data.id) {
                throw new Error("Invalid question data received");
            }

            setQuestion(data);
            startTimeRef.current = Date.now();
        } catch (e) {
            console.error("Failed to fetch question:", e);
            setError(e instanceof Error ? e.message : "Failed to fetch question");
            setQuestion(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSubmit = async (optionId: string) => {
        if (!question) return;

        const timeTaken = Date.now() - startTimeRef.current;

        try {
            const userId = localStorage.getItem('user_id');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/questions/${question.id}/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(userId ? { 'X-User-Id': userId } : {})
                },
                body: JSON.stringify({
                    selected_option_id: optionId,
                    mode: "rating",
                    time_taken_ms: timeTaken
                })
            });

            if (!res.ok) {
                throw new Error(`Submission failed: ${res.status}`);
            }

            const result = await res.json();
            setSubmissionResult(result);

            // Update session stats
            const isCorrect = result.is_correct ?? result.isCorrect;
            const ratingUpdate = result.rating_update;

            setSessionStats(prev => ({
                questionsAnswered: prev.questionsAnswered + 1,
                correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
                ratingChange: prev.ratingChange + (ratingUpdate?.delta || 0),
                currentRating: ratingUpdate?.new_rating || prev.currentRating
            }));
        } catch (e) {
            console.error("Submit error:", e);
            setError(e instanceof Error ? e.message : "Submission failed");
        }
    };

    const startSession = () => {
        setSessionStarted(true);
        fetchQuestion();
    };

    // Pre-session screen
    if (!sessionStarted) {
        return (
            <div className="max-w-2xl mx-auto mt-20">
                <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6">
                        <Award size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2 text-white">Rating Mode</h1>
                    <p className="text-white/50 mb-6">
                        Canonical questions. Global comparable ratings. Your performance here counts.
                    </p>

                    <div className="bg-[#1a1a1a] rounded-xl p-5 mb-6 text-left border border-white/5">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-white/70">
                                <p className="mb-2 font-semibold text-white">Important Rules:</p>
                                <ul className="space-y-2 text-xs">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        Fixed questions — same for everyone
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        Your rating will be updated based on performance
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        Used for leaderboard rankings
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        Cannot skip questions
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={startSession}
                        className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20"
                    >
                        Start Rating Session
                    </button>
                    <Link href="/dashboard" className="block mt-4 text-sm text-white/40 hover:text-white/80 transition-colors">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // Loading State with Skeleton UI
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#222] pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-5 h-5 rounded bg-white/10 animate-pulse" />
                        <div className="space-y-2">
                            <div className="w-32 h-5 rounded bg-white/10 animate-pulse" />
                            <div className="w-48 h-3 rounded bg-white/5 animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-6 h-[calc(100vh-200px)]">
                    <div className="flex-1 bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden">
                        <div className="h-10 bg-[#1a1a1a] border-b border-white/5" />
                        <div className="p-6 space-y-4">
                            <div className="w-3/4 h-6 rounded bg-white/10 animate-pulse" />
                            <div className="w-full h-4 rounded bg-white/5 animate-pulse" />
                            <div className="w-5/6 h-4 rounded bg-white/5 animate-pulse" />
                        </div>
                    </div>
                    <div className="flex-1 max-w-md bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden">
                        <div className="h-10 bg-[#1a1a1a] border-b border-white/5" />
                        <div className="p-4 space-y-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error State
    if (error || !question) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle size={32} className="text-red-500" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold text-white">Connection Error</h2>
                    <p className="text-white/50 text-sm max-w-md">
                        {error || "Failed to load question. Please check if the backend server is running."}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchQuestion}
                        className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Try Again
                    </button>
                    <Link
                        href="/dashboard"
                        className="px-6 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const accuracy = sessionStats.questionsAnswered > 0
        ? Math.round((sessionStats.correctAnswers / sessionStats.questionsAnswered) * 100)
        : 0;

    return (
        <div className="flex flex-col gap-6">
            {/* Session Header */}
            <div className="flex justify-between items-center border-b border-[#222] pb-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-white/50 hover:text-white transition-colors">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-lg font-bold text-white">Rating Mode</h1>
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">
                                Competitive
                            </span>
                        </div>
                        <p className="text-xs text-white/50">Canonical Questions • Global Ratings</p>
                    </div>
                </div>

                {/* Session Stats */}
                <div className="flex items-center gap-4 text-xs">
                    {sessionStats.questionsAnswered > 0 && (
                        <>
                            <div className="flex items-center gap-1.5 text-white/40">
                                <Target size={14} className="text-cyan-400" />
                                <span>{accuracy}%</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-white/40">
                                <Trophy size={14} className="text-amber-400" />
                                <span>{sessionStats.questionsAnswered} answered</span>
                            </div>
                        </>
                    )}
                    <div className={`flex items-center gap-1.5 font-mono font-bold ${sessionStats.ratingChange >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
                        <Award size={14} />
                        <span>{sessionStats.currentRating}</span>
                        {sessionStats.ratingChange !== 0 && (
                            <span className="text-xs">
                                ({sessionStats.ratingChange > 0 ? '+' : ''}{sessionStats.ratingChange})
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <QuestionCard
                question={question}
                onSubmit={handleSubmit}
                submissionResult={submissionResult}
                onNext={fetchQuestion}
            />
        </div>
    );
}
