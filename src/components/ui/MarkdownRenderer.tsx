import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { Copy } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface MarkdownRendererProps {
    content: string;
    isStreaming?: boolean;
    isLoading?: boolean;
    TypingLoader?: React.ReactNode;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    isStreaming = false,
    isLoading = false,
    TypingLoader,
}) => {

    // === COPY-TO-CLIPBOARD ===
    const copyMessage = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied!', description: 'Message copied to clipboard.' });
    };

    return (
        <div className="group relative w-full min-w-0 rounded-xl overflow-hidden">

            {/* MARKDOWN CONTAINER */}
            <div
                className="
          prose prose-sm dark:prose-invert max-w-none break-words overflow-x-auto
          prose-pre:bg-[#1e1e1e] prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-xl prose-pre:overflow-x-auto prose-pre:shadow-lg
          prose-code:bg-gray-800/80 prose-code:text-emerald-400 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
          prose-p:my-3 prose-p:leading-relaxed prose-p:text-base prose-p:break-words
          prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3 prose-headings:text-foreground
          prose-h1:text-3xl prose-h1:border-b prose-h1:pb-2 prose-h2:text-2xl prose-h3:text-xl
          prose-ul:my-3 prose-ul:space-y-1 prose-ol:my-3 prose-ol:space-y-1
          prose-li:my-1 prose-li:leading-relaxed
          prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic
          prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
          prose-blockquote:bg-blue-50/50 dark:prose-blockquote:bg-blue-950/20
          prose-blockquote:py-2 prose-blockquote:rounded-r-lg
          prose-table:border-collapse prose-table:w-full prose-table:my-4 prose-table:shadow-md prose-table:rounded-lg prose-table:overflow-hidden
          prose-thead:bg-gradient-to-r prose-thead:from-blue-600 prose-thead:to-blue-700
          dark:prose-thead:from-blue-800 dark:prose-thead:to-blue-900
          prose-th:border prose-th:border-blue-400/30 prose-th:p-3 prose-th:font-bold
          prose-th:text-white prose-th:text-left prose-th:text-sm prose-th:uppercase prose-th:tracking-wide
          prose-tr:border-b prose-tr:border-gray-200 dark:prose-tr:border-gray-700
          prose-tr:transition-colors hover:prose-tr:bg-gray-50 dark:hover:prose-tr:bg-gray-800/50
          prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-700 prose-td:p-3 prose-td:text-sm
          prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
          prose-strong:font-bold prose-strong:text-foreground
          prose-em:italic
          prose-img:rounded-xl prose-img:shadow-lg prose-img:my-4
          prose-hr:border-gray-300 dark:prose-hr:border-gray-700 prose-hr:my-6
        "
            >
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeHighlight]}
                    components={{
                        /* ================= CODE ================= */
                        code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !match;

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
                                            className="px-3 py-1.5 text-xs bg-blue-700 text-white rounded-md font-medium shadow-lg flex items-center gap-1.5"
                                        >
                                            <Copy className="w-3 h-3" />
                                            Copy
                                        </button>
                                    </div>

                                    {/* LANGUAGE LABEL */}
                                    {match && (
                                        <div className="absolute left-3 top-3 text-xs text-gray-400 font-mono uppercase tracking-wider">
                                            {match[1]}
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
                    inline-flex items-center gap-1 px-3 py-1.5 my-1
                    liquid-glass-button rounded-md text-sm font-medium
                    transition-all shadow-sm hover:shadow-md no-underline
                  "
                                >
                                    {children}
                                    <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                        />
                                    </svg>
                                </a>
                            );
                        },

                        /* ================= TABLE ================= */
                        table({ children }) {
                            return (
                                <div className="overflow-x-auto no-scrollbar my-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
                                    <div className="inline-block min-w-full align-middle">
                                        <table className="w-full table-auto border-collapse">
                                            {children}
                                        </table>
                                    </div>
                                </div>
                            );
                        },

                        thead({ children }) {
                            return <thead className="liquid-glass">{children}</thead>;
                        },

                        tbody({ children }) {
                            return (
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {children}
                                </tbody>
                            );
                        },

                        th({ children }) {
                            return (
                                <th
                                    className="
                    px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider
                    border border-blue-400/30 whitespace-nowrap min-w-[120px]
                  "
                                >
                                    {children}
                                </th>
                            );
                        },

                        td({ children }) {
                            const content = String(children);
                            const urlRegex = /(https?:\/\/[^\s]+)/g;

                            return (
                                <td
                                    className="
                    px-4 py-3 text-sm text-gray-900 dark:text-gray-100
                    border border-gray-200 dark:border-gray-700
                    whitespace-nowrap min-w-[120px]
                  "
                                >
                                    {urlRegex.test(content)
                                        ? content.split(urlRegex).map((part, i) =>
                                            urlRegex.test(part) ? (
                                                <a
                                                    key={i}
                                                    href={part}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                                >
                                                    {part}
                                                </a>
                                            ) : (
                                                part
                                            )
                                        )
                                        : children}
                                </td>
                            );
                        },

                        tr({ children }) {
                            return (
                                <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
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

            {/* COPY MESSAGE BUTTON */}
            {!isLoading && !isStreaming && copyMessage && (
                <button
                    onClick={()=>copyMessage}
                    className="
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            text-xs px-2 py-1 rounded-md
            bg-gray-200 hover:bg-gray-300
            dark:bg-gray-700 dark:hover:bg-gray-600
            md:opacity-0 mobile:opacity-100
          "
                >
                    <Copy className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};
