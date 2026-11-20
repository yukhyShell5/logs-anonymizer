"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GitCompare, Filter } from "lucide-react";

interface DiffViewProps {
  original: string;
  anonymized: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DiffView({ original, anonymized, isOpen, onClose }: DiffViewProps) {
  const [onlyChanged, setOnlyChanged] = useState(false);

  // Créer un diff ligne par ligne
  const diffLines = useMemo(() => {
    if (!original && !anonymized) return [];
    const originalLines = (original || "").split("\n");
    const anonymizedLines = (anonymized || "").split("\n");
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
  const displayedLines = onlyChanged ? diffLines.filter((l) => l.hasChanges) : diffLines;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl w-[95vw] h-[85vh] flex flex-col p-4">
        {/* Header */}
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between pr-6 pb-2 border-b border-border/60">
            <div className="flex items-center gap-3">
              <DialogTitle className="flex items-center gap-2 text-base">
                <GitCompare className="w-4 h-4 text-purple-400" />
                Comparateur Diff Ligne par Ligne
              </DialogTitle>
              <Badge variant="secondary" className="text-xs">
                {changedCount} ligne{changedCount > 1 ? "s" : ""} modifiée{changedCount > 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={onlyChanged ? "secondary" : "outline"}
                size="sm"
                onClick={() => setOnlyChanged(!onlyChanged)}
                className="h-7 text-xs gap-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{onlyChanged ? "Toutes les lignes" : "Lignes modifiées uniquement"}</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Column labels */}
        <div className="flex border-b border-border/60 text-xs font-semibold shrink-0">
          <div className="w-12 shrink-0 py-1.5 text-center text-muted-foreground bg-muted/30 border-r border-border/50">
            #
          </div>
          <div className="flex-1 py-1.5 px-3 uppercase tracking-wider text-red-400 bg-red-950/20 border-r border-border/50">
            Original (Données sensibles)
          </div>
          <div className="flex-1 py-1.5 px-3 uppercase tracking-wider text-emerald-400 bg-emerald-950/20">
            Anonymisé (Masqué)
          </div>
        </div>

        {/* Diff content */}
        <ScrollArea className="flex-1 min-h-0 font-mono text-xs leading-6">
          <div className="divide-y divide-border/30">
            {displayedLines.map((line) => (
              <div
                key={line.lineNum}
                className={`flex items-start transition-colors ${
                  line.hasChanges ? "bg-purple-950/20 hover:bg-purple-900/30" : "hover:bg-muted/30"
                }`}
              >
                {/* Line number */}
                <div className="w-12 shrink-0 py-1 pr-2 text-right text-muted-foreground/50 bg-muted/20 select-none border-r border-border/40 text-[11px]">
                  {line.lineNum}
                </div>

                {/* Original */}
                <div
                  className={`flex-1 p-1.5 overflow-x-auto whitespace-pre font-mono border-r border-border/40 ${
                    line.hasChanges ? "bg-red-500/10 text-red-300" : "text-muted-foreground/80"
                  }`}
                >
                  {line.original || "\u00A0"}
                </div>

                {/* Anonymized */}
                <div
                  className={`flex-1 p-1.5 overflow-x-auto whitespace-pre font-mono ${
                    line.hasChanges ? "bg-emerald-500/10 text-emerald-300 font-semibold" : "text-muted-foreground/80"
                  }`}
                >
                  {line.anonymized || "\u00A0"}
                </div>
              </div>
            ))}

            {displayedLines.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-xs font-sans">
                {onlyChanged
                  ? "Aucune modification détectée dans les logs."
                  : "Aucun log à comparer."}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-red-500/30 border border-red-500/50" />
              Original
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/50" />
              Anonymisé
            </span>
          </div>

          <span className="text-[11px] text-muted-foreground/70">
            {diffLines.length} lignes totales analysées
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
