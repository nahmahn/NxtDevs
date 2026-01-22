'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface SuggestionChipsProps {
    suggestions: string[];
    onSelect: (suggestion: string) => void;
    isLoading?: boolean;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ suggestions, onSelect, isLoading }) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
        <div className="flex flex-col space-y-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center text-xs text-gray-500 ml-1 mb-1">
                <Sparkles size={12} className="mr-1 text-orange-400" />
                <span>Try asking...</span>
            </div>

            <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => onSelect(suggestion)}
                        disabled={isLoading}
                        className="text-sm bg-[#1f2937] hover:bg-[#374151] hover:text-white text-gray-300 border border-gray-700 hover:border-orange-500/50 transition-all rounded-full px-4 py-2 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
};
