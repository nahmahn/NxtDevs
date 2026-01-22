import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { CheckCircle2, XCircle, Lightbulb, Brain } from 'lucide-react';

interface ExplanationProps {
    content: string;
    isCorrect: boolean;
    ratingUpdate?: {
        old_rating: number;
        new_rating: number;
        delta: number;
    };
}

export function ExplanationView({ content, isCorrect, ratingUpdate }: ExplanationProps) {
    return (
        <div className="mt-6 bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className={`px-4 py-3 flex items-center gap-3 ${isCorrect ? 'bg-lime-500/10 border-b border-lime-500/20' : 'bg-red-500/10 border-b border-red-500/20'}`}>
                {isCorrect ? (
                    <CheckCircle2 size={20} className="text-lime-500" />
                ) : (
                    <XCircle size={20} className="text-red-500" />
                )}
                <span className={`font-bold text-sm ${isCorrect ? 'text-lime-400' : 'text-red-400'}`}>
                    {isCorrect ? "Correct! Well reasoned." : "Incorrect — Let's analyze why"}
                </span>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                    <Lightbulb size={16} className="text-amber-400 mt-1 flex-shrink-0" />
                    <div className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ node, inline, className, children, ...props }: any) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                        <SyntaxHighlighter
                                            style={vscDarkPlus}
                                            language={match[1]}
                                            PreTag="div"
                                            customStyle={{
                                                margin: '0.5rem 0',
                                                padding: '0.75rem',
                                                background: '#111',
                                                borderRadius: '6px',
                                                fontSize: '12px'
                                            }}
                                            {...props}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    ) : (
                                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300 text-xs" {...props}>
                                            {children}
                                        </code>
                                    );
                                },
                                p({ children }) {
                                    return <p className="mb-2 last:mb-0">{children}</p>;
                                },
                                strong({ children }) {
                                    return <strong className="text-white font-semibold">{children}</strong>;
                                },
                                ul({ children }) {
                                    return <ul className="list-disc list-inside space-y-1 ml-2">{children}</ul>;
                                },
                                li({ children }) {
                                    return <li className="text-white/70">{children}</li>;
                                }
                            }}
                        >
                            {content.replace(/\\n/g, '\n')}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Rating Update */}
                {ratingUpdate && (
                    <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                        <Brain size={14} className="text-purple-400" />
                        <span className="text-xs text-white/40 font-mono">
                            ELO: {ratingUpdate.old_rating} → {ratingUpdate.new_rating}
                            <span className={ratingUpdate.delta >= 0 ? " text-lime-500" : " text-red-500"}>
                                {' '}({ratingUpdate.delta > 0 ? '+' : ''}{ratingUpdate.delta})
                            </span>
                        </span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5">
                <span className="text-[10px] text-white/20 font-mono uppercase tracking-wider">
                    NxtDevs Thinking Engine v1.0
                </span>
            </div>
        </div>
    );
}
