"use client";

import { useMemo, useRef, useState, DragEvent, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Match, AnonymizationRule, HIGHLIGHT_COLORS } from "@/lib/anonymizer";
import { downloadAsFile, readFileContent } from "@/lib/storage";

interface LogsPanelProps {
  logs: string;
  onLogsChange: (logs: string) => void;
  matches: Match[];
  rules: AnonymizationRule[];
  pendingPattern?: string;
  anonymizedText: string;
}

export function LogsPanel({ 
  logs, 
  onLogsChange, 
  matches, 
  rules, 
  pendingPattern,
  anonymizedText 
}: LogsPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Calcul des numéros de ligne
  const lineCount = useMemo(() => {
    if (!logs) return 1;
    return logs.split("\n").length;
  }, [logs]);

  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  }, [lineCount]);

  // Trouver les matches du pattern en cours de saisie
  const pendingMatches = useMemo(() => {
    if (!pendingPattern || !logs) return [];
    try {
      const regex = new RegExp(pendingPattern, "gi");
      const results: { start: number; end: number; text: string }[] = [];
      let match;
      while ((match = regex.exec(logs)) !== null) {
        results.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
        });
      }
      return results;
    } catch {
      return [];
    }
  }, [pendingPattern, logs]);

  // Recherche dans les logs
  const searchMatches = useMemo(() => {
    if (!searchQuery || !logs) return [];
    try {
      const regex = new RegExp(searchQuery, "gi");
      const results: { start: number; end: number }[] = [];
      let match;
      while ((match = regex.exec(logs)) !== null) {
        results.push({ start: match.index, end: match.index + match[0].length });
      }
      return results;
    } catch {
      return [];
    }
  }, [searchQuery, logs]);

  // Créer le HTML avec highlighting pour l'overlay
  const highlightedHtml = useMemo(() => {
    if (!logs) return "";
    
    const allMatches: { start: number; end: number; text: string; ruleId?: string; isPending?: boolean; isSearch?: boolean }[] = [
      ...matches.map(m => ({ ...m, isPending: false, isSearch: false })),
      ...pendingMatches.map(m => ({ ...m, isPending: true, isSearch: false })),
      ...searchMatches.map(m => ({ ...m, text: logs.slice(m.start, m.end), isSearch: true, isPending: false })),
    ];

    if (allMatches.length === 0) {
      return escapeHtml(logs);
    }

    allMatches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.isSearch) return -1; // Search matches first
      return (a.isPending ? 1 : 0) - (b.isPending ? 1 : 0);
    });

    const filteredMatches: typeof allMatches = [];
    let lastEnd = 0;
    for (const match of allMatches) {
      if (match.start >= lastEnd) {
        filteredMatches.push(match);
        lastEnd = match.end;
      }
    }

    let result = "";
    let lastIndex = 0;

    for (const match of filteredMatches) {
      if (match.start > lastIndex) {
        result += escapeHtml(logs.slice(lastIndex, match.start));
      }

      let style = "";
      if (match.isSearch) {
        style = "background-color: rgba(250, 204, 21, 0.4); border-bottom: 2px solid #facc15;";
      } else if (match.isPending) {
        const color = HIGHLIGHT_COLORS[rules.length % HIGHLIGHT_COLORS.length];
        style = `background-color: ${color.bg}; border-bottom: 2px dashed ${color.border};`;
      } else {
        const ruleIndex = rules.findIndex((r) => r.id === match.ruleId);
        const color = HIGHLIGHT_COLORS[ruleIndex % HIGHLIGHT_COLORS.length];
        style = `background-color: ${color.bg}; border-bottom: 2px solid ${color.border};`;
      }

      result += `<mark style="${style} border-radius: 2px; color: inherit;">${escapeHtml(match.text)}</mark>`;
      lastIndex = match.end;
    }

    if (lastIndex < logs.length) {
      result += escapeHtml(logs.slice(lastIndex));
    }

    result += " ";
    return result;
  }, [logs, matches, rules, pendingMatches, searchMatches]);

  const handleScroll = () => {
    const textarea = textareaRef.current;
    const backdrop = document.getElementById("highlight-backdrop");
    const lineNums = lineNumbersRef.current;
    if (textarea && backdrop) {
      backdrop.scrollTop = textarea.scrollTop;
      backdrop.scrollLeft = textarea.scrollLeft;
    }
    if (textarea && lineNums) {
      lineNums.scrollTop = textarea.scrollTop;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F pour recherche
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
      // Escape pour fermer la recherche
      if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
        setSearchQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch]);

  // Drag & Drop handlers
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    try {
      const contents: string[] = [];
      for (const file of files) {
        const content = await readFileContent(file);
        contents.push(`--- ${file.name} ---\n${content}`);
      }
      const merged = contents.join("\n\n");
      onLogsChange(merged);
      
      if (files.length > 1) {
        toast.success(`${files.length} fichiers importés`);
      } else {
        toast.success("Fichier importé", { description: files[0].name });
      }
    } catch (error) {
      console.error("Error reading files:", error);
      toast.error("Erreur de lecture des fichiers");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const contents: string[] = [];
      for (const file of files) {
        const content = await readFileContent(file);
        contents.push(files.length > 1 ? `--- ${file.name} ---\n${content}` : content);
      }
      const merged = contents.join("\n\n");
      onLogsChange(merged);
      
      if (files.length > 1) {
        toast.success(`${files.length} fichiers importés`);
      } else {
        toast.success("Fichier importé", { description: files[0].name });
      }
    } catch (error) {
      console.error("Error reading files:", error);
      toast.error("Erreur de lecture des fichiers");
    }
    // Reset file input
    e.target.value = "";
  };

  const handleCopy = async () => {
    if (anonymizedText) {
      await navigator.clipboard.writeText(anonymizedText);
      setCopied(true);
      toast.success("Copié dans le presse-papiers");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (anonymizedText) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
      const filename = `anonymized-logs-${timestamp}.txt`;
      downloadAsFile(anonymizedText, filename);
      toast.success("Fichier téléchargé", { description: filename });
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Logs</h2>
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`text-xs px-2 py-1 rounded transition-colors ${showLineNumbers ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title="Afficher/masquer les numéros de ligne"
          >
            #
          </button>
        </div>
        <span className="text-sm text-muted-foreground">
          {matches.length} correspondance{matches.length !== 1 ? "s" : ""}
          {pendingMatches.length > 0 && (
            <span className="text-purple-400 ml-1">
              (+{pendingMatches.length} en preview)
            </span>
          )}
        </span>
      </div>

      {/* Barre de recherche */}
      {showSearch && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans les logs..."
            className="h-8 text-sm flex-1"
            autoFocus
          />
          <span className="text-xs text-muted-foreground">
            {searchMatches.length} résultat{searchMatches.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => { setShowSearch(false); setSearchQuery(""); }}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Zone Input avec highlighting intégré et drag & drop */}
      <Card 
        className={`flex-1 flex flex-col overflow-hidden bg-card/50 backdrop-blur transition-all ${
          isDragging ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-background" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Input • {lineCount} ligne{lineCount !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              title="Ctrl+F"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Importer
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".log,.txt,.json,text/*"
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />
        </div>
        <div className="flex-1 relative overflow-hidden flex">
          {/* Numéros de ligne */}
          {showLineNumbers && (
            <div 
              ref={lineNumbersRef}
              className="w-12 bg-muted/30 border-r border-border overflow-hidden select-none flex-shrink-0"
            >
              <div className="p-4 font-mono text-xs text-muted-foreground text-right">
                {lineNumbers.map((num) => (
                  <div key={num} className="h-[1.5rem] leading-[1.5rem]">{num}</div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex-1 relative overflow-hidden">
            {/* Drop overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-purple-500/20 z-20 flex items-center justify-center">
                <div className="text-purple-400 text-lg font-medium">
                  Déposez votre fichier ici
                </div>
              </div>
            )}
            {/* Backdrop avec highlighting */}
            <div 
              id="highlight-backdrop"
              className="absolute inset-0 p-4 font-mono text-sm whitespace-pre-wrap break-words overflow-auto pointer-events-none leading-[1.5rem]"
              style={{ color: "transparent" }}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
            {/* Textarea transparent par-dessus */}
            <textarea
              ref={textareaRef}
              value={logs}
              onChange={(e) => onLogsChange(e.target.value)}
              onScroll={handleScroll}
              placeholder="Collez vos logs ici ou glissez-déposez un fichier..."
              className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 font-mono text-sm focus:outline-none placeholder:text-muted-foreground/50 text-foreground overflow-auto leading-[1.5rem]"
              style={{ 
                caretColor: "currentColor",
                WebkitTextFillColor: "inherit",
              }}
              spellCheck={false}
            />
          </div>
        </div>
      </Card>

      {/* Zone Anonymisé */}
      <Card className="flex-1 flex flex-col overflow-hidden bg-card/50 backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Anonymisé
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={!anonymizedText}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded hover:bg-muted"
              title="Télécharger"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={handleCopy}
              disabled={!anonymizedText}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded hover:bg-muted"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copié!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copier
                </>
              )}
            </button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <pre className="p-4 font-mono text-sm whitespace-pre-wrap break-words text-green-400/90">
            {anonymizedText || <span className="text-muted-foreground/50">Le résultat anonymisé apparaîtra ici...</span>}
          </pre>
        </ScrollArea>
      </Card>
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
