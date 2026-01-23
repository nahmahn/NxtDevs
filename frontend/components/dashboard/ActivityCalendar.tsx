"use client";

import { useState } from "react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isSameDay, isToday, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";

interface ActivityCalendarProps {
    calendar: Record<string, number>; // timestamp -> count
}

export function ActivityCalendar({ calendar }: ActivityCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    if (!calendar) return null;

    // Convert timestamp dictionary to Map for fast lookup
    const dataMap = new Map<string, number>();
    Object.entries(calendar).forEach(([ts, count]) => {
        const date = new Date(parseInt(ts) * 1000);
        const key = format(date, 'yyyy-MM-dd');
        dataMap.set(key, count);
    });

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Calculate stats for this month
    const thisMonthKeys = eachDayOfInterval({ start: monthStart, end: monthEnd }).map(d => format(d, 'yyyy-MM-dd'));
    const totalSolvesInMonth = thisMonthKeys.reduce((acc, key) => acc + (dataMap.get(key) || 0), 0);

    return (
        <div className="bg-[#151515] rounded-3xl p-5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                        className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                        className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-[10px] font-bold text-white/20 uppercase">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const count = dataMap.get(dateKey) || 0;
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const isTodayDate = isToday(day);

                    return (
                        <div
                            key={i}
                            className={`
                                aspect-square rounded-full flex items-center justify-center relative group
                                ${!isCurrentMonth ? 'opacity-10' : ''}
                                ${count > 0 ? 'bg-[#ffa116] text-black font-bold shadow-[0_0_10px_rgba(255,161,22,0.3)]' : 'text-white/30 hover:bg-white/5'}
                                ${isTodayDate && count === 0 ? 'bg-white/10 text-white font-bold' : ''}
                                transition-all text-[10px] cursor-default
                            `}
                        >
                            {format(day, 'd')}

                            {/* Tooltip */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-black/90 border border-white/20 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap z-20 pointer-events-none">
                                {count} solves
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Total Solves</div>
                <div className="text-sm font-black text-white">{totalSolvesInMonth}</div>
            </div>
        </div>
    );
}
