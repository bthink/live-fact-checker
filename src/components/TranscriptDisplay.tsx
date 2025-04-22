'use client';

import React, { useEffect, useRef } from 'react';

interface TranscriptDisplayProps {
  transcript: string;
}

export default function TranscriptDisplay({ transcript }: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when transcript changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div
      ref={scrollRef}
      className="w-full max-w-md h-48 p-4 border rounded-lg bg-gray-50 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap"
      aria-live="polite" // Accessibility: announce updates
    >
      {transcript ? transcript : <span className="text-gray-400">Transcript will appear here...</span>}
    </div>
  );
} 