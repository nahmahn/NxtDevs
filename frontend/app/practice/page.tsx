"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { QuestionCard } from "@/components/question/QuestionCard";
import Link from "next/link";
import { ArrowLeft, Clock, Target, Zap, AlertTriangle, RefreshCw, Settings, Play, Filter, Hash, BookOpen, BarChart3, Tag, Sparkles } from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";
import CountUp from "@/components/ui/CountUp";

// Types for the question data
interface Question {
    id: string;
    content: string;
    options: { id: string; content: string }[];
    difficulty_tier: number;
    active_constraints: Record<string, string>;
}

interface SessionStats {
    questionsAnswered: number;
    correctAnswers: number;
    averageTime: number;
    streak: number;
}

interface Filters {
    language: string;
    topic: string;
    difficulty: string;
}

interface FilterOptions {
    languages: string[];
    topics: string[];
    difficulties: string[];
    tags: string[];
}

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20, 0]; // 0 = unlimited

export default function PracticeSession() {
    // Configuration state
    const [showConfig, setShowConfig] = useState(true);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        languages: [],
        topics: [],
        difficulties: [],
        tags: []
    });
    const [selectedFilters, setSelectedFilters] = useState<Filters>({
        language: "",
        topic: "",
        difficulty: ""
    });
    const [totalQuestions, setTotalQuestions] = useState<number>(10);
    const [loadingFilters, setLoadingFilters] = useState(true);

    // Session state
    const [question, setQuestion] = useState<Question | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submissionResult, setSubmissionResult] = useState<any>(null);
    const [sessionStats, setSessionStats] = useState<SessionStats>({
        questionsAnswered: 0,
        correctAnswers: 0,
        averageTime: 0,
        streak: 0
    });
    const [sessionComplete, setSessionComplete] = useState(false);

    // Time tracking
    const startTimeRef = useRef<number>(Date.now());
    const totalTimeRef = useRef<number>(0);

    // Fetch available filter options
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/questions/filters`);
                if (res.ok) {
                    const data = await res.json();
                    setFilterOptions({
                        languages: data.languages || [],
                        topics: data.topics || [],
                        difficulties: data.difficulties || [],
                        tags: data.tags || []
                    });
                }
            } catch (e) {
                console.error("Failed to fetch filters:", e);
            } finally {
                setLoadingFilters(false);
            }
        };
        fetchFilters();
    }, []);

    const buildQueryParams = useCallback(() => {
        const params = new URLSearchParams({ mode: "practice" });
        if (selectedFilters.language) params.append("language", selectedFilters.language);
        if (selectedFilters.topic) params.append("topic", selectedFilters.topic);
        if (selectedFilters.difficulty) params.append("difficulty", selectedFilters.difficulty);
        return params.toString();
    }, [selectedFilters]);

    const fetchQuestion = useCallback(async () => {
        // Check if session is complete
        if (totalQuestions > 0 && sessionStats.questionsAnswered >= totalQuestions) {
            setSessionComplete(true);
            return;
        }

        setLoading(true);
        setSubmissionResult(null);
        setError(null);

        try {
            const userId = localStorage.getItem('user_id');
            const queryParams = buildQueryParams();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/questions/next?${queryParams}`, {
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
            startTimeRef.current = Date.now(); // Reset timer for new question
        } catch (e) {
            console.error("Failed to fetch question:", e);
            setError(e instanceof Error ? e.message : "Failed to fetch question");
            setQuestion(null);
        } finally {
            setLoading(false);
        }
    }, [buildQueryParams, totalQuestions, sessionStats.questionsAnswered]);

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
                    mode: "practice",
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
            totalTimeRef.current += timeTaken;

            const newQuestionsAnswered = sessionStats.questionsAnswered + 1;

            setSessionStats(prev => ({
                questionsAnswered: newQuestionsAnswered,
                correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
                averageTime: Math.round(totalTimeRef.current / newQuestionsAnswered),
                streak: isCorrect ? prev.streak + 1 : 0
            }));

            // Check if this was the last question
            if (totalQuestions > 0 && newQuestionsAnswered >= totalQuestions) {
                // Don't set sessionComplete here, let the next fetchQuestion handle it
            }
        } catch (e) {
            console.error("Submit error:", e);
            setError(e instanceof Error ? e.message : "Submission failed");
        }
    };

    const handleNextQuestion = () => {
        if (totalQuestions > 0 && sessionStats.questionsAnswered >= totalQuestions) {
            setSessionComplete(true);
        } else {
            fetchQuestion();
        }
    };

    const startSession = () => {
        setShowConfig(false);
        setSessionComplete(false);
        setSessionStats({
            questionsAnswered: 0,
            correctAnswers: 0,
            averageTime: 0,
            streak: 0
        });
        totalTimeRef.current = 0;
        fetchQuestion();
    };

    const restartSession = () => {
        setShowConfig(true);
        setSessionComplete(false);
        setQuestion(null);
        setSessionStats({
            questionsAnswered: 0,
            correctAnswers: 0,
            averageTime: 0,
            streak: 0
        });
        totalTimeRef.current = 0;
    };

    // Configuration Screen
    if (showConfig) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                        <ArrowLeft size={20} className="text-white/60" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                            Practice Mode
                            <span className="px-2 py-0.5 bg-lime-500/10 border border-lime-500/20 text-lime-400 text-[10px] rounded-full">BETA</span>
                        </h1>
                        <p className="text-xs text-white/40 font-medium tracking-wide uppercase mt-1">Configure your session parameters</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Config Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-[#151515] border border-white/5 rounded-2xl overflow-hidden">
                            {/* Card Header */}
                            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest">Session Settings</h2>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="p-6 space-y-6">
                                {loadingFilters ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-6 h-6 border-2 border-lime-500/30 border-t-lime-500 rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Filter Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Language */}
                                            <CustomSelect
                                                label="Language"
                                                icon={<BookOpen size={12} className="text-lime-400" />}
                                                value={selectedFilters.language}
                                                onChange={(val) => setSelectedFilters(prev => ({ ...prev, language: val }))}
                                                options={[{ value: "", label: "All Languages" }, ...filterOptions.languages.map(l => ({ value: l, label: l }))]}
                                                placeholder="All Languages"
                                            />

                                            {/* Topic */}
                                            <CustomSelect
                                                label="Topic"
                                                icon={<Tag size={12} className="text-lime-400" />}
                                                value={selectedFilters.topic}
                                                onChange={(val) => setSelectedFilters(prev => ({ ...prev, topic: val }))}
                                                options={[{ value: "", label: "All Topics" }, ...filterOptions.topics.map(t => ({ value: t, label: t }))]}
                                                placeholder="All Topics"
                                            />

                                            {/* Difficulty */}
                                            <CustomSelect
                                                label="Difficulty"
                                                icon={<BarChart3 size={12} className="text-lime-400" />}
                                                value={selectedFilters.difficulty}
                                                onChange={(val) => setSelectedFilters(prev => ({ ...prev, difficulty: val }))}
                                                options={[{ value: "", label: "All Difficulties" }, ...filterOptions.difficulties.map(d => ({ value: d, label: d }))]}
                                                placeholder="All Difficulties"
                                            />
                                        </div>

                                        <div className="h-px bg-white/5 my-4" />

                                        {/* Question Count */}
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2 text-[11px] font-bold text-white/40 uppercase tracking-wider">
                                                <Hash size={12} className="text-white/60" />
                                                Number of Questions
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {QUESTION_COUNT_OPTIONS.map(count => (
                                                    <button
                                                        key={count}
                                                        onClick={() => setTotalQuestions(count)}
                                                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${totalQuestions === count
                                                            ? 'bg-[#84cc16] border-transparent text-white shadow-lg shadow-lime-500/20'
                                                            : 'bg-[#0a0a0a] border-white/10 text-white/40 hover:bg-white/5 hover:text-white hover:border-white/20'
                                                            }`}
                                                    >
                                                        {count === 0 ? '∞ Unlimited' : count}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Start Button */}
                            <div className="px-6 py-6 border-t border-white/5 bg-black/20">
                                <button
                                    onClick={startSession}
                                    disabled={loadingFilters}
                                    className="group w-full py-4 bg-[#84cc16] text-white hover:bg-[#65a30d] font-bold rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm shadow-xl shadow-lime-500/10"
                                >
                                    <Play size={16} className="fill-current" />
                                    Start Practice Session
                                    <div className="w-px h-4 bg-white/20 mx-1" />
                                    <span className="text-white/80 text-xs">
                                        {totalQuestions === 0 ? 'UNLIMITED QUESTIONS' : `${totalQuestions} QUESTIONS`}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-4">
                        <div className="bg-[#151515] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-lime-500/10 flex items-center justify-center border border-lime-500/20">
                                    <Sparkles size={18} className="text-lime-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Adaptive Learning</h3>

                                </div>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                                Practice mode automatically adapts to your skill level. Questions are selected based on your cognitive profile to target areas for improvement.
                            </p>
                        </div>

                        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 space-y-3">
                            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">About this mode</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                    <div className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                                    <span>No impact on ELO rating</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                    <div className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                                    <span>Instant feedback & explanations</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                    <div className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                                    <span>Detailed performance stats</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Session Complete Screen
    if (sessionComplete) {
        const accuracy = sessionStats.questionsAnswered > 0
            ? Math.round((sessionStats.correctAnswers / sessionStats.questionsAnswered) * 100)
            : 0;

        return (
            <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-8">
                {/* Success Icon */}
                <div className="relative">
                    <div className="absolute inset-0 bg-lime-500/20 blur-xl rounded-full" />
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-lime-500 to-emerald-500 flex items-center justify-center relative shadow-2xl shadow-lime-500/20 text-black">
                        <Zap size={48} className="fill-current" />
                    </div>
                </div>

                {/* Title */}
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">Session Complete!</h2>
                    <p className="text-white/40 text-sm font-medium">Great job on completing your practice session</p>
                </div>

                {/* Stats Grid */}
                <div className="w-full grid grid-cols-2 gap-4">
                    <div className="bg-[#151515] border border-white/5 rounded-2xl p-5 text-center group hover:bg-[#1a1a1a] transition-colors">
                        <div className="text-3xl font-black text-white mb-1">{sessionStats.questionsAnswered}</div>
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Questions</div>
                    </div>
                    <div className="bg-[#151515] border border-white/5 rounded-2xl p-5 text-center group hover:bg-[#1a1a1a] transition-colors">
                        <div className="text-3xl font-black text-lime-400 mb-1">{accuracy}%</div>
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Accuracy</div>
                    </div>
                    <div className="bg-[#151515] border border-white/5 rounded-2xl p-5 text-center group hover:bg-[#1a1a1a] transition-colors">
                        <div className="text-3xl font-black text-lime-400 mb-1">{sessionStats.correctAnswers}</div>
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Correct</div>
                    </div>
                    <div className="bg-[#151515] border border-white/5 rounded-2xl p-5 text-center group hover:bg-[#1a1a1a] transition-colors">
                        <div className="text-3xl font-black text-lime-400 mb-1">{Math.round(sessionStats.averageTime / 1000)}s</div>
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Avg Time</div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 w-full">
                    <button
                        onClick={restartSession}
                        className="flex-1 py-4 bg-[#1a1a1a] hover:bg-[#222] border border-white/10 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-wider"
                    >
                        <Settings size={16} />
                        Configure New
                    </button>
                    <Link
                        href="/dashboard"
                        className="flex-1 py-4 bg-white text-black hover:bg-gray-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-wider"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // Loading State with Skeleton UI
    if (loading) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                        <div className="space-y-2">
                            <div className="w-32 h-4 rounded bg-white/5 animate-pulse" />
                            <div className="w-48 h-3 rounded bg-white/5 animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-6 h-[calc(100vh-200px)]">
                    <div className="flex-1 bg-[#151515] border border-white/5 rounded-2xl overflow-hidden p-6 space-y-6">
                        <div className="w-3/4 h-8 rounded bg-white/5 animate-pulse" />
                        <div className="space-y-3">
                            <div className="w-full h-4 rounded bg-white/5 animate-pulse" />
                            <div className="w-full h-4 rounded bg-white/5 animate-pulse" />
                            <div className="w-2/3 h-4 rounded bg-white/5 animate-pulse" />
                        </div>
                    </div>
                    <div className="flex-1 max-w-sm bg-[#151515] border border-white/5 rounded-2xl overflow-hidden p-6 space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Error State
    if (error || !question) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle size={40} className="text-red-500" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-black text-white uppercase tracking-wide">Connection Error</h2>
                    <p className="text-white/50 text-sm max-w-md">
                        {error || "Failed to load question. Please check if the backend server is running."}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchQuestion}
                        className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 uppercase text-xs tracking-wider"
                    >
                        <RefreshCw size={16} />
                        Try Again
                    </button>
                    <button
                        onClick={restartSession}
                        className="px-8 py-3 bg-[#1a1a1a] border border-white/10 text-white rounded-xl font-bold hover:bg-[#222] transition-colors uppercase text-xs tracking-wider"
                    >
                        Settings
                    </button>
                </div>
            </div>
        );
    }

    const accuracy = sessionStats.questionsAnswered > 0
        ? Math.round((sessionStats.correctAnswers / sessionStats.questionsAnswered) * 100)
        : 0;

    const progress = totalQuestions > 0
        ? Math.round((sessionStats.questionsAnswered / totalQuestions) * 100)
        : null;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            {/* Session Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={restartSession} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/60 hover:text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-lg font-bold text-white uppercase tracking-wider">Practice Session</h1>
                            <span className="px-2 py-0.5 bg-lime-500/10 border border-lime-500/20 text-lime-400 text-[10px] rounded-full font-bold uppercase tracking-wider">
                                Adaptive
                            </span>
                            {totalQuestions > 0 && (
                                <span className="px-2 py-0.5 bg-white/10 text-white/60 text-[10px] rounded-full font-mono">
                                    {sessionStats.questionsAnswered + 1} / {totalQuestions}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Session Stats */}
                <div className="flex items-center gap-6">
                    {totalQuestions > 0 && progress !== null && (
                        <div className="flex items-center gap-3">
                            <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-lime-500 to-emerald-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                    {sessionStats.questionsAnswered >= 0 && (
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Accuracy</span>
                                <span className={`text-sm font-bold tabular-nums ${accuracy >= 80 ? 'text-lime-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-white'}`}>
                                    {accuracy}%
                                </span>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Streak</span>
                                <div className="flex items-center gap-1">
                                    <Zap size={12} className={sessionStats.streak > 0 ? "text-lime-400 fill-lime-400" : "text-white/20"} />
                                    <span className="text-sm font-bold text-white tabular-nums">{sessionStats.streak}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <QuestionCard
                question={question}
                onSubmit={handleSubmit}
                submissionResult={submissionResult}
                onNext={handleNextQuestion}
            />
        </div>
    );
}
