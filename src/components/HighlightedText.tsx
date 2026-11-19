import React from 'react';
import type { HighlightRange } from '../types';

interface HighlightedTextProps {
  text: string;
  ranges?: HighlightRange[];
  className?: string;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  ranges,
  className,
}) => {
  if (!text) return null;
  if (!ranges || ranges.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < ranges.length; i++) {
    const [rawStart, rawEnd] = ranges[i];
    const start = Math.max(cursor, Math.min(text.length, rawStart));
    const end = Math.max(start, Math.min(text.length, rawEnd));

    if (start > cursor) {
      parts.push(
        <React.Fragment key={`plain-${i}`}>{text.slice(cursor, start)}</React.Fragment>
      );
    }
    if (end > start) {
      parts.push(
        <mark key={`hl-${i}`} className="pinpoint-highlight">
          {text.slice(start, end)}
        </mark>
      );
    }
    cursor = end;
  }

  if (cursor < text.length) {
    parts.push(<React.Fragment key="tail">{text.slice(cursor)}</React.Fragment>);
  }

  return <span className={className}>{parts}</span>;
};
