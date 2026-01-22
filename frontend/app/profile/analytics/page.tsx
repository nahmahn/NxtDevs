"use client";

import { Activity, Brain, Clock, Zap, Target, AlertTriangle, ArrowUpRight, ArrowRight } from "lucide-react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, LineChart, Line } from "recharts";

// Mock Data for Bias Map
const biasData = [
    { x: 20, y: 80, z: 10, name: "Premature Optimization", type: "bias" },
    { x: 50, y: 30, z: 20, name: "Greedy Bias", type: "bias" },
    { x: 80, y: 50, z: 15, name: "Constraint Blindness", type: "bias" },
    { x: 90, y: 90, z: 30, name: "Architect", type: "goal" }, // The ideal state
    { x: 10, y: 20, z: 10, name: "Brute Force", type: "hazard" },
];

// Mock Data for Timeline
const timelineData = [
    { day: "Oct 01", score: 1400 },
    { day: "Oct 05", score: 1450 },
    { day: "Oct 10", score: 1420 },
    { day: "Oct 15", score: 1580 },
    { day: "Oct 20", score: 1650 },
    { day: "Oct 25", score: 1720 },
    { day: "Today", score: 1850 },
];

export default function AnalyticsPage() {
    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white p-8 space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-[#666] mb-2 font-mono">
                    <span>NxtDevs</span>
                    <span>{'>'}</span>
                    <span>Profile</span>
                    <span>{'>'}</span>
                    <span className="text-white">Analytics</span>
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Cognitive Architecture</h1>
                        <p className="text-[#888] max-w-xl">
                            Deep dive into your reasoning patterns, bias detection, and algorithmic intuition.
                        </p>
                    </div>
                    <button className="flex items-center gap-2 bg-lime-400 text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-lime-500 transition-colors">
                        <ArrowUpRight size={18} />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "Current ELO", value: "2140", change: "+12%", icon: Activity, color: "text-lime-400" },
                    { label: "Reasoning Percentile", value: "Top 2%", change: "+0.5%", icon: Target, color: "text-lime-400" },
                    { label: "Pattern Speed", value: "94/100", change: "+4%", icon: Clock, color: "text-lime-400" },
                    { label: "Logical Consistency", value: "88/100", change: "+2%", icon: Brain, color: "text-green-400" },
                ].map((stat, i) => (
                    <div key={i} className="bg-[#151515] border border-[#222] p-5 rounded-xl relative overflow-hidden group hover:border-[#333] transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[#666] text-xs uppercase tracking-wider font-semibold">{stat.label}</span>
                            <stat.icon size={16} className={`${stat.color} opacity-80`} />
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-bold font-mono">{stat.value}</span>
                            <span className="text-xs font-bold text-lime-400 bg-lime-400/10 px-1.5 py-0.5 rounded">
                                {stat.change}
                            </span>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lime-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-3 gap-6 h-[450px]">
                {/* Cognitive Bias Map (2 cols) */}
                <div className="col-span-2 bg-[#151515] border border-[#222] rounded-xl p-6 relative flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Brain size={18} className="text-lime-400" />
                            <h3 className="font-bold">Cognitive Bias Map</h3>
                        </div>
                        <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-lime-500"></span>
                                <span className="text-[#888]">Recent</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#333]"></span>
                                <span className="text-[#888]">Historic</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full relative bg-[#0a0a0a] rounded border border-[#222]">
                        {/* Axis Labels */}
                        <div className="absolute top-4 left-4 text-[10px] text-[#444] uppercase tracking-widest rotate-90 origin-left translate-y-20">
                            Robustness Awareness →
                        </div>
                        <div className="absolute bottom-4 right-4 text-[10px] text-[#444] uppercase tracking-widest">
                            Greedy Bias (Optimization) →
                        </div>

                        {/* Annotations */}
                        <div className="absolute bottom-8 left-8 text-[10px] text-red-500/30 font-bold uppercase">Brute Force</div>
                        <div className="absolute top-8 right-8 text-[10px] text-lime-500/30 font-bold uppercase">Architect</div>

                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <XAxis type="number" dataKey="x" name="stature" hide domain={[0, 100]} />
                                <YAxis type="number" dataKey="y" name="weight" hide domain={[0, 100]} />
                                <ZAxis type="number" dataKey="z" range={[50, 400]} />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-[#1a1a1a] border border-[#333] p-2 rounded text-xs">
                                                    <p className="font-bold text-white">{data.name}</p>
                                                    <p className="text-[#888]">Relevance: {data.z}%</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Scatter name="Biases" data={biasData} fill="#8884d8">
                                    {biasData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.type === 'goal' ? '#84cc16' : entry.type === 'hazard' ? '#ef4444' : '#ffffff'}
                                            fillOpacity={entry.type === 'bias' ? 0.3 : 0.8}
                                        />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Blindspots (1 col) */}
                <div className="col-span-1 space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="font-bold text-sm">Recently Identified Blindspots</h3>
                        <span className="text-[10px] bg-lime-400/10 text-lime-400 px-2 py-0.5 rounded border border-lime-400/20">AI Analysis</span>
                    </div>

                    <div className="space-y-3">
                        {/* Blindspot Item 1 */}
                        <div className="bg-[#151515] border border-[#222] p-4 rounded-xl hover:border-orange-500/30 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={14} className="text-orange-400" />
                                <h4 className="text-sm font-bold text-white">Premature Optimization</h4>
                            </div>
                            <p className="text-xs text-[#888] leading-relaxed mb-3">
                                You tended to select <code className="bg-[#222] px-1 rounded text-orange-200">O(n)</code> solutions when <code className="bg-[#222] px-1 rounded text-blue-200">O(n log n)</code> was required for readability in 3 recent system design questions.
                            </p>
                            <div className="flex gap-2">
                                <span className="text-[10px] bg-[#222] text-[#666] px-2 py-1 rounded uppercase font-bold tracking-wider">Complexity</span>
                                <span className="text-[10px] bg-[#222] text-[#666] px-2 py-1 rounded uppercase font-bold tracking-wider">Clean Code</span>
                            </div>
                        </div>

                        {/* Blindspot Item 2 */}
                        <div className="bg-[#151515] border border-[#222] p-4 rounded-xl hover:border-red-500/30 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap size={14} className="text-red-400" />
                                <h4 className="text-sm font-bold text-white">Concurrency Deadlock</h4>
                            </div>
                            <p className="text-xs text-[#888] leading-relaxed mb-3">
                                Consistently missed race conditions in async/await implementation questions. Review <strong className="text-white">Mutex</strong> patterns.
                            </p>
                            <div className="flex gap-2">
                                <span className="text-[10px] bg-[#222] text-[#666] px-2 py-1 rounded uppercase font-bold tracking-wider">Multi-threading</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Graph */}
            <div className="bg-[#151515] border border-[#222] rounded-xl p-6 h-64">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Performance Timeline</h3>
                    <div className="text-xs bg-[#222] px-3 py-1 rounded text-[#888]">Last 30 Days</div>
                </div>
                <div className="w-full h-full pb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData}>
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#444', fontSize: 10 }}
                                dy={10}
                            />
                            <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#84cc16"
                                strokeWidth={2}
                                dot={{ r: 4, fill: '#1a1a1a', stroke: '#84cc16', strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: '#84cc16' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
