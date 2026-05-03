import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { Copy } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ChartRenderer } from './ChartRenderer';

interface MarkdownRendererProps {
    content: string;
    isStreaming?: boolean;
    isLoading?: boolean;
    noCopy?: boolean;
    TypingLoader?: React.ReactNode;
    extraActions?: React.ReactNode;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    isStreaming = false,
    isLoading = false,
    noCopy = false,
    TypingLoader,
    extraActions,
}) => {

    // === COPY-TO-CLIPBOARD ===
    const copyMessage = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        navigator.clipboard.writeText(content);
        toast({ title: 'Copied!', description: 'Message copied to clipboard.' });
    };

    return (
        <div className="group relative w-full min-w-0 rounded-xl overflow-hidden">

            {/* MARKDOWN CONTAINER */}
            <div
                className="
                    prose prose-sm dark:prose-invert max-w-none break-words overflow-x-auto
                    prose-pre:bg-[#1e1e1e] prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-xl prose-pre:overflow-x-auto prose-pre:shadow-lg
                    prose-code:bg-muted prose-code:text-emerald-600 dark:prose-code:text-emerald-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                    prose-p:my-2 prose-p:leading-relaxed prose-p:text-foreground prose-p:break-words
                    prose-headings:font-bold prose-headings:mt-5 prose-headings:mb-2 prose-headings:text-foreground
                    prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-h1:border-border
                    prose-h2:text-xl prose-h3:text-lg
                    prose-ul:my-2 prose-ul:space-y-1 prose-ol:my-2 prose-ol:space-y-1
                    prose-li:my-0.5 prose-li:leading-relaxed prose-li:text-foreground
                    prose-blockquote:border-l-4 prose-blockquote:border-primary/60 prose-blockquote:pl-4 prose-blockquote:italic
                    prose-blockquote:text-muted-foreground
                    prose-blockquote:bg-muted/40
                    prose-blockquote:py-2 prose-blockquote:rounded-r-lg
                    prose-strong:font-bold prose-strong:text-foreground
                    prose-em:italic prose-em:text-foreground
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium
                    prose-img:rounded-xl prose-img:shadow-lg prose-img:my-4
                    prose-hr:border-border prose-hr:my-6
                    "
            >
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeHighlight]}
                    components={{
                        /* ================= CODE ================= */
                        code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const lang = match?.[1];
                            const isInline = !match;

                            // Render chart blocks as interactive charts
                            if (lang === 'chart') {
                                return <ChartRenderer raw={String(children).replace(/\n$/, '')} />;
                            }

                            if (isInline) {
                                return (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            }

                            return (
                                <div className="relative group/code my-4">
                                    {/* COPY CODE BUTTON */}
                                    <div className="absolute right-3 top-3 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(
                                                    String(children).replace(/\n$/, '')
                                                );
                                                toast({
                                                    title: '✓ Copied!',
                                                    description: 'Code copied to clipboard.',
                                                });
                                            }}
                                            className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md font-medium shadow-lg flex items-center gap-1.5"
                                        >
                                            <Copy className="w-3 h-3" />
                                            Copy
                                        </button>
                                    </div>

                                    {/* LANGUAGE LABEL */}
                                    {lang && (
                                        <div className="absolute left-3 top-3 text-xs text-gray-400 font-mono uppercase tracking-wider">
                                            {lang}
                                        </div>
                                    )}

                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                </div>
                            );
                        },

                        /* ================= LINK ================= */
                        a({ href, children }) {
                            return (
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="
                                        inline-flex items-center gap-1 px-2.5 py-1 my-0.5
                                        border border-border bg-background/70 hover:bg-accent rounded-md text-sm font-medium text-primary
                                        transition-all shadow-sm hover:shadow-md no-underline
                                    "
                                >
                                    {children}
                                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            );
                        },

                        /* ================= TABLE ================= */
                        table({ children }) {
                            return (
                                <div className="overflow-x-auto my-3 rounded-lg border border-border shadow-sm">
                                    <table className="w-full min-w-full table-auto border-collapse">
                                        {children}
                                    </table>
                                </div>
                            );
                        },

                        thead({ children }) {
                            return (
                                <thead className="bg-primary/10 dark:bg-primary/20 border-b border-border">
                                    {children}
                                </thead>
                            );
                        },

                        tbody({ children }) {
                            return (
                                <tbody className="divide-y divide-border">
                                    {children}
                                </tbody>
                            );
                        },

                        th({ children }) {
                            return (
                                <th className="px-4 py-2.5 text-left text-xs font-bold text-foreground uppercase tracking-wider whitespace-nowrap border-r border-border/50 last:border-r-0">
                                    {children}
                                </th>
                            );
                        },

                        td({ children }) {
                            const contentStr = String(children);
                            const urlRegex = /(https?:\/\/[^\s]+)/g;
                            return (
                                <td className="px-4 py-2.5 text-sm text-foreground border-r border-border/30 last:border-r-0 whitespace-nowrap">
                                    {urlRegex.test(contentStr)
                                        ? contentStr.split(urlRegex).map((part, i) =>
                                            urlRegex.test(part) ? (
                                                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                                                    {part}
                                                </a>
                                            ) : part
                                        )
                                        : children}
                                </td>
                            );
                        },

                        tr({ children }) {
                            return (
                                <tr className="hover:bg-muted/40 transition-colors">
                                    {children}
                                </tr>
                            );
                        },
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>

            {/* TYPING LOADER */}
            {isStreaming && TypingLoader}

            {/* MESSAGE ACTIONS */}
            {(!isLoading && !isStreaming && (!noCopy || !!extraActions)) && (
                <div className="mt-1 flex items-center gap-1.5">
                    {!noCopy && (
                        <button
                            onClick={(e) => copyMessage(e)}
                            className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                            aria-label="Copy message"
                            title="Copy"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    )}
                    {extraActions}
                </div>
            )}
        </div>
    );
};
