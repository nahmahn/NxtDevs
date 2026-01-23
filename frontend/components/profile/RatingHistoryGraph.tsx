"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Activity, RefreshCw } from "lucide-react";

interface RatingHistoryPoint {
    rating: number;
    delta: number;
    timestamp: string;
    index: number;
}

interface RatingHistoryData {
    history: RatingHistoryPoint[];
    current_rating: number;
    total_changes: number;
    highest_rating?: number;
    lowest_rating?: number;
}

export function RatingHistoryGraph() {
    const [data, setData] = useState<RatingHistoryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const userId = localStorage.getItem('user_id');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/rating-history?limit=50`, {
                headers: userId ? { 'X-User-Id': userId } : {}
            });
            if (!res.ok) throw new Error("Failed to load rating history");
            const result = await res.json();
            setData(result);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // Skeleton loading
    if (loading) {
        return (
            <div className="bg-[#151515] rounded-2xl p-5 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <div className="w-32 h-4 bg-white/10 rounded animate-pulse" />
                    <div className="w-16 h-4 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="h-32 bg-white/5 rounded-lg animate-pulse" />
            </div>
        );
    }

    // Error state
    if (error || !data) {
        return (
            <div className="bg-[#151515] rounded-2xl p-5 border border-white/5">
                <div className="text-center py-8">
                    <Activity size={24} className="mx-auto text-white/20 mb-2" />
                    <p className="text-xs text-white/40">Failed to load rating history</p>
                    <button
                        onClick={fetchHistory}
                        className="mt-2 text-xs text-white/50 hover:text-white/80 flex items-center gap-1 mx-auto"
                    >
                        <RefreshCw size={12} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    const history = (data?.history || []).filter(h => h && typeof h === 'object' && typeof h.rating === 'number');
    const current_rating = data?.current_rating || 1200;
    const total_changes = data?.total_changes || 0;
    const { highest_rating, lowest_rating } = data || {};

    // Calculate graph dimensions
    const graphHeight = 120;
    const graphWidth = 100; // percentage
    const padding = 10;

    // Get min/max for scaling
    const ratings = history.map(h => h.rating);
    const minRating = Math.min(...ratings, 1000);
    const maxRating = Math.max(...ratings, 1400);
    const range = maxRating - minRating || 100;

    // Generate SVG path
    const points = history.map((point, idx) => {
        const x = history.length > 1 ? (idx / (history.length - 1)) * 100 : 50;
        const y = graphHeight - padding - ((point.rating - minRating) / range) * (graphHeight - 2 * padding);
        return { x, y, ...point };
    });

    const pathD = points.length > 0
        ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
        : '';

    // Determine trend
    const lastDelta = history.length > 0 ? history[history.length - 1].delta : 0;
    const isPositiveTrend = lastDelta >= 0;

    return (
        <div className="bg-[#151515] rounded-2xl p-5 border border-white/5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-[11px] font-bold text-white/30 tracking-wider">RATING HISTORY</h3>
                    {total_changes > 0 && (
                        <span className="text-[10px] text-white/20">({total_changes} changes)</span>
                    )}
                </div>
                <button
                    onClick={fetchHistory}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                    <RefreshCw size={12} className="text-white/30" />
                </button>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mb-4">
                <div>
                    <p className="text-[10px] text-white/40">Current</p>
                    <p className="text-lg font-bold text-cyan-400">{Math.round(current_rating)}</p>
                </div>
                {highest_rating && (
                    <div>
                        <p className="text-[10px] text-white/40">Highest</p>
                        <p className="text-sm font-bold text-lime-400">{Math.round(highest_rating)}</p>
                    </div>
                )}
                {lowest_rating && (
                    <div>
                        <p className="text-[10px] text-white/40">Lowest</p>
                        <p className="text-sm font-bold text-red-400">{Math.round(lowest_rating)}</p>
                    </div>
                )}
                {lastDelta !== 0 && (
                    <div className="ml-auto flex items-center gap-1">
                        {isPositiveTrend ? (
                            <TrendingUp size={14} className="text-lime-400" />
                        ) : (
                            <TrendingDown size={14} className="text-red-400" />
                        )}
                        <span className={`text-sm font-bold ${isPositiveTrend ? 'text-lime-400' : 'text-red-400'}`}>
                            {lastDelta > 0 ? '+' : ''}{Math.round(lastDelta)}
                        </span>
                    </div>
                )}
            </div>

            {/* Graph */}
            {history.length > 1 ? (
                <div className="relative h-[120px] bg-[#0a0a0a] rounded-lg overflow-hidden border border-white/5">
                    {/* Grid lines */}
                    <div className="absolute inset-0">
                        <div className="absolute top-1/4 left-0 right-0 border-t border-white/5" />
                        <div className="absolute top-1/2 left-0 right-0 border-t border-white/5" />
                        <div className="absolute top-3/4 left-0 right-0 border-t border-white/5" />
                    </div>

                    {/* Rating line */}
                    <svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                    >
                        {/* Gradient fill under the line */}
                        <defs>
                            <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={isPositiveTrend ? "#84cc16" : "#ef4444"} stopOpacity="0.4" />
                                <stop offset="100%" stopColor={isPositiveTrend ? "#84cc16" : "#ef4444"} stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Calculate points with proper padding */}
                        {(() => {
                            const xPad = 5; // 5% padding on each side
                            const yPad = 10; // 10% padding on top/bottom
                            const xRange = 100 - 2 * xPad;
                            const yRange = 100 - 2 * yPad;

                            const calcPoints = history.map((point, idx) => {
                                const x = xPad + (history.length > 1 ? (idx / (history.length - 1)) * xRange : xRange / 2);
                                const y = yPad + yRange - ((point.rating - minRating) / range) * yRange;
                                return { x, y, ...point };
                            });

                            const linePath = calcPoints.length > 0
                                ? `M ${calcPoints[0].x} ${calcPoints[0].y} ` + calcPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
                                : '';

                            if (calcPoints.length === 0) return null;

                            const areaPath = `${linePath} L ${calcPoints[calcPoints.length - 1].x} ${100 - yPad} L ${calcPoints[0].x} ${100 - yPad} Z`;

                            return (
                                <>
                                    {/* Area fill */}
                                    <path d={areaPath} fill="url(#ratingGradient)" />

                                    {/* Line */}
                                    <path
                                        d={linePath}
                                        fill="none"
                                        stroke={isPositiveTrend ? "#84cc16" : "#ef4444"}
                                        strokeWidth="2"
                                        vectorEffect="non-scaling-stroke"
                                    />

                                    {/* Data points */}
                                    {calcPoints.map((point, idx) => (
                                        <circle
                                            key={idx}
                                            cx={point.x}
                                            cy={point.y}
                                            r="4"
                                            fill={point.delta >= 0 ? "#84cc16" : "#ef4444"}
                                            stroke="#0a0a0a"
                                            strokeWidth="1"
                                        />
                                    ))}
                                </>
                            );
                        })()}
                    </svg>

                    {/* Y-axis labels */}
                    <div className="absolute right-2 top-1 text-[9px] text-white/20 font-mono">{Math.round(maxRating)}</div>
                    <div className="absolute right-2 bottom-1 text-[9px] text-white/20 font-mono">{Math.round(minRating)}</div>
                </div>
            ) : (
                <div className="h-[120px] bg-[#0a0a0a] rounded-lg border border-white/5 flex items-center justify-center">
                    <div className="text-center">
                        <Activity size={24} className="mx-auto text-white/10 mb-2" />
                        <p className="text-xs text-white/30">Answer questions to see your rating history</p>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-white/30">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-lime-400" />
                    <span>Correct (+ELO)</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span>Incorrect (-ELO)</span>
                </div>
            </div>
        </div>
    );
}
