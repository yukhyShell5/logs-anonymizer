"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DiffViewProps {
  original: string;
  anonymized: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DiffView({ original, anonymized, isOpen, onClose }: DiffViewProps) {
  // Créer un diff ligne par ligne
  const diffLines = useMemo(() => {
    const originalLines = original.split("\n");
    const anonymizedLines = anonymized.split("\n");
    const maxLines = Math.max(originalLines.length, anonymizedLines.length);
    
    const lines: Array<{
      lineNum: number;
      original: string;
      anonymized: string;
      hasChanges: boolean;
    }> = [];

    for (let i = 0; i < maxLines; i++) {
      const orig = originalLines[i] || "";
      const anon = anonymizedLines[i] || "";
      lines.push({
        lineNum: i + 1,
        original: orig,
        anonymized: anon,
        hasChanges: orig !== anon,
      });
    }

    return lines;
  }, [original, anonymized]);

  const changedCount = diffLines.filter((l) => l.hasChanges).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[80vh] flex flex-col bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Mode Diff</h2>
            <span className="text-sm text-muted-foreground">
              {changedCount} ligne{changedCount !== 1 ? "s" : ""} modifiée{changedCount !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Column headers */}
        <div className="flex border-b">
          <div className="flex-1 p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-red-500/10 text-center border-r">
            Original
          </div>
          <div className="flex-1 p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-green-500/10 text-center">
            Anonymisé
          </div>
        </div>

        {/* Diff content */}
        <ScrollArea className="flex-1">
          <div className="min-w-full">
            {diffLines.map((line) => (
              <div
                key={line.lineNum}
                className={`flex border-b border-border/50 ${
                  line.hasChanges ? "bg-yellow-500/5" : ""
                }`}
              >
                {/* Line number */}
                <div className="w-10 shrink-0 text-xs text-muted-foreground text-right pr-2 py-1 bg-muted/30 select-none">
                  {line.lineNum}
                </div>
                
                {/* Original */}
                <div className={`flex-1 p-1 font-mono text-sm border-r border-border/50 ${
                  line.hasChanges ? "bg-red-500/10" : ""
                }`}>
                  <pre className="whitespace-pre-wrap break-all">{line.original || "\u00A0"}</pre>
                </div>
                
                {/* Anonymized */}
                <div className={`flex-1 p-1 font-mono text-sm ${
                  line.hasChanges ? "bg-green-500/10 text-green-400" : ""
                }`}>
                  <pre className="whitespace-pre-wrap break-all">{line.anonymized || "\u00A0"}</pre>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t text-center text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-500/30"></span> Original
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500/30"></span> Anonymisé
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-500/30"></span> Modifié
            </span>
          </span>
        </div>
      </Card>
    </div>
  );
}
