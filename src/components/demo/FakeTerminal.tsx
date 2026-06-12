import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export type TerminalLineType = 'command' | 'output' | 'success' | 'error' | 'thinking' | 'dim' | 'info' | 'warn';

export interface TerminalLine {
  text: string;
  type?: TerminalLineType;
  pauseAfter?: number;
}

interface FakeTerminalProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  lines: TerminalLine[];
  className?: string;
  typingSpeed?: number;
  lineDelay?: number;
  loopDelay?: number;
  height?: string;
}

const COLORS: Record<TerminalLineType, string> = {
  command: 'text-emerald-400',
  output: 'text-slate-300',
  success: 'text-cyan-400',
  error: 'text-red-400',
  thinking: 'text-yellow-300',
  dim: 'text-slate-500',
  info: 'text-violet-400',
  warn: 'text-orange-400',
};

const FakeTerminal: React.FC<FakeTerminalProps> = ({
  title,
  badge,
  badgeColor = 'bg-emerald-500',
  lines,
  className,
  typingSpeed = 22,
  lineDelay = 350,
  loopDelay = 5000,
  height = 'h-52',
}) => {
  const [revealedLines, setRevealedLines] = useState<{ text: string; type: TerminalLineType }[]>([]);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [currentChars, setCurrentChars] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setRevealedLines([]);
    setCurrentLineIdx(0);
    setCurrentChars(0);
  }, []);

  useEffect(() => {
    if (currentLineIdx >= lines.length) {
      if (loopDelay > 0) {
        const t = setTimeout(reset, loopDelay);
        return () => clearTimeout(t);
      }
      return;
    }

    const line = lines[currentLineIdx];
    const fullText = line.text;

    if (currentChars < fullText.length) {
      const t = setTimeout(() => setCurrentChars(c => c + 1), typingSpeed);
      return () => clearTimeout(t);
    }

    const pause = (line.pauseAfter ?? 0) + lineDelay;
    const t = setTimeout(() => {
      setRevealedLines(prev => [...prev, { text: fullText, type: line.type ?? 'output' }]);
      setCurrentLineIdx(i => i + 1);
      setCurrentChars(0);
    }, pause);
    return () => clearTimeout(t);
  }, [currentLineIdx, currentChars, lines, typingSpeed, lineDelay, loopDelay, reset]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [revealedLines, currentChars]);

  const activeLine = currentLineIdx < lines.length ? lines[currentLineIdx] : null;
  const activeType = activeLine?.type ?? 'output';

  return (
    <div className={cn(
      'flex flex-col rounded-xl overflow-hidden border border-white/10 bg-[#0d1117] shadow-2xl font-mono text-xs select-none',
      className
    )}>
      {/* Header — Mac-style traffic lights */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-white/[0.07] shrink-0">
        <span className="h-3 w-3 rounded-full bg-red-500/80" />
        <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
        <span className="h-3 w-3 rounded-full bg-green-500/80" />
        <div className="flex-1 flex items-center justify-center gap-2">
          <span className="text-slate-400 text-[11px] font-sans tracking-tight">{title}</span>
          {badge && (
            <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', badgeColor)} />
          )}
        </div>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        className={cn('overflow-y-auto p-4 space-y-0.5 min-h-0', height)}
        style={{ scrollbarWidth: 'none' }}
      >
        {revealedLines.map((line, i) => (
          <div key={i} className={cn('leading-5 whitespace-pre-wrap break-all', COLORS[line.type])}>
            {line.text}
          </div>
        ))}

        {activeLine && (
          <div className={cn('leading-5 whitespace-pre-wrap break-all', COLORS[activeType])}>
            {activeLine.text.slice(0, currentChars)}
            <span className="inline-block w-[5px] h-[13px] bg-current ml-px align-middle opacity-90 animate-[pulse_0.85s_ease-in-out_infinite]" />
          </div>
        )}
      </div>
    </div>
  );
};

export default FakeTerminal;
