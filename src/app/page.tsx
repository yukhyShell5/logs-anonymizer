"use client";

import { useState, useMemo, useEffect, useCallback, useSyncExternalStore } from "react";
import { Shield, Undo2, Redo2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { LogsPanel } from "@/components/LogsPanel";
import { RulesBar } from "@/components/RulesBar";
import { HistoryPanel } from "@/components/HistoryPanel";
import { MappingPanel } from "@/components/MappingPanel";
import { ProfilesPanel } from "@/components/ProfilesPanel";
import { DiffView } from "@/components/DiffView";
import { AutoDetectPanel } from "@/components/AutoDetectPanel";
import { RegexBuilder } from "@/components/RegexBuilder";
import { LogTemplatesPanel } from "@/components/LogTemplatesPanel";
import { ThemeToggle } from "@/components/ThemeProvider";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { Button } from "@/components/ui/button";
import {
  AnonymizationRule,
  findMatches,
  anonymizeWithMapping,
  PRESET_RULES,
  HIGHLIGHT_COLORS,
} from "@/lib/anonymizer";
import { saveToHistory, saveRulesToStorage, loadRulesFromStorage, downloadAsFile, exportRulesToJson } from "@/lib/storage";

const DEFAULT_SAMPLE_LOG = `2024-11-20T10:14:22.104Z [INFO] AuthHandler: User login attempt from ip=192.168.1.42 with email=alex.dupont@corp-service.com
2024-11-20T10:14:22.180Z [DEBUG] SessionManager: Generated session token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsZXgiLCJpYXQiOjE1MTYyMzkwMjJ9.4pePIRqda7GZc
2024-11-20T10:14:23.012Z [INFO] PaymentService: Processing order id=e4b8a7c2-9f31-4b72-8821-6d9b01c54e89 for customer phone=+33 6 12 34 56 78
2024-11-20T10:14:24.450Z [WARN] DatabaseClient: Query timeout on node 10.0.4.15:5432 - retrying query for user_id=e4b8a7c2-9f31-4b72-8821-6d9b01c54e89
2024-11-20T10:14:25.890Z [INFO] NotificationWorker: Sent verification email to alex.dupont@corp-service.com via smtp server 192.168.1.42`;

// Créer les règles initiales avec des IDs statiques (EMAIL, IP, UUID, PHONE, TOKEN)
function createInitialRules(): AnonymizationRule[] {
  return PRESET_RULES.slice(0, 5).map((preset, index) => ({
    ...preset,
    id: `initial-rule-${index}`,
    color: HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length].border,
    enabled: true,
  }));
}

export default function Home() {
  const [logs, setLogs] = useState("");
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
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
    const savedRules = loadRulesFromStorage();
    if (savedRules && savedRules.length > 0) {
      queueMicrotask(() => {
        resetRules(savedRules);
      });
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
    }, 4000);

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

  // Charger un sample depuis les templates ou bouton direct
  const handleLoadSample = useCallback((sample?: string) => {
    setLogs(sample || DEFAULT_SAMPLE_LOG);
    toast.success("Exemple de logs chargé");
  }, []);

  // Raccourcis clavier globaux
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S pour sauvegarder/exporter les règles
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const json = exportRulesToJson(rules);
        downloadAsFile(json, "anonymizer-rules.json");
        toast.success("Règles exportées (anonymizer-rules.json)");
      }
      // Ctrl+Shift+C pour copier le texte anonymisé
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        if (anonymizedText) {
          navigator.clipboard.writeText(anonymizedText);
          toast.success("Texte anonymisé copié dans le presse-papiers");
        } else {
          toast.error("Rien à copier", {
            description: "Entrez des logs pour anonymiser",
          });
        }
      }
      // Ctrl+D pour diff view
      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setShowDiff(true);
      }
      // Ctrl+Z pour undo
      if (e.ctrlKey && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
          toast.success("Modification de règle annulée");
        }
      }
      // Ctrl+Shift+Z ou Ctrl+Y pour redo
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z") || (e.ctrlKey && e.key.toLowerCase() === "y")) {
        e.preventDefault();
        if (canRedo) {
          redo();
          toast.success("Modification de règle rétablie");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rules, anonymizedText, canUndo, canRedo, undo, redo]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden pt-[2.25rem]">
      {/* App Header */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold bg-gradient-to-r from-purple-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
                  Log Anonymizer
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-medium">
                  <Lock className="w-2.5 h-2.5" /> 100% Local
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden md:block">
                Masquez vos données sensibles (IPs, emails, tokens...) avant envoi au LLM
              </p>
            </div>
          </div>

          {/* Right Tools Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Undo/Redo Buttons */}
            <div className="flex items-center gap-0.5 bg-muted/40 border border-border/50 rounded-md p-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={undo}
                disabled={!canUndo}
                className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                title="Annuler modification règle (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={redo}
                disabled={!canRedo}
                className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                title="Rétablir modification règle (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Quick Sample Button if empty */}
            {!logs && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLoadSample()}
                className="h-8 gap-1.5 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exemple</span>
              </Button>
            )}

            {/* Modals & Tools */}
            {isClient && <MappingPanel mapping={mapping} onDeanonymize={handleDeanonymize} />}
            {isClient && <ProfilesPanel currentRules={rules} onLoadProfile={handleLoadProfile} />}
            {isClient && <RegexBuilder onPatternCreate={handlePatternCreate} testText={logs} />}
            {isClient && <LogTemplatesPanel onApplyTemplate={handleAddAllRules} onLoadSample={handleLoadSample} />}
            {isClient && <HistoryPanel onRestore={handleRestore} />}

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Auto-detect notification banner */}
      {isClient && logs.length > 30 && (
        <div className="shrink-0">
          <AutoDetectPanel
            logs={logs}
            rules={rules}
            onAddRule={handleAddRule}
            onAddAllRules={handleAddAllRules}
          />
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col max-w-[1920px] mx-auto w-full min-h-0 overflow-hidden p-3 gap-2.5">
        {/* Interactive Rules Bar directly above the logs */}
        <div className="shrink-0">
          <RulesBar
            rules={rules}
            onRulesChange={setRules}
            matches={matches}
            logs={logs}
          />
        </div>

        {/* Logs Panel (Original + Anonymisé) - 100% full width and height */}
        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          <LogsPanel
            logs={logs}
            onLogsChange={setLogs}
            matches={matches}
            rules={rules}
            anonymizedText={anonymizedText}
            onOpenDiff={() => setShowDiff(true)}
            onLoadSample={() => handleLoadSample()}
          />
        </div>
      </main>

      {/* Sleek Minimal Footer */}
      <footer className="border-t border-border/50 py-1.5 px-4 text-center text-[11px] text-muted-foreground shrink-0 bg-background/50">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Aucune donnée n&apos;est transmise à un serveur externe. Traitement 100% local.
          </span>
          <span className="hidden sm:inline text-muted-foreground/60">
            Ctrl+D diff • Ctrl+Z undo • Ctrl+Shift+C copier • Ctrl+S exporter règles
          </span>
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
