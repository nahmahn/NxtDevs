"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDuelSocket, DuelMessage } from "@/hooks/useDuelSocket";
import { Swords, Clock, User, Trophy, ArrowRight, Loader2, X, Check, Zap } from "lucide-react";

// Game states
type DuelState = "lobby" | "countdown" | "question" | "waiting" | "reveal" | "end";

interface DuelData {
    id: string;
    status: string;
    is_player1: boolean;
    my_score: number;
    opponent_score: number;
    opponent: {
        username: string;
        rating: number;
    } | null;
    current_round: number;
    total_rounds: number;
    round_data: {
        round_number: number;
        question: {
            id: string;
            content: string;
            options: { id: string; content: string }[];
        } | null;
        my_answered: boolean;
        opponent_answered: boolean;
        started_at: string | null;
    } | null;
}

export default function DuelPage() {
    const router = useRouter();
    const [gameState, setGameState] = useState<DuelState>("lobby");
    const [countdown, setCountdown] = useState(3);
    const [duelId, setDuelId] = useState<string | null>(null);
    const [duelData, setDuelData] = useState<DuelData | null>(null);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(60);
    const [myAnswer, setMyAnswer] = useState<{ correct: boolean; optionId: string } | null>(null);
    const [opponentAnswer, setOpponentAnswer] = useState<{ correct: boolean } | null>(null);
    const [ratingChange, setRatingChange] = useState<number | null>(null);
    const [myNewRating, setMyNewRating] = useState<number | null>(null);
    const [winner, setWinner] = useState<"me" | "opponent" | "draw" | null>(null);
    const [revealRoundNumber, setRevealRoundNumber] = useState<number>(0); // Store round number at reveal time
    const [queueTime, setQueueTime] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUsername, setCurrentUsername] = useState<string>("Player");

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const answerStartTime = useRef<number>(Date.now());
    const isDuelCompleted = useRef<boolean>(false); // PERMANENT flag - never reset!
    const isInRevealRef = useRef<boolean>(false); // Synchronous flag for reveal state
    const duelDataRef = useRef(duelData); // Keep ref updated for message handlers
    const duelIdRef = useRef(duelId); // Keep ref updated for fetchDuelState
    const currentUserIdRef = useRef(currentUserId); // Keep ref updated for API calls

    // Keep refs updated
    useEffect(() => {
        duelDataRef.current = duelData;
        duelIdRef.current = duelId;
        currentUserIdRef.current = currentUserId;
    }, [duelData, duelId, currentUserId]);

    // Load user from localStorage on mount
    useEffect(() => {
        const userId = localStorage.getItem('user_id');
        const username = localStorage.getItem('username');
        if (userId) {
            setCurrentUserId(userId);
            setCurrentUsername(username || 'Player');
        } else {
            // Redirect to login if not authenticated
            router.push('/login');
        }
    }, [router]);

    // Handle WebSocket messages
    const handleMessage = useCallback((message: DuelMessage) => {
        console.log("Duel message:", message);

        // CRITICAL: If duel is completed, ignore ALL messages except PONG
        if (isDuelCompleted.current && message.type !== "PONG" && message.type !== "DUEL_END") {
            console.log("[WS] Ignoring message - duel already completed");
            return;
        }

        const currentDuelData = duelDataRef.current; // Use ref for latest data

        switch (message.type) {
            case "MATCH_START":
                setGameState("countdown");
                setCountdown(message.countdown || 3);
                break;

            case "QUESTION_START":
                isInRevealRef.current = false; // Reset reveal flag
                setGameState("question");
                setSelectedOption(null);
                setMyAnswer(null);
                setOpponentAnswer(null);
                setTimeLeft(60);
                answerStartTime.current = Date.now();
                fetchDuelState();
                break;

            case "ANSWER_SUBMITTED":
                // Update opponent_answered state in duelData
                if (message.player === (currentDuelData?.is_player1 ? "player2" : "player1")) {
                    // Opponent answered - update the state
                    if (currentDuelData?.round_data) {
                        setDuelData({
                            ...currentDuelData,
                            round_data: {
                                ...currentDuelData.round_data,
                                opponent_answered: true
                            }
                        });
                    }
                }
                if (message.both_answered) {
                    // Both answered - transition to reveal
                    setGameState("reveal");
                    // Fetch latest state to get correct answers
                    fetchDuelState();
                }
                break;

            case "ROUND_END":
                // Set reveal flag IMMEDIATELY (synchronous) before any async state updates
                isInRevealRef.current = true;
                // Store the round number BEFORE backend increments it
                setRevealRoundNumber((currentDuelData?.current_round ?? 0) + 1);
                setGameState("reveal");
                const iAmPlayer1 = currentDuelData?.is_player1;

                // DEBUG: Log the values
                console.log("[ROUND_END] is_player1:", iAmPlayer1);
                console.log("[ROUND_END] message.player1_correct:", message.player1_correct);
                console.log("[ROUND_END] message.player2_correct:", message.player2_correct);

                // Set my answer correct status from server (in case we have placeholder)
                const myCorrect = iAmPlayer1 ? message.player1_correct : message.player2_correct;
                console.log("[ROUND_END] myCorrect (assigned):", myCorrect);

                setMyAnswer(prev => ({
                    correct: myCorrect,
                    optionId: prev?.optionId || ""
                }));
                setOpponentAnswer({
                    correct: iAmPlayer1 ? message.player2_correct : message.player1_correct
                });
                // Update scores
                if (currentDuelData) {
                    setDuelData({
                        ...currentDuelData,
                        my_score: iAmPlayer1 ? message.scores.player1 : message.scores.player2,
                        opponent_score: iAmPlayer1 ? message.scores.player2 : message.scores.player1
                    });
                }
                break;

            case "DUEL_END":
                isDuelCompleted.current = true; // SET PERMANENT FLAG
                setGameState("end");
                const isPlayer1 = currentDuelData?.is_player1;
                const myChange = isPlayer1 ? message.rating_changes.player1 : message.rating_changes.player2;
                setRatingChange(myChange);
                const myNew = isPlayer1 ? message.new_ratings?.player1 : message.new_ratings?.player2;
                setMyNewRating(myNew);

                if (message.winner === "draw") {
                    setWinner("draw");
                } else if ((message.winner === "player1" && isPlayer1) || (message.winner === "player2" && !isPlayer1)) {
                    setWinner("me");
                } else {
                    setWinner("opponent");
                }
                break;

            case "OPPONENT_DISCONNECTED":
                setError("Opponent disconnected");
                break;

            case "PONG":
                // Heartbeat response
                break;
        }
    }, []); // No dependencies needed - uses refs for latest values

    // Stop WebSocket connection when duel is completed (check both gameState and ref)
    const activeDuelId = (gameState === "end" || isDuelCompleted.current) ? null : duelId;

    const { isConnected, sendMessage } = useDuelSocket({
        duelId: activeDuelId,
        username: currentUserId || '',
        onMessage: handleMessage
    });

    // Fetch duel state
    const fetchDuelState = async () => {
        // CRITICAL: Don't fetch if duel is already completed!
        if (isDuelCompleted.current) {
            console.log("[fetchDuelState] Skipping - duel already completed");
            return;
        }

        const currentDuelId = duelIdRef.current;
        const userId = currentUserIdRef.current;
        if (!currentDuelId || !userId) {
            console.log("[fetchDuelState] No duelId or userId yet");
            return;
        }
        console.log("[fetchDuelState] Fetching for duel:", currentDuelId);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/duel/${currentDuelId}`, {
                headers: { "X-User-Id": userId }
            });
            if (res.ok) {
                const data = await res.json();
                console.log("[fetchDuelState] Got data:", data);

                // Check AGAIN if duel completed during the fetch!
                if (isDuelCompleted.current) {
                    console.log("[fetchDuelState] Ignoring response - duel completed during fetch");
                    return;
                }

                setDuelData(data);

                // CRITICAL: Sync answer state from server response!
                // If server says we already answered, set myAnswer so options are disabled
                // BUT don't overwrite if we already have myAnswer with correct value set
                if (data.round_data?.my_answered) {
                    console.log("[fetchDuelState] Server says we already answered this round");
                    // Only set placeholder if we don't already have an answer recorded
                    if (!myAnswer) {
                        // Use a placeholder that just disables options - we'll get correct/wrong from ROUND_END message
                        setMyAnswer({ correct: null as any, optionId: "" }); // placeholder - correct will be updated by ROUND_END
                        setGameState("waiting");
                    }
                } else if (data.round_data && data.status === "in_progress") {
                    // IMPORTANT: If we haven't answered this round, ensure we're in "question" state
                    // Use REF instead of gameState to avoid async state update race condition!
                    if (!isInRevealRef.current) {
                        console.log("[fetchDuelState] Server says we haven't answered yet - resetting to question state");
                        setMyAnswer(null);
                        setSelectedOption(null);
                        if (gameState === "waiting") {
                            setGameState("question");
                        }
                    } else {
                        console.log("[fetchDuelState] Ignoring reset - isInRevealRef is true");
                    }
                }
            } else {
                console.error("[fetchDuelState] Failed with status:", res.status);
            }
        } catch (e) {
            console.error("Failed to fetch duel state:", e);
        }
    };

    // Join queue
    const joinQueue = async () => {
        if (!currentUserId) return;
        setIsJoining(true);
        setError(null);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/duel/join-queue`, {
                method: "POST",
                headers: { "X-User-Id": currentUserId }
            });
            const data = await res.json();

            if (data.status === "matched") {
                setDuelId(data.duel_id);
                setDuelData({
                    id: data.duel_id,
                    status: "countdown",
                    is_player1: data.is_player1,
                    my_score: 0,
                    opponent_score: 0,
                    opponent: data.opponent,
                    current_round: 0,
                    total_rounds: 5,
                    round_data: null
                });
                setGameState("countdown");
            } else {
                // Still in queue, poll
                pollQueue();
            }
        } catch (e) {
            console.error("Failed to join queue:", e);
            setError("Failed to join matchmaking queue");
        } finally {
            setIsJoining(false);
        }
    };

    // Poll queue for match
    const pollQueue = async () => {
        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/duel/join-queue`, {
                    method: "POST",
                    headers: { "X-User-Id": currentUserId || '' }
                });
                const data = await res.json();

                if (data.status === "matched") {
                    clearInterval(pollInterval);
                    setDuelId(data.duel_id);
                    setDuelData({
                        id: data.duel_id,
                        status: "countdown",
                        is_player1: data.is_player1,
                        my_score: 0,
                        opponent_score: 0,
                        opponent: data.opponent,
                        current_round: 0,
                        total_rounds: 5,
                        round_data: null
                    });
                    setGameState("countdown");
                }

                setQueueTime(prev => prev + 2);
            } catch (e) {
                console.error("Poll error:", e);
            }
        }, 2000);

        // Stop polling after 2 minutes
        setTimeout(() => {
            clearInterval(pollInterval);
        }, 120000);
    };

    // Leave queue
    const leaveQueue = async () => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/duel/leave-queue`, {
                method: "POST",
                headers: { "X-User-Id": currentUserId || '' }
            });
        } catch (e) {
            console.error("Failed to leave queue:", e);
        }
        router.push("/dashboard");
    };

    // Submit answer
    const submitAnswer = async (optionId: string) => {
        if (!duelId || myAnswer) return;

        setSelectedOption(optionId);
        const timeTaken = Date.now() - answerStartTime.current;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/duel/${duelId}/answer?option_id=${optionId}&time_ms=${timeTaken}`,
                {
                    method: "POST",
                    headers: { "X-User-Id": currentUserId || '' }
                }
            );
            const data = await res.json();

            setMyAnswer({ correct: data.is_correct, optionId });

            if (data.waiting_for_opponent) {
                setGameState("waiting");
            }
        } catch (e) {
            console.error("Failed to submit answer:", e);
            setError("Failed to submit answer");
        }
    };

    // Countdown timer
    useEffect(() => {
        if (gameState === "countdown" && countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [gameState, countdown]);

    // Question timer
    useEffect(() => {
        if (gameState === "question" && timeLeft > 0) {
            timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
            };
        } else if (timeLeft === 0 && gameState === "question" && !myAnswer) {
            // Auto-submit first option on timeout (penalty)
            if (duelData?.round_data?.question?.options[0]) {
                submitAnswer(duelData.round_data.question.options[0].id);
            }
        }
    }, [gameState, timeLeft, myAnswer, duelData]);

    // FALLBACK: Poll server to catch missed WebSocket messages (waiting and question states only)
    // DO NOT poll in reveal state - it will overwrite the answer correctness data!
    useEffect(() => {
        if (gameState !== "waiting" && gameState !== "question") return;

        const pollInterval = setInterval(async () => {
            // Stop polling if duel is already completed
            if (isDuelCompleted.current) {
                clearInterval(pollInterval);
                return;
            }

            const currentDuelId = duelIdRef.current;
            if (!currentDuelId || !currentUserIdRef.current) return;

            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/duel/${currentDuelId}`, {
                    headers: { "X-User-Id": currentUserIdRef.current || '' }
                });
                if (res.ok) {
                    const data = await res.json();
                    console.log("[Polling] Duel state:", data);

                    // Always keep duelData in sync
                    setDuelData(data);

                    // Check if duel is completed - transition to end state!
                    if (data.status === "completed") {
                        console.log("[Polling] Duel completed! Transitioning to end...");
                        clearInterval(pollInterval);
                        setGameState("end");
                        // Determine winner for current player
                        const am_player1 = data.is_player1;
                        const p1_score = data.my_score;
                        const p2_score = data.opponent_score;
                        if (p1_score > p2_score) {
                            setWinner("me");
                        } else if (p1_score < p2_score) {
                            setWinner("opponent");
                        } else {
                            setWinner("draw");
                        }
                        return;
                    }

                    // Check if we're in waiting state and opponent answered
                    if (gameState === "waiting" && data.round_data?.opponent_answered && data.round_data?.my_answered) {
                        console.log("[Polling] Both answered! Transitioning to reveal...");
                        clearInterval(pollInterval);
                        setGameState("reveal");
                    }

                    // Check if we moved to next round (backend advanced)
                    if (data.current_round > (duelDataRef.current?.current_round ?? -1)) {
                        console.log("[Polling] New round detected!");
                        clearInterval(pollInterval);
                        setGameState("question");
                        setMyAnswer(null);
                        setSelectedOption(null);
                        setTimeLeft(60);
                        answerStartTime.current = Date.now();
                    }

                    // If we're stuck in waiting but server says we haven't answered, fix it
                    if (gameState === "waiting" &&
                        data.round_data &&
                        !data.round_data.my_answered &&
                        data.status === "in_progress") {
                        console.log("[Polling] State mismatch! Resetting to question...");
                        clearInterval(pollInterval);
                        setGameState("question");
                        setMyAnswer(null);
                        setSelectedOption(null);
                    }
                }
            } catch (e) {
                console.error("[Polling] Error:", e);
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [gameState]);

    // Parse question content
    const parseQuestionContent = (content: string) => {
        try {
            const parsed = JSON.parse(content);
            return parsed.scenario || parsed.body || content;
        } catch {
            return content;
        }
    };

    // Render based on game state
    return (
        <div className="relative min-h-[80vh] flex items-center justify-center">
            {/* Lobby - Finding Opponent */}
            {gameState === "lobby" && (
                <div className="text-center space-y-8">
                    <div className="relative w-32 h-32 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-teal-500/30 animate-ping" />
                        <div className="absolute inset-2 rounded-full border-4 border-teal-500/50 animate-pulse" />
                        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                            <Swords size={40} className="text-white" />
                        </div>
                    </div>

                    {!isJoining && queueTime === 0 ? (
                        <>
                            <div>
                                <h1 className="text-3xl font-black text-white mb-2">1v1 Duel</h1>
                                <p className="text-white/50">Challenge another player in real-time</p>
                            </div>
                            <button
                                onClick={joinQueue}
                                className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl text-white font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-teal-500/30"
                            >
                                Find Opponent
                            </button>
                        </>
                    ) : (
                        <>
                            <div>
                                <h1 className="text-2xl font-bold text-white mb-2">Finding Opponent...</h1>
                                <p className="text-white/50">
                                    {queueTime}s in queue • Matching by ELO
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin text-teal-400" size={20} />
                                <span className="text-teal-400">Searching...</span>
                            </div>
                            <button
                                onClick={leaveQueue}
                                className="text-white/50 hover:text-white text-sm underline"
                            >
                                Cancel
                            </button>
                        </>
                    )}

                    {error && (
                        <p className="text-red-400 text-sm">{error}</p>
                    )}
                </div>
            )}

            {/* Countdown */}
            {gameState === "countdown" && (
                <div className="text-center space-y-6">
                    <div className="text-white/50 mb-4">
                        <p>Matched with</p>
                        <p className="text-xl font-bold text-white">{duelData?.opponent?.username || "Opponent"}</p>
                        <p className="text-sm text-cyan-400">{Math.round(duelData?.opponent?.rating || 1200)} ELO</p>
                    </div>
                    <div className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400 animate-pulse">
                        {countdown > 0 ? countdown : "GO!"}
                    </div>
                </div>
            )}

            {/* Question Phase - Loading */}
            {(gameState === "question" || gameState === "waiting") && !duelData?.round_data?.question && (
                <div className="text-center space-y-6">
                    <Loader2 className="w-12 h-12 animate-spin text-teal-400 mx-auto" />
                    <p className="text-white/50">Loading question...</p>
                </div>
            )}

            {/* Question Phase */}
            {(gameState === "question" || gameState === "waiting") && duelData?.round_data?.question && (
                <div className="w-full max-w-4xl space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Round indicators */}
                            <div className="flex items-center gap-1">
                                {Array.from({ length: duelData.total_rounds }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-3 h-3 rounded-full ${i < duelData.current_round
                                            ? "bg-teal-500"
                                            : i === duelData.current_round
                                                ? "bg-white animate-pulse"
                                                : "bg-white/20"
                                            }`}
                                    />
                                ))}
                            </div>
                            <span className="text-sm text-white/50">
                                Round {duelData.current_round + 1}/{duelData.total_rounds}
                            </span>
                        </div>

                        {/* Timer */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${timeLeft <= 10 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"
                            }`}>
                            <Clock size={16} />
                            <span className="font-mono font-bold">{timeLeft}s</span>
                        </div>

                        {/* Scores */}
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[10px] text-white/40">YOU</p>
                                <p className="text-xl font-black text-teal-400">{duelData.my_score}</p>
                            </div>
                            <div className="text-white/30">vs</div>
                            <div>
                                <p className="text-[10px] text-white/40">OPP</p>
                                <p className="text-xl font-black text-orange-400">{duelData.opponent_score}</p>
                            </div>
                        </div>
                    </div>

                    {/* Question */}
                    <div className="bg-[#151515] rounded-2xl p-6 border border-white/5">
                        <h2 className="text-lg font-bold text-white mb-4">Question</h2>
                        <div className="text-white/80 whitespace-pre-wrap">
                            {parseQuestionContent(duelData.round_data.question.content)}
                        </div>
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-2 gap-4">
                        {duelData.round_data.question.options.map((option, idx) => (
                            <button
                                key={option.id}
                                onClick={() => !myAnswer && submitAnswer(option.id)}
                                disabled={!!myAnswer || gameState === "waiting"}
                                className={`p-4 rounded-xl border text-left transition-all ${selectedOption === option.id
                                    ? "border-teal-500 bg-teal-500/20"
                                    : "border-white/10 bg-[#151515] hover:border-white/30"
                                    } ${myAnswer ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
                            >
                                <span className="text-teal-400 font-bold mr-2">
                                    {String.fromCharCode(65 + idx)}.
                                </span>
                                <span className="text-white/80">{option.content}</span>
                            </button>
                        ))}
                    </div>

                    {/* Waiting state */}
                    {gameState === "waiting" && (
                        <div className="text-center py-4">
                            <div className="flex items-center justify-center gap-2 text-white/50">
                                <Loader2 className="animate-spin" size={16} />
                                <span>Waiting for opponent...</span>
                            </div>
                        </div>
                    )}

                    {/* Opponent already answered indicator (while I'm still answering) */}
                    {gameState === "question" && duelData.round_data?.opponent_answered && !myAnswer && (
                        <div className="text-center py-2">
                            <div className="flex items-center justify-center gap-2 text-orange-400/80">
                                <Check size={16} />
                                <span className="text-sm">Opponent has answered!</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Reveal */}
            {gameState === "reveal" && (
                <div className="w-full max-w-xl mx-auto text-center space-y-6">
                    <h2 className="text-2xl font-bold text-white">Round {revealRoundNumber || 1} Results</h2>

                    {/* Results comparison card */}
                    <div className="bg-[#151515] rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center justify-between">
                            {/* My result */}
                            <div className="text-center flex-1">
                                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 ${myAnswer?.correct === null ? "bg-white/10" :
                                    myAnswer?.correct ? "bg-lime-500/20" : "bg-red-500/20"
                                    }`}>
                                    {myAnswer?.correct === null ? (
                                        <Loader2 size={36} className="text-white/50 animate-spin" />
                                    ) : myAnswer?.correct ? (
                                        <Check size={40} className="text-lime-400" />
                                    ) : (
                                        <X size={40} className="text-red-400" />
                                    )}
                                </div>
                                <p className="text-sm text-white/50">You</p>
                                <p className={`font-bold ${myAnswer?.correct === null ? "text-white/50" :
                                    myAnswer?.correct ? "text-lime-400" : "text-red-400"
                                    }`}>
                                    {myAnswer?.correct === null ? "Loading..." :
                                        myAnswer?.correct ? "Correct!" : "Wrong"}
                                </p>
                            </div>

                            <div className="text-white/20 text-2xl font-bold px-4">VS</div>

                            {/* Opponent result */}
                            <div className="text-center flex-1">
                                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 ${opponentAnswer?.correct === null || opponentAnswer?.correct === undefined ? "bg-white/10" :
                                    opponentAnswer?.correct ? "bg-lime-500/20" : "bg-red-500/20"
                                    }`}>
                                    {opponentAnswer?.correct === null || opponentAnswer?.correct === undefined ? (
                                        <Loader2 size={36} className="text-white/50 animate-spin" />
                                    ) : opponentAnswer?.correct ? (
                                        <Check size={40} className="text-lime-400" />
                                    ) : (
                                        <X size={40} className="text-red-400" />
                                    )}
                                </div>
                                <p className="text-sm text-white/50">{duelData?.opponent?.username}</p>
                                <p className={`font-bold ${opponentAnswer?.correct === null || opponentAnswer?.correct === undefined ? "text-white/50" :
                                    opponentAnswer?.correct ? "text-lime-400" : "text-red-400"
                                    }`}>
                                    {opponentAnswer?.correct === null || opponentAnswer?.correct === undefined ? "Loading..." :
                                        opponentAnswer?.correct ? "Correct!" : "Wrong"}
                                </p>
                            </div>
                        </div>

                        {/* Current scores */}
                        <div className="mt-6 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between text-sm">
                                <div className="text-teal-400 font-bold">{duelData?.my_score || 0}</div>
                                <div className="text-white/50">Current Score</div>
                                <div className="text-orange-400 font-bold">{duelData?.opponent_score || 0}</div>
                            </div>
                            {/* Mini score bar */}
                            <div className="relative h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 bg-teal-500 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${duelData?.my_score && duelData?.opponent_score
                                            ? (duelData.my_score / (duelData.my_score + duelData.opponent_score)) * 100
                                            : duelData?.my_score ? 100 : 50}%`
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <p className="text-white/40 animate-pulse">Next question starting soon...</p>
                </div>
            )}

            {/* End Screen */}
            {gameState === "end" && (
                <div className="w-full max-w-2xl mx-auto text-center space-y-8">
                    {/* Trophy and Result */}
                    <div className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center ${winner === "me" ? "bg-gradient-to-br from-lime-500/30 to-emerald-500/30" :
                        winner === "opponent" ? "bg-gradient-to-br from-red-500/30 to-orange-500/30" :
                            "bg-gradient-to-br from-amber-500/30 to-yellow-500/30"
                        }`}>
                        <Trophy size={56} className={
                            winner === "me" ? "text-lime-400" :
                                winner === "opponent" ? "text-red-400" :
                                    "text-amber-400"
                        } />
                    </div>

                    <div>
                        <h1 className={`text-5xl font-black ${winner === "me" ? "text-lime-400" :
                            winner === "opponent" ? "text-red-400" :
                                "text-amber-400"
                            }`}>
                            {winner === "me" ? "Victory!" : winner === "opponent" ? "Defeat" : "Draw"}
                        </h1>
                    </div>

                    {/* Score Comparison Card */}
                    <div className="bg-[#151515] rounded-2xl p-6 border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-6">Match Summary</h3>

                        {/* Players Comparison */}
                        <div className="flex items-center justify-between mb-6">
                            {/* You */}
                            <div className="text-center flex-1">
                                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2 ${winner === "me" ? "bg-lime-500/20 ring-2 ring-lime-500" : "bg-white/10"
                                    }`}>
                                    <User size={28} className="text-teal-400" />
                                </div>
                                <p className="text-sm text-white/50">You</p>
                                <p className="text-3xl font-black text-teal-400">{duelData?.my_score}</p>
                                <p className="text-xs text-white/30">
                                    {duelData?.total_rounds ? Math.round((duelData.my_score / duelData.total_rounds) * 100) : 0}% accuracy
                                </p>
                            </div>

                            {/* VS */}
                            <div className="px-4">
                                <div className="text-white/20 text-2xl font-bold">VS</div>
                            </div>

                            {/* Opponent */}
                            <div className="text-center flex-1">
                                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2 ${winner === "opponent" ? "bg-red-500/20 ring-2 ring-red-500" : "bg-white/10"
                                    }`}>
                                    <User size={28} className="text-orange-400" />
                                </div>
                                <p className="text-sm text-white/50">{duelData?.opponent?.username}</p>
                                <p className="text-3xl font-black text-orange-400">{duelData?.opponent_score}</p>
                                <p className="text-xs text-white/30">
                                    {duelData?.total_rounds ? Math.round((duelData.opponent_score / duelData.total_rounds) * 100) : 0}% accuracy
                                </p>
                            </div>
                        </div>

                        {/* Score Bar */}
                        <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                                style={{
                                    width: `${duelData?.my_score && duelData?.opponent_score
                                        ? (duelData.my_score / (duelData.my_score + duelData.opponent_score)) * 100
                                        : duelData?.my_score ? 100 : 50}%`
                                }}
                            />
                            <div
                                className="absolute inset-y-0 right-0 bg-gradient-to-l from-orange-500 to-red-500 rounded-full transition-all duration-500"
                                style={{
                                    width: `${duelData?.my_score && duelData?.opponent_score
                                        ? (duelData.opponent_score / (duelData.my_score + duelData.opponent_score)) * 100
                                        : duelData?.opponent_score ? 100 : 50}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* Round-by-Round Performance */}
                    <div className="bg-[#151515] rounded-2xl p-6 border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-4">Round Performance</h3>
                        <div className="flex items-end justify-center gap-2 h-24">
                            {[...Array(duelData?.total_rounds || 5)].map((_, i) => {
                                const myCorrect = i < (duelData?.my_score || 0);
                                const oppCorrect = i < (duelData?.opponent_score || 0);
                                return (
                                    <div key={i} className="flex flex-col items-center gap-1">
                                        {/* Bar */}
                                        <div className="flex gap-1 h-16">
                                            <div
                                                className={`w-4 rounded-t transition-all duration-300 ${myCorrect ? "bg-gradient-to-t from-teal-600 to-teal-400" : "bg-white/10"
                                                    }`}
                                                style={{ height: myCorrect ? "100%" : "30%" }}
                                            />
                                            <div
                                                className={`w-4 rounded-t transition-all duration-300 ${oppCorrect ? "bg-gradient-to-t from-orange-600 to-orange-400" : "bg-white/10"
                                                    }`}
                                                style={{ height: oppCorrect ? "100%" : "30%" }}
                                            />
                                        </div>
                                        <span className="text-xs text-white/40">R{i + 1}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-center gap-6 mt-4 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-teal-500" />
                                <span className="text-white/50">You</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500" />
                                <span className="text-white/50">{duelData?.opponent?.username}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[#151515] rounded-xl p-4 border border-white/10 text-center">
                            <p className="text-xs text-white/40 mb-1">Questions</p>
                            <p className="text-2xl font-bold text-white">{duelData?.total_rounds || 5}</p>
                        </div>
                        <div className="bg-[#151515] rounded-xl p-4 border border-white/10 text-center">
                            <p className="text-xs text-white/40 mb-1">Your Streak</p>
                            <p className="text-2xl font-bold text-teal-400">{duelData?.my_score || 0}</p>
                        </div>
                        <div className="bg-[#151515] rounded-xl p-4 border border-white/10 text-center">
                            <p className="text-xs text-white/40 mb-1">New ELO</p>
                            <p className="text-2xl font-bold text-white">
                                {myNewRating !== null ? Math.round(myNewRating) : Math.round(1200 + (ratingChange || 0))}
                            </p>
                        </div>
                    </div>

                    {/* ELO Change */}
                    {ratingChange !== null && (
                        <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl ${ratingChange >= 0 ? "bg-lime-500/20" : "bg-red-500/20"
                            }`}>
                            <Zap size={24} className={ratingChange >= 0 ? "text-lime-400" : "text-red-400"} />
                            <span className={`text-3xl font-black ${ratingChange >= 0 ? "text-lime-400" : "text-red-400"}`}>
                                {ratingChange >= 0 ? "+" : ""}{ratingChange} ELO
                            </span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-center gap-4 pt-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl text-white font-bold hover:scale-105 transition-transform shadow-lg shadow-teal-500/30"
                        >
                            Play Again
                        </button>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="px-8 py-4 bg-white/10 rounded-xl text-white font-medium hover:bg-white/20 transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
