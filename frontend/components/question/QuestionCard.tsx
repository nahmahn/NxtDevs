"use client";

import { useState, useMemo } from "react";
import { Check, X, Sparkles, Clock, Code2, AlignLeft, Layers, Terminal, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface QuestionData {
    id: string;
    content: string;
    options: { id: string; content: string }[];
    difficulty_tier: number;
    active_constraints: Record<string, string>;
}

interface QuestionCardProps {
    question: QuestionData;
    onSubmit: (optionId: string) => void;
    submissionResult?: {
        is_correct?: boolean;
        isCorrect?: boolean;
        explanation?: string;
        correct_option_id?: string;
        rating_update?: {
            old_rating: number;
            new_rating: number;
            delta: number;
        };
    } | null;
    onNext?: () => void;
}

export function QuestionCard({ question, onSubmit, submissionResult, onNext }: QuestionCardProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const isSubmitted = !!submissionResult;

    // Reset loading when result comes in
    if (submissionResult && isLoading) {
        setIsLoading(false);
    }

    const handleSubmit = () => {
        if (selectedId && !isSubmitted && !isLoading) {
            setIsLoading(true);
            onSubmit(selectedId);
        } else if (isSubmitted && onNext) {
            setSelectedId(null);
            onNext();
        }
    };

    // --- Content Parsing Logic ---
    const parsedContent = useMemo(() => {
        const raw = (question.content || "").replace(/\\n/g, '\n');

        const sections = {
            title: "Question",
            context: "",
            scenario: "",
            code: "",
            systemConstraints: "",
            body: ""
        };

        if (!raw.trim()) {
            return sections;
        }

        // Extract title from first line if it's a # header
        const lines = raw.split('\n');
        let contentStartIndex = 0;

        if (lines[0].startsWith('# ')) {
            sections.title = lines[0].substring(2).trim();
            contentStartIndex = 1;
        } else if (lines[0].startsWith('## ')) {
            // First line is a ## header - use it as title
            sections.title = lines[0].substring(3).trim();
            contentStartIndex = 1;
        }

        // Check if it has Context/Scenario format (old structured questions)
        const hasContext = raw.includes("## Context");
        const hasScenario = raw.includes("## Scenario");

        if (hasContext || hasScenario) {
            // Structured content with ## headers
            const extractSection = (header: string) => {
                const regex = new RegExp(`## ${header}\\s+([\\s\\S]*?)(?=(## |$))`, 'i');
                const match = raw.match(regex);
                return match ? match[1].trim() : "";
            };

            sections.context = extractSection("Context");
            sections.scenario = extractSection("Scenario");
            sections.systemConstraints = extractSection("System Constraints");

            const codeRegex = /```[\s\S]*?```/g;
            const codeMatch = raw.match(codeRegex);
            if (codeMatch) {
                sections.code = codeMatch[0];
                sections.scenario = sections.scenario.replace(codeMatch[0], "").trim();
            }
        } else {
            // Simple format - treat everything after title as body
            sections.body = lines.slice(contentStartIndex).join('\n').trim();

            // Extract code blocks if present
            const codeRegex = /```[\s\S]*?```/g;
            const codeMatch = sections.body.match(codeRegex);
            if (codeMatch) {
                sections.code = codeMatch[0];
                sections.body = sections.body.replace(codeMatch[0], "").trim();
            }
        }

        return sections;
    }, [question.content]);


    // Error handling
    if (!question.options || question.options.length === 0) {
        return (
            <div className="p-8 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400">Error: Missing Options</p>
                {onNext && <button onClick={onNext} className="mt-4 text-white">Skip</button>}
            </div>
        );
    }

    const optionLabels = ['A', 'B', 'C', 'D'];

    // Normalize the isCorrect field (backend sends is_correct)
    const isCorrect = submissionResult?.is_correct ?? submissionResult?.isCorrect;

    return (
        <div className="w-full flex gap-5 items-stretch h-[calc(100vh-140px)]">
            {/* Left Column: Problem Description */}
            <div className="flex-1 flex flex-col bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                {/* Terminal Header */}
                <div className="h-10 bg-[#1a1a1a] border-b border-white/5 flex items-center px-4 justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                        </div>
                        <div className="ml-4 flex items-center gap-2 text-xs font-mono text-white/40 bg-[#111] px-3 py-1 rounded-md border border-white/5">
                            <Terminal size={12} />
                            <span>problem.md</span>
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                        Read-Only
                    </div>
                </div>

                {/* Terminal Content */}
                <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed text-gray-300" style={{ scrollbarWidth: 'none' }}>
                    <div className="max-w-prose">
                        <h2 className="text-lg font-bold text-white mb-4">{parsedContent.title}</h2>

                        {/* Main Content: Body or Scenario */}
                        {(parsedContent.body || parsedContent.scenario || parsedContent.context) && (
                            <div className="space-y-4">
                                {parsedContent.context && (
                                    <div className="text-white/70">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsedContent.context}</ReactMarkdown>
                                    </div>
                                )}
                                {(parsedContent.scenario || parsedContent.body) && (
                                    <div className="text-white/80">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code({ node, inline, className, children, ...props }: any) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    // Block code with language
                                                    if (!inline && match) {
                                                        return (
                                                            <SyntaxHighlighter
                                                                style={vscDarkPlus}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                customStyle={{ margin: '1rem 0', padding: '1rem', background: '#111', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px' }}
                                                                {...props}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        );
                                                    }
                                                    // Inline code
                                                    return (
                                                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-lime-300" {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                // Handle pre tags to avoid nesting issues
                                                pre({ children, ...props }: any) {
                                                    return (
                                                        <div className="bg-[#111] p-4 rounded-lg my-4 overflow-x-auto font-mono text-sm text-lime-300" {...props}>
                                                            {children}
                                                        </div>
                                                    );
                                                },
                                                // Ensure p doesn't wrap block elements
                                                p({ children, ...props }: any) {
                                                    return <div className="mb-2" {...props}>{children}</div>;
                                                }
                                            }}
                                        >
                                            {parsedContent.scenario || parsedContent.body}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Code Block */}
                        {parsedContent.code && (
                            <div className="mt-6 bg-[#111] border border-white/5 rounded-lg overflow-hidden">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '')
                                            return !inline && match ? (
                                                <SyntaxHighlighter
                                                    style={vscDarkPlus}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px' }}
                                                    {...props}
                                                >
                                                    {String(children).replace(/\n$/, '')}
                                                </SyntaxHighlighter>
                                            ) : (
                                                <code className={className} {...props}>{children}</code>
                                            )
                                        }
                                    }}
                                >
                                    {parsedContent.code}
                                </ReactMarkdown>
                            </div>
                        )}

                        {/* Constraints */}
                        {(parsedContent.systemConstraints || Object.keys(question.active_constraints || {}).length > 0) && (
                            <div className="mt-6 pt-4 border-t border-white/5">
                                <h3 className="text-orange-400 font-bold text-xs uppercase tracking-wider mb-3">Constraints</h3>
                                {parsedContent.systemConstraints && (
                                    <div className="text-white/60 text-xs mb-3">
                                        <ReactMarkdown>{parsedContent.systemConstraints}</ReactMarkdown>
                                    </div>
                                )}
                                {Object.keys(question.active_constraints || {}).length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(question.active_constraints).map(([key, value]) => (
                                            <span key={key} className="text-xs font-mono text-white/50 bg-white/5 px-2 py-1 rounded">
                                                {key}: <span className="text-cyan-400">{value}</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Options & Result */}
            <div className="w-[480px] flex flex-col space-y-3">
                {/* Options Panel */}
                <div className="flex-1 bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col">
                    <div className="h-10 bg-[#1a1a1a] border-b border-white/5 flex items-center px-4 justify-between shrink-0">
                        <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Select Answer</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] text-green-500 font-mono">Ready</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: 'none' }}>
                        {question.options.map((opt, idx) => {
                            const isSelected = selectedId === opt.id;
                            const isCorrect = submissionResult?.correct_option_id === opt.id;
                            const isWrong = isSubmitted && isSelected && !isCorrect;
                            const displayContent = opt.content.replace(/\\n/g, '\n');

                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => !isSubmitted && setSelectedId(opt.id)}
                                    disabled={isSubmitted}
                                    className={`
                                        w-full p-3 rounded-lg border text-left transition-all font-mono text-sm
                                        ${isSubmitted && isCorrect
                                            ? 'bg-lime-900/30 border-lime-500/50 text-lime-200'
                                            : isWrong
                                                ? 'bg-red-900/30 border-red-500/50 text-red-200'
                                                : isSelected
                                                    ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-100'
                                                    : 'bg-[#111] border-white/5 text-white/70 hover:bg-[#1a1a1a] hover:border-white/20'
                                        }
                                        ${isSubmitted ? 'cursor-default' : 'cursor-pointer'}
                                    `}
                                >
                                    <div className="flex gap-3 items-center">
                                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 
                                            ${isSubmitted && isCorrect ? 'bg-lime-500 text-black' :
                                                isWrong ? 'bg-red-500 text-white' :
                                                    isSelected ? 'bg-cyan-500 text-black' :
                                                        'bg-white/10 text-white/50'}`}>
                                            {isSubmitted && isCorrect ? <Check size={12} /> : isWrong ? <X size={12} /> : optionLabels[idx]}
                                        </span>
                                        <span className="whitespace-pre-wrap">{displayContent}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Submit Button */}
                    <div className="p-4 bg-[#111] border-t border-white/5">
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedId || isLoading}
                            className={`
                                w-full py-3 rounded-lg font-mono text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2
                                ${!selectedId || isLoading
                                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                    : isSubmitted
                                        ? 'bg-lime-500 text-black'
                                        : 'bg-white text-black hover:bg-gray-200'
                                }
                            `}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Analyzing...</span>
                                </>
                            ) : isSubmitted ? (
                                onNext ? "Next Question" : "Done"
                            ) : (
                                "Submit"
                            )}
                        </button>
                    </div>
                </div>

                {/* Explanation Panel */}
                {isSubmitted && submissionResult && (
                    <div className="bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-[250px] animate-in slide-in-from-bottom-2">
                        <div className="h-8 bg-[#1a1a1a] border-b border-white/5 flex items-center px-4 shrink-0">
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Result</span>
                        </div>
                        <div className="overflow-y-auto p-4 font-mono text-xs text-white/70 leading-relaxed max-h-[200px]" style={{ scrollbarWidth: 'none' }}>
                            <div className={`mb-2 font-bold ${isCorrect ? "text-lime-500" : "text-red-500"}`}>
                                {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
                            </div>
                            <div className="text-white/60">
                                <ReactMarkdown>{submissionResult?.explanation || ""}</ReactMarkdown>
                            </div>
                            {submissionResult?.rating_update && (
                                <div className="mt-2 pt-2 border-t border-white/5 text-white/40">
                                    ELO: {submissionResult.rating_update?.old_rating} {'->'} {submissionResult.rating_update?.new_rating}
                                    <span className={submissionResult.rating_update?.delta >= 0 ? " text-lime-500" : " text-red-500"}>
                                        {' '}({submissionResult.rating_update?.delta > 0 ? '+' : ''}{submissionResult.rating_update?.delta})
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
