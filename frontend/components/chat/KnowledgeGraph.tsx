'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface KnowledgeGraphProps {
    stats: Record<string, { accuracy: number; status: string }>;
}

export function KnowledgeGraph({ stats }: KnowledgeGraphProps) {
    const topics = Object.entries(stats).sort((a, b) => b[1].accuracy - a[1].accuracy);

    if (topics.length === 0) {
        return (
            <div className="h-40 flex items-center justify-center border border-white/5 rounded-xl bg-white/5 text-white/40 text-sm">
                No data yet
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {topics.map(([topic, data], index) => (
                <div key={topic} className="group">
                    <div className="flex justify-between text-xs mb-1 text-white/60 group-hover:text-white transition-colors">
                        <span>{topic}</span>
                        <span>{Math.round(data.accuracy)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${data.accuracy}%` }}
                            transition={{ duration: 1, delay: index * 0.1 }}
                            className={`h-full rounded-full ${data.accuracy > 80 ? 'bg-green-500' :
                                data.accuracy < 50 ? 'bg-red-500' : 'bg-yellow-500'
                                }`}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
