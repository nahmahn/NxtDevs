"use client";

import { Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, getDay, startOfWeek, eachDayOfInterval, startOfYear, endOfYear, parseISO, isSameDay, addDays } from "date-fns";

interface HeatmapProps {
    calendar: Record<string, number>; // timestamp -> count
}

export function SubmissionHeatmap({ calendar }: HeatmapProps) {
    if (!calendar) return null;

    // Determine date range dynamically based on data
    const today = new Date();

    // Find keys and determine active range
    const timestamps = Object.keys(calendar).map(k => parseInt(k));
    const lastActiveTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : today.getTime() / 1000;
    const lastActiveDate = new Date(lastActiveTimestamp * 1000);

    // Default to showing the 6 months leading up to the LAST activity 
    // This fixed the issue where old data resulted in an empty graph
    const startDate = subDays(lastActiveDate, 180);

    // Normalize data
    const dataMap = new Map<string, number>();
    Object.entries(calendar).forEach(([ts, count]) => {
        const date = new Date(parseInt(ts) * 1000);
        if (date >= startDate && date <= addDays(lastActiveDate, 1)) {
            const key = format(date, 'yyyy-MM-dd');
            dataMap.set(key, count);
        }
    });

    // Generate grid
    const dates = eachDayOfInterval({
        start: startOfWeek(startDate),
        end: lastActiveDate
    });

    const weeks: Array<Array<{ date: Date, count: number }>> = [];
    let currentWeek: Array<{ date: Date, count: number }> = [];

    dates.forEach(date => {
        if (getDay(date) === 0 && currentWeek.length > 0) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
        const key = format(date, 'yyyy-MM-dd');
        currentWeek.push({
            date,
            count: dataMap.get(key) || 0
        });
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);

    // Advanced Insight Logic
    const analyzeConsistency = () => {
        const totalDays = weeks.flat().length;
        const activeDays = weeks.flat().filter(d => d.count > 0).length;
        const consistency = (activeDays / totalDays) * 100;

        if (consistency < 10) return "Intermittent Solver - Try to solve at least 1 easy problem daily to build a habit.";
        if (consistency < 40) return "Weekend Warrior - You tend to spike in activity but have gaps. Consistency > Intensity.";
        return "Discipline Master - Your daily streak is impressive. Keep pushing the difficulty.";
    };

    // Color scale
    const getColor = (count: number) => {
        if (count === 0) return "bg-white/5";
        if (count <= 2) return "bg-[#ffa116]/30";
        if (count <= 5) return "bg-[#ffa116]/60";
        return "bg-[#ffa116]";
    };

    return (
        <div className="bg-[#151515] rounded-3xl p-6 border border-white/5 overflow-x-auto">
            <div className="flex justify-between items-end mb-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">
                    Consistency Graph
                    <span className="ml-2 opacity-50 font-normal normal-case">
                        (Showing 6 months ending {format(lastActiveDate, 'MMM yyyy')})
                    </span>
                </h3>
                <span className="text-[10px] font-bold text-[#ffa116] bg-[#ffa116]/10 px-2 py-0.5 rounded-lg border border-[#ffa116]/20">
                    {analyzeConsistency()}
                </span>
            </div>

            <div className="flex gap-1 min-w-max">
                {weeks.map((week, i) => (
                    <div key={i} className="flex flex-col gap-1">
                        {week.map((day, j) => (
                            <div
                                key={j}
                                className={`w-3 h-3 rounded-sm ${getColor(day.count)} hover:ring-1 hover:ring-white transition-all cursor-help relative group`}
                            >
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-black border border-white/20 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                    {day.count} solves on {format(day.date, 'MMM d')}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 mt-4 text-[10px] text-white/30 justify-end">
                <span>Less</span>
                <div className="w-3 h-3 bg-white/5 rounded-sm" />
                <div className="w-3 h-3 bg-[#ffa116]/30 rounded-sm" />
                <div className="w-3 h-3 bg-[#ffa116]/60 rounded-sm" />
                <div className="w-3 h-3 bg-[#ffa116] rounded-sm" />
                <span>More</span>
            </div>
        </div>
    );
}
