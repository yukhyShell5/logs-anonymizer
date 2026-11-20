"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HistoryEntry, loadHistory, deleteFromHistory, clearHistory } from "@/lib/storage";
import { AnonymizationRule } from "@/lib/anonymizer";
import { History, Trash2, RotateCcw } from "lucide-react";

interface HistoryPanelProps {
  onRestore: (logs: string, rules: AnonymizationRule[]) => void;
}

export function HistoryPanel({ onRestore }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setHistory(loadHistory());
    }
  };

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
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setHistory(loadHistory());
          setIsOpen(true);
        }}
        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <History className="w-3.5 h-3.5 text-amber-400" />
        <span>Historique</span>
        {history.length > 0 && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
            {history.length}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4 text-amber-400" />
                Historique des Sessions Récentes
              </DialogTitle>
              {history.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClear}
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Tout effacer
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 pt-2">
            <ScrollArea className="max-h-72 pr-2">
              {history.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  <p>Aucun historique sauvegardé</p>
                  <p className="text-[11px] mt-1 text-muted-foreground/70">
                    Vos sessions sont enregistrées automatiquement en local pour vous éviter de perdre vos logs.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg bg-card/60 border border-border/50 hover:border-amber-500/40 hover:bg-muted/40 transition-all flex items-center justify-between gap-3 group"
                    >
                      <button
                        onClick={() => handleRestore(entry)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(entry.timestamp)}
                          </span>
                          <div className="flex gap-1.5">
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                              {entry.rulesCount} règles
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/30 text-amber-400">
                              {entry.matchesCount} match{entry.matchesCount > 1 ? "es" : ""}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs font-mono text-foreground/90 truncate mt-1 bg-background/50 px-2 py-1 rounded border border-border/40">
                          {entry.logsPreview || "(Logs vides)"}
                        </p>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRestore(entry)}
                          className="h-7 px-2 text-xs gap-1 text-amber-400 hover:text-amber-300"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restaurer
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(entry.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
