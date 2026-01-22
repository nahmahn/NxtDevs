"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
    value: string | number;
    label: string;
}

interface CustomSelectProps {
    value: string | number;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    icon?: React.ReactNode;
    label?: string;
}

export default function CustomSelect({ value, onChange, options, placeholder = "Select...", icon, label }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="space-y-2" ref={containerRef}>
            {label && (
                <label className="flex items-center gap-2 text-[11px] font-bold text-white/40 uppercase tracking-wider">
                    {icon}
                    {label}
                </label>
            )}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-left flex items-center justify-between transition-colors hover:bg-white/5 ${isOpen ? 'border-white/20' : ''
                        }`}
                >
                    <span className={`text-sm ${selectedOption ? 'text-white' : 'text-white/40'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown size={16} className={`text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-xl max-h-60 overflow-y-auto">
                        {options.length > 0 ? (
                            <div className="p-1.5">
                                {options.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            onChange(option.value.toString());
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${option.value === value
                                                ? 'bg-white/10 text-white'
                                                : 'text-white/60 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <span>{option.label}</span>
                                        {option.value === value && <Check size={14} className="text-cyan-400" />}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-xs text-white/40">
                                No options available
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
