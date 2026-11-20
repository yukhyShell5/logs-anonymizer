"use client";

import { useMemo, useRef, useState, DragEvent, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Match, AnonymizationRule, HIGHLIGHT_COLORS } from "@/lib/anonymizer";
import { downloadAsFile, readFileContent } from "@/lib/storage";
import {
  Columns2,
  Rows2,
  FileCode,
  Copy,
  Check,
  Download,
  Upload,
  Trash2,
  Search,
  X,
  WrapText,
  Link2,
  Link2Off,
  GitCompare,
  Sparkles,
  ShieldCheck,
  FileText,
} from "lucide-react";

export type LayoutMode = "side-by-side" | "stacked" | "tabs";

interface LogsPanelProps {
  logs: string;
  onLogsChange: (logs: string) => void;
  matches: Match[];
  rules: AnonymizationRule[];
  pendingPattern?: string;
  anonymizedText: string;
  onOpenDiff?: () => void;
  onLoadSample?: () => void;
}

export function LogsPanel({
  logs,
  onLogsChange,
  matches,
  rules,
  pendingPattern,
  anonymizedText,
  onOpenDiff,
  onLoadSample,
}: LogsPanelProps) {
  // Layout states
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("side-by-side");
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage (20 to 80)
  const [isResizing, setIsResizing] = useState(false);

  // Editor states
  const [wordWrap, setWordWrap] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for scrolling and elements
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputLineNumsRef = useRef<HTMLDivElement>(null);
  const outputViewerRef = useRef<HTMLDivElement>(null);
  const outputLineNumsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  // Line count calculations
  const inputLines = useMemo(() => {
    if (!logs) return [""];
    return logs.split("\n");
  }, [logs]);

  const outputLines = useMemo(() => {
    if (!anonymizedText) return [""];
    return anonymizedText.split("\n");
  }, [anonymizedText]);

  // Statistics
  const charCount = logs.length;
  const anonCharCount = anonymizedText.length;

  // Search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim() || !logs) return [];
    try {
      const regex = new RegExp(searchQuery, "gi");
      const results: { start: number; end: number }[] = [];
      let match;
      while ((match = regex.exec(logs)) !== null) {
        if (match[0].length === 0) {
          regex.lastIndex++;
          continue;
        }
        results.push({ start: match.index, end: match.index + match[0].length });
      }
      return results;
    } catch {
      return [];
    }
  }, [searchQuery, logs]);

  // Pending matches from currently typed regex
  const pendingMatches = useMemo(() => {
    if (!pendingPattern || !logs) return [];
    try {
      const regex = new RegExp(pendingPattern, "gi");
      const results: { start: number; end: number; text: string }[] = [];
      let match;
      while ((match = regex.exec(logs)) !== null) {
        if (match[0].length === 0) {
          regex.lastIndex++;
          continue;
        }
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

  // Highlighted HTML for the backdrop overlay
  const highlightedHtml = useMemo(() => {
    if (!logs) return "";

    const allMatches: {
      start: number;
      end: number;
      text: string;
      ruleId?: string;
      isPending?: boolean;
      isSearch?: boolean;
    }[] = [
      ...matches.map((m) => ({ ...m, isPending: false, isSearch: false })),
      ...pendingMatches.map((m) => ({ ...m, isPending: true, isSearch: false })),
      ...searchMatches.map((m) => ({
        start: m.start,
        end: m.end,
        text: logs.slice(m.start, m.end),
        isSearch: true,
        isPending: false,
      })),
    ];

    if (allMatches.length === 0) {
      return escapeHtml(logs);
    }

    // Sort: search first, then earlier start, longer length
    allMatches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.isSearch) return -1;
      if (b.isSearch) return 1;
      return (b.end - b.start) - (a.end - a.start);
    });

    // Remove overlapping intervals
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

      let markStyle = "";
      if (match.isSearch) {
        markStyle = "background-color: rgba(250, 204, 21, 0.45); border-bottom: 2px solid #eab308;";
      } else if (match.isPending) {
        const color = HIGHLIGHT_COLORS[rules.length % HIGHLIGHT_COLORS.length];
        markStyle = `background-color: ${color.bg}; border-bottom: 2px dashed ${color.border};`;
      } else {
        const ruleIndex = rules.findIndex((r) => r.id === match.ruleId);
        const color = HIGHLIGHT_COLORS[(ruleIndex >= 0 ? ruleIndex : 0) % HIGHLIGHT_COLORS.length];
        markStyle = `background-color: ${color.bg}; border-bottom: 2px solid ${color.border};`;
      }

      result += `<mark style="${markStyle} border-radius: 2px; color: inherit; padding: 0 1px;">${escapeHtml(match.text)}</mark>`;
      lastIndex = match.end;
    }

    if (lastIndex < logs.length) {
      result += escapeHtml(logs.slice(lastIndex));
    }

    return result;
  }, [logs, matches, rules, pendingMatches, searchMatches]);

  // Synchronized scroll handling
  const handleInputScroll = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Sync input line numbers and backdrop
    if (backdropRef.current) {
      backdropRef.current.scrollTop = textarea.scrollTop;
      backdropRef.current.scrollLeft = textarea.scrollLeft;
    }
    if (inputLineNumsRef.current) {
      inputLineNumsRef.current.scrollTop = textarea.scrollTop;
    }

    // Sync output scroll if enabled
    if (syncScroll && outputViewerRef.current && !isSyncingScroll.current) {
      isSyncingScroll.current = true;
      const scrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight || 1);
      const targetScroll = scrollPercentage * (outputViewerRef.current.scrollHeight - outputViewerRef.current.clientHeight || 1);
      outputViewerRef.current.scrollTop = targetScroll;
      if (outputLineNumsRef.current) {
        outputLineNumsRef.current.scrollTop = targetScroll;
      }
      setTimeout(() => {
        isSyncingScroll.current = false;
      }, 20);
    }
  };

  const handleOutputScroll = () => {
    const output = outputViewerRef.current;
    if (!output) return;

    if (outputLineNumsRef.current) {
      outputLineNumsRef.current.scrollTop = output.scrollTop;
    }

    if (syncScroll && textareaRef.current && !isSyncingScroll.current) {
      isSyncingScroll.current = true;
      const scrollPercentage = output.scrollTop / (output.scrollHeight - output.clientHeight || 1);
      const targetScroll = scrollPercentage * (textareaRef.current.scrollHeight - textareaRef.current.clientHeight || 1);
      textareaRef.current.scrollTop = targetScroll;
      if (backdropRef.current) {
        backdropRef.current.scrollTop = targetScroll;
      }
      if (inputLineNumsRef.current) {
        inputLineNumsRef.current.scrollTop = targetScroll;
      }
      setTimeout(() => {
        isSyncingScroll.current = false;
      }, 20);
    }
  };

  // Resizer drag handling
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      let newRatio: number;
      if (layoutMode === "side-by-side") {
        newRatio = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        newRatio = ((e.clientY - rect.top) / rect.height) * 100;
      }

      // Constrain ratio between 20% and 80%
      newRatio = Math.max(20, Math.min(80, newRatio));
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, layoutMode]);

  // Drag and Drop
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
        contents.push(files.length > 1 ? `--- ${file.name} ---\n${content}` : content);
      }
      const merged = contents.join("\n\n");
      onLogsChange(merged);
      toast.success(files.length > 1 ? `${files.length} fichiers importés` : `Fichier ${files[0].name} importé`);
    } catch {
      toast.error("Erreur lors de la lecture du fichier");
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
      toast.success(files.length > 1 ? `${files.length} fichiers importés` : `Fichier ${files[0].name} importé`);
    } catch {
      toast.error("Erreur lors de la lecture du fichier");
    }
    e.target.value = "";
  };

  const handleCopy = async () => {
    if (!anonymizedText) return;
    await navigator.clipboard.writeText(anonymizedText);
    setCopied(true);
    toast.success("Texte anonymisé copié dans le presse-papiers");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!anonymizedText) return;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
    const filename = `anonymized-logs-${timestamp}.txt`;
    downloadAsFile(anonymizedText, filename);
    toast.success("Fichier téléchargé", { description: filename });
  };

  const handleClear = () => {
    if (logs) {
      onLogsChange("");
      toast.info("Logs effacés");
    }
  };

  // Helper formatting for tokenized output display
  const renderedAnonymizedHtml = useMemo(() => {
    if (!anonymizedText) return "";

    // Highlight replacement tags like [EMAIL_1], [IP_2], etc.
    const tagRegex = /\[([A-Z0-9_]+)\]/g;
    const escaped = escapeHtml(anonymizedText);

    return escaped.replace(tagRegex, (_fullMatch, tagName) => {
      // Find matching rule label prefix
      const baseLabel = tagName.replace(/_\d+$/, "");
      const ruleIndex = rules.findIndex((r) => r.label.toUpperCase() === baseLabel);
      const color = HIGHLIGHT_COLORS[(ruleIndex >= 0 ? ruleIndex : 0) % HIGHLIGHT_COLORS.length];

      return `<span style="background-color: ${color.bg}; border: 1px solid ${color.border}; color: ${color.border}; font-weight: 600; padding: 0.5px 4px; border-radius: 4px; display: inline-block;">[${tagName}]</span>`;
    });
  }, [anonymizedText, rules]);

  // Shared font & typography styling for identical line heights
  const editorTypographyClass = "font-mono text-xs sm:text-[13px] leading-6 tab-4";

  return (
    <div className="flex flex-col h-full gap-2.5 min-h-0 select-text">
      {/* Workspace Bar: Layout switches & Quick toggles */}
      <div className="flex items-center justify-between gap-3 px-1 py-0.5 shrink-0">
        {/* Left: View Mode Switcher */}
        <div className="flex items-center gap-1 p-0.5 bg-muted/60 border border-border/50 rounded-lg">
          <button
            onClick={() => setLayoutMode("side-by-side")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              layoutMode === "side-by-side"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Affichage côte-à-côte (Colonnes)"
          >
            <Columns2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Côte à côte</span>
          </button>

          <button
            onClick={() => setLayoutMode("stacked")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              layoutMode === "stacked"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Affichage empilé (Lignes)"
          >
            <Rows2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Empilé</span>
          </button>

          <button
            onClick={() => setLayoutMode("tabs")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              layoutMode === "tabs"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Affichage par onglets (Plein écran)"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Onglets</span>
          </button>
        </div>

        {/* Center: Tabs when in 'tabs' layout */}
        {layoutMode === "tabs" && (
          <div className="flex items-center gap-1 p-0.5 bg-muted/40 border border-border/40 rounded-lg">
            <button
              onClick={() => setActiveTab("input")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === "input"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Original ({inputLines.length}l)
            </button>
            <button
              onClick={() => setActiveTab("output")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === "output"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Anonymisé</span>
              {matches.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-emerald-500/20 text-emerald-300">
                  {matches.length}
                </Badge>
              )}
            </button>
          </div>
        )}

        {/* Right: Toggles (Word-wrap, Sync-scroll, Search, Diff) */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWordWrap(!wordWrap)}
            className={`h-7 px-2 text-xs gap-1 border border-transparent ${
              wordWrap ? "bg-muted text-foreground border-border/60" : "text-muted-foreground hover:text-foreground"
            }`}
            title={wordWrap ? "Retour à la ligne activé" : "Retour à la ligne désactivé (Scroll horizontal)"}
          >
            <WrapText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Wrap</span>
          </Button>

          {layoutMode !== "tabs" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSyncScroll(!syncScroll)}
              className={`h-7 px-2 text-xs gap-1 border border-transparent ${
                syncScroll ? "bg-muted text-blue-400 border-border/60" : "text-muted-foreground hover:text-foreground"
              }`}
              title={syncScroll ? "Défilement synchronisé actif" : "Défilement synchronisé inactif"}
            >
              {syncScroll ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">Sync Scroll</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className={`h-7 px-2 text-xs gap-1 ${
              showSearch ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Rechercher (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </Button>

          {onOpenDiff && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenDiff}
              disabled={!logs}
              className="h-7 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
              title="Comparateur visuel Diff (Ctrl+D)"
            >
              <GitCompare className="w-3.5 h-3.5 text-purple-400" />
              <span>Diff</span>
            </Button>
          )}
        </div>
      </div>

      {/* Inline Search Bar */}
      {showSearch && (
        <div className="flex items-center gap-2 p-2 bg-muted/60 border border-border/60 rounded-lg animate-in fade-in duration-150">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans l'original..."
            className="h-7 text-xs flex-1 font-mono bg-background"
            autoFocus
          />
          {searchQuery && (
            <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
              {searchMatches.length} occurrence{searchMatches.length > 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
            }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Resizable Workspace Container */}
      <div
        ref={containerRef}
        className={`flex-1 min-h-0 flex ${
          layoutMode === "side-by-side"
            ? "flex-row"
            : layoutMode === "stacked"
            ? "flex-col"
            : "flex-col"
        } relative overflow-hidden`}
      >
        {/* ===================== INPUT CARD ===================== */}
        {(layoutMode !== "tabs" || activeTab === "input") && (
          <Card
            style={
              layoutMode === "side-by-side"
                ? { width: `${splitRatio}%`, minWidth: "20%", maxWidth: "80%" }
                : layoutMode === "stacked"
                ? { height: `${splitRatio}%`, minHeight: "20%", maxHeight: "80%" }
                : { width: "100%", height: "100%" }
            }
            className={`flex flex-col overflow-hidden bg-card/60 backdrop-blur-md border-border/70 shadow-sm relative transition-shadow ${
              isDragging ? "ring-2 ring-purple-500 ring-offset-1 ring-offset-background" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Input Header */}
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 bg-muted/30 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-xs shadow-blue-500/50" />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Original
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {inputLines.length} ligne{inputLines.length > 1 ? "s" : ""} • {charCount} car.
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {!logs && onLoadSample && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onLoadSample}
                    className="h-6 px-2 text-[11px] gap-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    <Sparkles className="w-3 h-3" />
                    Exemple
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  title="Importer un fichier (.log, .txt, .json)"
                >
                  <Upload className="w-3 h-3" />
                  Importer
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".log,.txt,.json,text/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />

                {logs && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleClear}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors"
                    title="Effacer le contenu"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Input Body with synchronized Line Numbers & Highlighting */}
            <div className="flex-1 min-h-0 relative flex overflow-hidden">
              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 bg-purple-500/20 backdrop-blur-xs z-30 flex items-center justify-center border-2 border-dashed border-purple-500">
                  <div className="text-purple-300 font-medium text-sm flex items-center gap-2 bg-background/90 px-4 py-2 rounded-lg shadow-lg">
                    <Upload className="w-4 h-4 animate-bounce" />
                    Déposez votre fichier de log ici
                  </div>
                </div>
              )}

              {/* Line Numbers Gutter */}
              <div
                ref={inputLineNumsRef}
                className="w-12 bg-muted/20 border-r border-border/50 overflow-hidden select-none shrink-0"
              >
                <div className={`py-3 pr-2 text-right text-muted-foreground/50 ${editorTypographyClass}`}>
                  {inputLines.map((_, i) => (
                    <div key={i} className="h-6 leading-6 text-[11px]">
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Textarea + Highlighting Overlay Area */}
              <div className="flex-1 relative overflow-hidden bg-background/30">
                {/* Backdrop Layer */}
                <div
                  ref={backdropRef}
                  className={`absolute inset-0 p-3 pointer-events-none overflow-hidden ${editorTypographyClass} ${
                    wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
                  }`}
                  style={{ color: "transparent" }}
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />

                {/* Textarea Layer */}
                <textarea
                  ref={textareaRef}
                  value={logs}
                  onChange={(e) => onLogsChange(e.target.value)}
                  onScroll={handleInputScroll}
                  placeholder="Collez vos logs ici, ou glissez-déposez un fichier (.log, .txt, .json)..."
                  className={`absolute inset-0 w-full h-full resize-none bg-transparent p-3 focus:outline-none placeholder:text-muted-foreground/40 text-foreground overflow-auto ${editorTypographyClass} ${
                    wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
                  }`}
                  style={{
                    caretColor: "currentColor",
                    WebkitTextFillColor: "inherit",
                  }}
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Input Status Footer */}
            <div className="border-t border-border/50 px-3 py-1 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
              <div className="flex items-center gap-2">
                <span>{matches.length} correspondance{matches.length > 1 ? "s" : ""}</span>
                {pendingMatches.length > 0 && (
                  <span className="text-purple-400 font-medium">
                    (+{pendingMatches.length} en cours)
                  </span>
                )}
              </div>
              <span className="text-muted-foreground/60">Éditable</span>
            </div>
          </Card>
        )}

        {/* ===================== RESIZER DIVIDER ===================== */}
        {layoutMode !== "tabs" && (
          <div
            onMouseDown={startResizing}
            onDoubleClick={() => setSplitRatio(50)}
            className={`group relative flex items-center justify-center shrink-0 z-20 transition-all ${
              layoutMode === "side-by-side"
                ? "w-2.5 cursor-col-resize hover:bg-purple-500/20 active:bg-purple-500/40"
                : "h-2.5 cursor-row-resize hover:bg-purple-500/20 active:bg-purple-500/40"
            }`}
            title="Glisser pour redimensionner • Double-clic pour centrer (50/50)"
          >
            <div
              className={`rounded-full transition-colors ${
                layoutMode === "side-by-side"
                  ? "w-1 h-8 group-hover:bg-purple-400 group-active:bg-purple-400 bg-border"
                  : "h-1 w-8 group-hover:bg-purple-400 group-active:bg-purple-400 bg-border"
              }`}
            />
          </div>
        )}

        {/* ===================== OUTPUT CARD ===================== */}
        {(layoutMode !== "tabs" || activeTab === "output") && (
          <Card
            style={
              layoutMode === "side-by-side"
                ? { width: `${100 - splitRatio}%`, minWidth: "20%", maxWidth: "80%" }
                : layoutMode === "stacked"
                ? { height: `${100 - splitRatio}%`, minHeight: "20%", maxHeight: "80%" }
                : { width: "100%", height: "100%" }
            }
            className="flex flex-col overflow-hidden bg-card/60 backdrop-blur-md border-border/70 shadow-sm relative"
          >
            {/* Output Header */}
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 bg-muted/30 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Anonymisé
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {outputLines.length} ligne{outputLines.length > 1 ? "s" : ""} • {anonCharCount} car.
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  disabled={!anonymizedText}
                  className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  title="Télécharger les logs anonymisés"
                >
                  <Download className="w-3 h-3" />
                  Télécharger
                </Button>

                <Button
                  size="sm"
                  onClick={handleCopy}
                  disabled={!anonymizedText}
                  className="h-6 px-2.5 text-[11px] gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-white" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copier</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Output Body with synchronized Line Numbers */}
            <div className="flex-1 min-h-0 relative flex overflow-hidden bg-background/30">
              {/* Output Line Numbers Gutter */}
              <div
                ref={outputLineNumsRef}
                className="w-12 bg-muted/20 border-r border-border/50 overflow-hidden select-none shrink-0"
              >
                <div className={`py-3 pr-2 text-right text-muted-foreground/50 ${editorTypographyClass}`}>
                  {outputLines.map((_, i) => (
                    <div key={i} className="h-6 leading-6 text-[11px]">
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Output Content Viewer */}
              <div
                ref={outputViewerRef}
                onScroll={handleOutputScroll}
                className={`flex-1 p-3 overflow-auto select-text ${editorTypographyClass} ${
                  wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
                }`}
              >
                {anonymizedText ? (
                  <div
                    className="text-foreground/90 selection:bg-purple-500/30"
                    dangerouslySetInnerHTML={{ __html: renderedAnonymizedHtml }}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                    <FileText className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs font-medium">En attente de logs</p>
                    <p className="text-[11px] text-muted-foreground/70 max-w-xs mt-1">
                      Le résultat anonymisé s&apos;affichera ici en temps réel dès que vous collez du texte.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Output Status Footer */}
            <div className="border-t border-border/50 px-3 py-1 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Prêt pour LLM / Partage</span>
              </div>
              <span className="text-muted-foreground/60">Lecture seule</span>
            </div>
          </Card>
        )}
      </div>
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
