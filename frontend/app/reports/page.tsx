'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Download, RefreshCw, Clock, CheckCircle, XCircle,
    TrendingUp, BarChart2, Calendar, Eye, Zap, Target, BookOpen, AlertTriangle, X
} from 'lucide-react';
import { reportsApi, Report } from '@/lib/api/reports';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Cell
} from 'recharts';

// Animation Components
import SpotlightCard from '@/components/ui/SpotlightCard';
import CountUp from '@/components/ui/CountUp';
import BlurText from '@/components/ui/BlurText';

// --- Components ---

const ReportViewer = ({ report, onClose }: { report: Report; onClose: () => void }) => {
    if (!report.report_data) return null;
    const { topic_performance, difficulty_performance, insights, charts, period } = report.report_data;

    // ... data prep ...
    const diffData = Object.entries(difficulty_performance || {}).map(([subject, data]) => ({
        subject,
        A: data.accuracy || 0,
        fullMark: 100
    }));

    // Map backend trend data (date, accuracy) to chart format
    const trendData = charts?.accuracy_trend?.map(d => ({
        name: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        accuracy: d.accuracy
    })) || [];

    // Calculate Summary Stats from raw data
    const totalQs = Object.values(topic_performance || {}).reduce((acc, t) => acc + t.total_questions, 0);
    const totalCorrect = Object.values(topic_performance || {}).reduce((acc, t) => acc + t.correct_answers, 0);
    const totalIncorrect = totalQs - totalCorrect;
    const accuracy = insights?.overall_accuracy || 0;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#09090b] w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#09090b]/95 backdrop-blur z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <FileText className="text-orange-500" />
                            Performance Report
                            <span className="text-sm font-normal text-zinc-500 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                                #{report.id.slice(0, 8)}
                            </span>
                        </h2>
                        <p className="text-zinc-500 text-sm mt-1">Generated on {new Date(report.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={async () => {
                                try {
                                    const blob = await reportsApi.downloadReport(report.id);
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `report_${report.id.slice(0, 8)}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);
                                } catch (e) {
                                    alert('Failed to download report');
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-white cursor-pointer"
                        >
                            <Download size={16} /> Download PDF
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Summary Stats with Animations */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Overall Accuracy', value: accuracy, suffix: '%', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                            { label: 'Correct Answers', value: totalCorrect, suffix: '', color: 'text-green-400', bg: 'bg-green-500/10' },
                            { label: 'Incorrect Answers', value: totalIncorrect, suffix: '', color: 'text-red-400', bg: 'bg-red-500/10' },
                            { label: 'Total Questions', value: totalQs, suffix: '', color: 'text-purple-400', bg: 'bg-purple-500/10' }
                        ].map((stat, i) => (
                            <SpotlightCard key={i} className={`!p-5 !rounded-2xl !border-white/5 ${stat.bg} relative overflow-hidden group`}>
                                <div className={`text-sm font-medium opacity-80 ${stat.color} relative z-10`}>{stat.label}</div>
                                <div className="text-3xl font-bold text-white mt-1 relative z-10">
                                    <CountUp
                                        to={stat.value}
                                        duration={1.5}
                                        separator=","
                                        className="tabular-nums"
                                    />
                                    {stat.suffix}
                                </div>
                            </SpotlightCard>
                        ))}
                    </div>

                    {/* Overall Assessment Banner */}
                    <SpotlightCard className="!p-6 !rounded-2xl !bg-gradient-to-r from-orange-500/5 to-pink-500/5 !border-white/10" spotlightColor="rgba(249, 115, 22, 0.1)">
                        <h3 className="font-semibold text-white mb-2 flex items-center gap-2 relative z-10">
                            <Zap size={18} className="text-orange-400" /> Assessment
                        </h3>
                        <div className="text-lg text-zinc-200 relative z-10 leading-relaxed">
                            <BlurText
                                text={insights?.overall_assessment || "No assessment available."}
                                delay={0.02}
                                animateBy="words"
                                className="inline"
                            />
                        </div>
                    </SpotlightCard>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Trend Chart */}
                        <div className="p-6 rounded-2xl bg-[#0e0e10] border border-white/5">
                            <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
                                <TrendingUp size={18} className="text-orange-500" /> Accuracy Trend
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', color: '#fff' }} />
                                        <Area type="monotone" dataKey="accuracy" stroke="#f97316" fillOpacity={1} fill="url(#colorAcc)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Difficulty Radar */}
                        <div className="p-6 rounded-2xl bg-[#0e0e10] border border-white/5">
                            <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
                                <Target size={18} className="text-cyan-500" /> Difficulty Mastery
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={diffData}>
                                        <PolarGrid stroke="#333" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Accuracy" dataKey="A" stroke="#06b6d4" strokeWidth={2} fill="#06b6d4" fillOpacity={0.3} />
                                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', color: '#fff' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Analysis & Recs */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SpotlightCard className="!p-6 !rounded-2xl !bg-[#0e0e10] !border-white/5">
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2 relative z-10">
                                <BarChart2 size={18} className="text-violet-400" /> Topic Breakdown
                            </h3>
                            <div className="space-y-4 relative z-10">
                                {Object.entries(topic_performance || {}).map(([topic, data], i) => (
                                    <div key={i} className="flex flex-col gap-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-300 capitalize">{topic.replace(/_/g, ' ')}</span>
                                            <span className="text-zinc-400">{Math.round(data.accuracy)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${data.accuracy}%` }}
                                                transition={{ duration: 1, delay: 0.2 + (i * 0.1) }}
                                                className={`h-full rounded-full ${data.accuracy >= 80 ? 'bg-green-500' :
                                                    data.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SpotlightCard>

                        <div className="space-y-4 text-zinc-300">
                            <SpotlightCard className="!p-6 !rounded-2xl !bg-[#0e0e10] !border-white/5" spotlightColor="rgba(251, 191, 36, 0.1)">
                                <h3 className="font-semibold text-white flex items-center gap-2 mb-4 relative z-10">
                                    <BookOpen size={18} className="text-amber-400" /> Recommendations
                                </h3>
                                <ul className="space-y-2 list-disc pl-4 marker:text-amber-500/50 relative z-10">
                                    {insights?.recommendations?.map((rec, i) => (
                                        <li key={i} className="text-sm">
                                            <BlurText text={rec} delay={0.01} duration={0.5} />
                                        </li>
                                    ))}
                                    {(!insights?.recommendations || insights.recommendations.length === 0) && (
                                        <li className="text-zinc-500 italic text-sm list-none">No specific recommendations.</li>
                                    )}
                                </ul>
                            </SpotlightCard>

                            <SpotlightCard className="!p-6 !rounded-2xl !bg-[#0e0e10] !border-white/5" spotlightColor="rgba(34, 197, 94, 0.1)">
                                <h3 className="font-semibold text-white flex items-center gap-2 mb-4 relative z-10">
                                    <CheckCircle size={18} className="text-green-400" /> Key Strengths
                                </h3>
                                <div className="flex flex-wrap gap-2 relative z-10">
                                    {insights?.strengths?.map((str, i) => (
                                        <motion.span
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.5 + (i * 0.1) }}
                                            key={i}
                                            className="px-3 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs border border-green-500/20"
                                        >
                                            {str}
                                        </motion.span>
                                    ))}
                                    {(!insights?.strengths || insights.strengths.length === 0) && (
                                        <span className="text-zinc-500 italic text-sm">Keep practicing to identify strengths.</span>
                                    )}
                                </div>
                            </SpotlightCard>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [viewingReport, setViewingReport] = useState<Report | null>(null);

    const fetchReports = async () => {
        try {
            const data = await reportsApi.getReports();
            setReports(data.reports);
        } catch (err) {
            console.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
        const interval = setInterval(fetchReports, 5000); // Poll faster for updates
        return () => clearInterval(interval);
    }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await reportsApi.generateReport('performance_summary');
            await fetchReports();
        } catch (err) {
            alert('Failed to start generation');
        } finally {
            setGenerating(false);
        }
    };

    const handleViewReport = async (report: Report) => {
        if (report.status !== 'GENERATED') return;

        // If we already have the data locally (which we might not if list endpoint is light), just use it.
        // Assuming list endpoint might be light, let's fetch details to be sure.
        try {
            const detailed = await reportsApi.getReport(report.id);
            console.log("Detailed Report:", detailed); // Debug log
            setViewingReport(detailed);
        } catch (e) {
            alert("Failed to load details");
        }
    }

    return (
        <div className="flex h-screen w-full bg-[#09090b] overflow-hidden font-sans text-slate-300 selection:bg-orange-500/30">
            <Sidebar />

            <main className="flex-1 overflow-y-auto ml-[70px] relative">
                <div className="max-w-7xl mx-auto p-8 space-y-10">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Analytics & Reports</h1>
                            <p className="text-zinc-400 text-lg">Deep dive into your learning patterns and mastery.</p>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${generating
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : 'bg-orange-600 text-white hover:bg-orange-700 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
                                }`}
                        >
                            {generating ? <RefreshCw className="animate-spin" size={20} /> : <FileText size={20} />}
                            {generating ? 'Analyzing...' : 'Generate New Analysis'}
                        </button>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Total Reports', value: reports.length, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                            { label: 'Completed Analysis', value: reports.filter(r => r.status === 'GENERATED').length, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
                            { label: 'Pending Processing', value: reports.filter(r => r.status === 'PENDING' || r.status === 'GENERATING').length, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                        ].map((stat, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-[#0e0e10] border border-white/5 flex items-center gap-4 hover:border-white/10 transition-colors">
                                <div className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-zinc-500 uppercase tracking-widest">{stat.label}</div>
                                    <div className="text-3xl font-bold text-white mt-1">{stat.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Reports List */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Clock size={20} className="text-zinc-500" /> Recent Reports
                        </h3>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-20 w-full bg-white/5 rounded-2xl animate-pulse" />)}
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="p-20 text-center rounded-3xl border border-dashed border-white/10 bg-white/5">
                                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                                    <FileText className="text-zinc-500" size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-white">No reports yet</h3>
                                <p className="text-zinc-500 mt-2">Generate your first report to see detailed analysis.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {reports.map((report) => (
                                    <div
                                        key={report.id}
                                        onClick={() => handleViewReport(report)}
                                        className={`group p-5 rounded-2xl bg-[#0e0e10] border border-white/5 transition-all flex items-center justify-between
                                            ${report.status === 'GENERATED' ? 'hover:border-orange-500/30 hover:bg-orange-500/5 cursor-pointer' : ''}
                                        `}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${report.status === 'GENERATED' ? 'bg-green-500 text-green-500' :
                                                report.status === 'FAILED' ? 'bg-red-500 text-red-500' :
                                                    'bg-orange-500 text-orange-500 animate-pulse'
                                                }`} />
                                            <div>
                                                <div className="font-bold text-white text-lg group-hover:text-orange-400 transition-colors">
                                                    Performance Report <span className="text-zinc-600 font-normal">#{report.id.slice(0, 6)}</span>
                                                </div>
                                                <div className="text-sm text-zinc-500 flex items-center gap-3 mt-1">
                                                    <Calendar size={14} />
                                                    {new Date(report.created_at).toLocaleDateString('en-IN', {
                                                        timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                    <span className="uppercase tracking-wider text-[10px] font-semibold">{report.report_type}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span className={`px-3 py-1 text-xs rounded-full font-medium border ${report.status === 'GENERATED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                report.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                }`}>
                                                {report.status}
                                            </span>
                                            {report.status === 'GENERATED' && (
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
                                                    <Eye size={20} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Viewer */}
                <AnimatePresence>
                    {viewingReport && (
                        <ReportViewer
                            report={viewingReport}
                            onClose={() => setViewingReport(null)}
                        />
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
