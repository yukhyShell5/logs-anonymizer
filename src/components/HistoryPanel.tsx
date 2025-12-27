"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HistoryEntry, loadHistory, deleteFromHistory, clearHistory } from "@/lib/storage";
import { AnonymizationRule } from "@/lib/anonymizer";

interface HistoryPanelProps {
  onRestore: (logs: string, rules: AnonymizationRule[]) => void;
}

export function HistoryPanel({ onRestore }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Charger l'historique au montage
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleDelete = (id: string) => {
    deleteFromHistory(id);
    setHistory(loadHistory());
  };

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  const handleRestore = (entry: HistoryEntry) => {
    onRestore(entry.logs, entry.rules);
    setIsOpen(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Historique ({history.length})
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <Card className="absolute right-0 top-8 z-50 w-80 p-3 bg-card/95 backdrop-blur shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Historique</span>
              <button
                onClick={handleClear}
                className="text-xs text-destructive hover:underline"
              >
                Tout effacer
              </button>
            </div>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2 rounded bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => handleRestore(entry)}
                        className="flex-1 text-left"
                      >
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.timestamp)}
                        </p>
                        <p className="text-sm font-mono truncate mt-1">
                          {entry.logsPreview}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {entry.rulesCount} règle{entry.rulesCount !== 1 ? "s" : ""}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {entry.matchesCount} match{entry.matchesCount !== 1 ? "es" : ""}
                          </Badge>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </>
      )}
    </div>
  );
}
