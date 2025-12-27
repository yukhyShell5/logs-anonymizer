"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { LogsPanel } from "@/components/LogsPanel";
import { RulesEditor } from "@/components/RulesEditor";
import { HistoryPanel } from "@/components/HistoryPanel";
import { MappingPanel } from "@/components/MappingPanel";
import { ProfilesPanel } from "@/components/ProfilesPanel";
import { DiffView } from "@/components/DiffView";
import { AutoDetectPanel } from "@/components/AutoDetectPanel";
import { RegexBuilder } from "@/components/RegexBuilder";
import { LogTemplatesPanel } from "@/components/LogTemplatesPanel";
import { ThemeToggle } from "@/components/ThemeProvider";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import {
  AnonymizationRule,
  findMatches,
  anonymizeWithMapping,
  PRESET_RULES,
  HIGHLIGHT_COLORS,
} from "@/lib/anonymizer";
import { saveToHistory, saveRulesToStorage, loadRulesFromStorage, downloadAsFile, exportRulesToJson } from "@/lib/storage";

// Créer les règles initiales avec des IDs statiques pour éviter le mismatch d'hydratation
function createInitialRules(): AnonymizationRule[] {
  return PRESET_RULES.slice(0, 3).map((preset, index) => ({
    ...preset,
    id: `initial-rule-${index}`,
    color: HIGHLIGHT_COLORS[index].border,
  }));
}

