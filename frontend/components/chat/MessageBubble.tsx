import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Search, BookOpen, FileText } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import clsx from 'clsx';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
    actions?: string[];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, timestamp, actions }) => {
    const isUser = role === 'user';

    // Format action labels nicely
    const formatAction = (action: string) => {
        if (action.includes("Wikipedia")) return { icon: <BookOpen size={10} />, text: action.replace("Wikipedia:", "Reading:"), color: "text-blue-400" };
        if (action.includes("ArXiv")) return { icon: <FileText size={10} />, text: action.replace("ArXiv:", "Analyzing Paper:"), color: "text-red-400" };
        return { icon: <Search size={10} />, text: action.replace("Used tool: duckduckgo_results_json with input: ", "Web Search: ").replace("Web Search:", "Searching:"), color: "text-orange-400" };
    };

    return (
        <div className={clsx("flex w-full mb-8", isUser ? "justify-end" : "justify-start")}>
            <div className={clsx("flex flex-col max-w-[90%] md:max-w-[80%]", isUser ? "items-end" : "items-start")}>

                <div className={clsx("flex w-full", isUser ? "flex-row-reverse" : "flex-row")}>
                    {/* Avatar */}
                    <div className={clsx(
                        "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-1 text-xs shadow-lg",
                        isUser ? "ml-4 bg-gradient-to-br from-orange-500 to-red-600 text-white border border-white/10" : "mr-4 bg-[#1a1a1c] text-white/50 border border-white/5"
                    )}>
                        {isUser ? <User size={14} /> : <div className="relative"><Bot size={16} /><div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" /></div>}
                    </div>

                    <div className="flex flex-col space-y-2 flex-1 overflow-hidden">
                        {/* Agent Actions Log */}
                        {!isUser && actions && actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2 ml-1">
                                {actions.map((action, i) => {
                                    const { icon, text, color } = formatAction(action);
                                    return (
                                        <div key={i} className="flex items-center space-x-1.5 text-[10px] text-zinc-400 bg-black/40 rounded-full px-3 py-1 border border-white/5 self-start backdrop-blur-sm">
                                            <span className={color}>{icon}</span>
                                            <span className="font-medium opacity-80">{text}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Message Content */}
                        <div className={clsx(
                            "rounded-2xl p-5 shadow-sm overflow-hidden text-sm",
                            isUser
                                ? "bg-gradient-to-br from-orange-600 to-red-700 text-white rounded-tr-sm shadow-orange-900/20 shadow-lg border border-white/10"
                                : "bg-[#141415] border border-white/5 text-slate-300 rounded-tl-sm shadow-xl"
                        )}>
                            {isUser ? (
                                <p className="whitespace-pre-wrap leading-relaxed font-normal tracking-wide">{content}</p>
                            ) : (
                                <div className="prose prose-invert prose-sm max-w-none 
                                    prose-p:leading-7 prose-p:text-slate-300 prose-p:my-3
                                    prose-headings:text-orange-400 prose-headings:font-semibold prose-headings:mt-5 prose-headings:mb-2
                                    prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                                    prose-strong:text-white prose-strong:font-semibold
                                    prose-ul:my-3 prose-li:my-1 prose-li:text-slate-300
                                    prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-white/5 prose-pre:p-0 
                                    prose-code:text-orange-300
                                    prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                                ">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            // Custom paragraph with proper spacing
                                            p: ({ children }) => (
                                                <p className="text-slate-300 leading-7 my-3">{children}</p>
                                            ),
                                            // Style bold text that looks like headers (e.g., "Approach 1:")
                                            strong: ({ children }) => {
                                                const text = String(children);
                                                // If it looks like a section header, style it specially
                                                if (text.includes(':') && text.length < 100) {
                                                    return <span className="block text-orange-400 font-bold text-base mt-5 mb-2">{children}</span>;
                                                }
                                                return <strong className="text-white font-semibold">{children}</strong>;
                                            },
                                            code({ node, inline, className, children, ...props }: any) {
                                                const match = /language-(\w+)/.exec(className || '');
                                                return !inline && match ? (
                                                    <div className="rounded-lg overflow-hidden my-4 border border-white/5 bg-[#0a0a0a] shadow-inner">
                                                        <div className="flex items-center justify-between px-4 py-2 bg-[#1f1f22] border-b border-white/5">
                                                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{match[1]}</span>
                                                        </div>
                                                        <SyntaxHighlighter
                                                            {...props}
                                                            style={atomDark}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            customStyle={{ margin: 0, padding: '1.25rem', background: 'transparent' }}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    </div>
                                                ) : (
                                                    <code {...props} className={clsx("bg-[#1f1f22] rounded px-1.5 py-0.5 text-orange-200 font-mono text-xs border border-white/5", className)}>
                                                        {children}
                                                    </code>
                                                );
                                            }
                                        }}
                                    >
                                        {content}
                                    </ReactMarkdown>
                                </div>
                            )}

                            {/* Timestamp */}
                            {timestamp && (
                                <div className={clsx("text-[9px] mt-3 font-medium tracking-wider uppercase opacity-40", isUser ? "text-right text-white" : "text-left text-slate-500")}>
                                    {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