export default function Home() {
  const [logs, setLogs] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [pendingPattern, setPendingPattern] = useState("");
  const [showDiff, setShowDiff] = useState(false);

  // Undo/Redo pour les règles
  const {
    state: rules,
    setState: setRules,
    undo,
    redo,
    reset: resetRules,
    canUndo,
    canRedo,
  } = useUndoRedo<AnonymizationRule[]>(createInitialRules());

  // Charger les règles sauvegardées au montage
  useEffect(() => {
    setIsClient(true);
    const savedRules = loadRulesFromStorage();
    if (savedRules && savedRules.length > 0) {
      resetRules(savedRules);
    }
  }, [resetRules]);

  // Sauvegarder les règles quand elles changent
  useEffect(() => {
    if (isClient) {
      saveRulesToStorage(rules);
    }
  }, [rules, isClient]);

  // Trouver les matches en temps réel
  const matches = useMemo(() => findMatches(logs, rules), [logs, rules]);

  // Générer le texte anonymisé avec mapping
  const anonymizationResult = useMemo(() => anonymizeWithMapping(logs, rules), [logs, rules]);
  const anonymizedText = anonymizationResult.anonymized;
  const mapping = anonymizationResult.mapping;

  // Sauvegarder dans l'historique (debounced) quand les logs changent significativement
  useEffect(() => {
    if (!isClient || !logs.trim() || matches.length === 0) return;
    
    const timer = setTimeout(() => {
      saveToHistory(logs, rules, matches.length);
    }, 5000);

    return () => clearTimeout(timer);
  }, [logs, rules, matches.length, isClient]);

  // Restaurer depuis l'historique
  const handleRestore = useCallback((restoredLogs: string, restoredRules: AnonymizationRule[]) => {
    setLogs(restoredLogs);
    resetRules(restoredRules);
    toast.success("Session restaurée");
  }, [resetRules]);

  // Charger un profil de règles
  const handleLoadProfile = useCallback((profileRules: AnonymizationRule[]) => {
    setRules(profileRules);
  }, [setRules]);

  // Désanonymiser et afficher le résultat
  const handleDeanonymize = useCallback((text: string) => {
    setLogs(text);
  }, []);

  // Ajouter une règle depuis l'auto-détection
  const handleAddRule = useCallback((rule: AnonymizationRule) => {
    setRules((prev) => [...prev, rule]);
  }, [setRules]);

  // Ajouter plusieurs règles depuis l'auto-détection ou templates
  const handleAddAllRules = useCallback((newRules: AnonymizationRule[]) => {
    setRules((prev) => [...prev, ...newRules]);
  }, [setRules]);

  // Créer une règle depuis le RegexBuilder
  const handlePatternCreate = useCallback((pattern: string, label: string) => {
    const newRule: AnonymizationRule = {
      id: crypto.randomUUID(),
      pattern,
      label,
      color: HIGHLIGHT_COLORS[rules.length % HIGHLIGHT_COLORS.length].border,
      enabled: true,
    };
    setRules((prev) => [...prev, newRule]);
  }, [rules.length, setRules]);

  // Charger un sample depuis les templates
  const handleLoadSample = useCallback((sample: string) => {
    setLogs(sample);
  }, []);

  // Raccourcis clavier globaux
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S pour sauvegarder les règles
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        const json = exportRulesToJson(rules);
        downloadAsFile(json, "anonymizer-rules.json");
        toast.success("Règles exportées", {
          description: "anonymizer-rules.json téléchargé",
        });
      }
      // Ctrl+Shift+C pour copier le texte anonymisé
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        if (anonymizedText) {
          navigator.clipboard.writeText(anonymizedText);
          toast.success("Texte anonymisé copié");
        } else {
          toast.error("Rien à copier", {
            description: "Entrez des logs pour anonymiser",
          });
        }
      }
      // Ctrl+D pour diff view
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        setShowDiff(true);
      }
      // Ctrl+Z pour undo
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
          toast.success("Annulé");
        }
      }
      // Ctrl+Shift+Z ou Ctrl+Y pour redo
      if ((e.ctrlKey && e.shiftKey && e.key === "Z") || (e.ctrlKey && e.key === "y")) {
        e.preventDefault();
        if (canRedo) {
          redo();
          toast.success("Rétabli");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rules, anonymizedText, canUndo, canRedo, undo, redo]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-purple-950/20 overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Log Anonymizer
              </h1>
              <p className="text-xs text-muted-foreground">
                Anonymisez vos logs avant de les partager avec un LLM
              </p>
            </div>
          </div>
          {/* Right side controls */}
          <div className="flex items-center gap-4">
            {/* Undo/Redo buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors rounded hover:bg-muted"
                title="Annuler (Ctrl+Z)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors rounded hover:bg-muted"
                title="Rétablir (Ctrl+Shift+Z)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>
            {isClient && Object.keys(mapping).length > 0 && (
              <MappingPanel mapping={mapping} onDeanonymize={handleDeanonymize} />
            )}
            {isClient && <ProfilesPanel currentRules={rules} onLoadProfile={handleLoadProfile} />}
            {isClient && <RegexBuilder onPatternCreate={handlePatternCreate} testText={logs} />}
            {isClient && <LogTemplatesPanel onApplyTemplate={handleAddAllRules} onLoadSample={handleLoadSample} />}
            {isClient && <HistoryPanel onRestore={handleRestore} />}
            <button
              onClick={() => setShowDiff(true)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              title="Ctrl+D"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
              Diff
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Auto-detect panel */}
      {isClient && logs.length > 50 && (
        <div className="max-w-[1800px] mx-auto w-full px-4 py-2">
          <AutoDetectPanel
            logs={logs}
            rules={rules}
            onAddRule={handleAddRule}
            onAddAllRules={handleAddAllRules}
          />
        </div>
      )}

      {/* Main Content - Split View 2/3 - 1/3 */}
      <main className="flex-1 flex max-w-[1800px] mx-auto w-full min-h-0">
        {/* Logs Panel - 2/3 */}
        <div className="flex-[2] p-4 border-r border-border/50 min-h-0">
          <LogsPanel
            logs={logs}
            onLogsChange={setLogs}
            matches={matches}
            rules={rules}
            pendingPattern={pendingPattern}
            anonymizedText={anonymizedText}
          />
        </div>

        {/* Rules Panel - 1/3 */}
        <div className="flex-1 p-4 min-h-0 overflow-hidden">
          <RulesEditor
            rules={rules}
            onRulesChange={setRules}
            matches={matches}
            logs={logs}
            onPendingPatternChange={setPendingPattern}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-2 text-center text-xs text-muted-foreground flex-shrink-0">
        <div className="flex items-center justify-center gap-4">
          <span>Vos logs restent en local</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-muted-foreground/70">Ctrl+Z undo • Ctrl+D diff • Bulk import ✓</span>
        </div>
      </footer>

      {/* Diff View Modal */}
      <DiffView
        original={logs}
        anonymized={anonymizedText}
        isOpen={showDiff}
        onClose={() => setShowDiff(false)}
      />
    </div>
  );
}
