"use client";

import { useState, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  Upload,
  Download,
  Sparkles,
  Settings2,
  Check,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AnonymizationRule,
  PRESET_RULES,
  HIGHLIGHT_COLORS,
  Match,
} from "@/lib/anonymizer";
import {
  exportRulesToJson,
  importRulesFromJson,
  downloadAsFile,
  readFileContent,
} from "@/lib/storage";
import { toast } from "sonner";

interface RulesBarProps {
  rules: AnonymizationRule[];
  onRulesChange: (rules: AnonymizationRule[]) => void;
  matches: Match[];
  logs: string;
}

export function RulesBar({
  rules,
  onRulesChange,
  matches,
  logs,
}: RulesBarProps) {
  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AnonymizationRule | null>(null);

  // Form states for Add Rule
  const [newPattern, setNewPattern] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newCondition, setNewCondition] = useState("");

  // Form states for Edit Rule
  const [editPattern, setEditPattern] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editCondition, setEditCondition] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Match count per rule
  const matchCounts = useMemo(() => {
    return rules.reduce((acc, rule) => {
      acc[rule.id] = matches.filter((m) => m.ruleId === rule.id).length;
      return acc;
    }, {} as Record<string, number>);
  }, [rules, matches]);

  // Live match count for Add Rule modal
  const addPatternMatchCount = useMemo(() => {
    if (!newPattern.trim() || !logs) return 0;
    try {
      const regex = new RegExp(newPattern, "gi");
      let count = 0;
      let m;
      while ((m = regex.exec(logs)) !== null) {
        if (m[0].length === 0) {
          regex.lastIndex++;
          continue;
        }
        count++;
      }
      return count;
    } catch {
      return -1; // Regex invalide
    }
  }, [newPattern, logs]);

  // Toggle single rule
  const toggleRule = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onRulesChange(
      rules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  // Toggle all rules
  const toggleAll = (enable: boolean) => {
    onRulesChange(rules.map((r) => ({ ...r, enabled: enable })));
    toast.info(enable ? "Toutes les règles sont activées" : "Toutes les règles sont désactivées");
  };

  // Open edit dialog for a rule
  const handleOpenEdit = (rule: AnonymizationRule, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingRule(rule);
    setEditLabel(rule.label);
    setEditPattern(rule.pattern);
    setEditCondition(rule.condition || "");
  };

  // Save edited rule
  const handleSaveEdit = () => {
    if (!editingRule || !editPattern.trim()) return;

    onRulesChange(
      rules.map((r) =>
        r.id === editingRule.id
          ? {
              ...r,
              label: editLabel.trim().toUpperCase() || r.label,
              pattern: editPattern.trim(),
              condition: editCondition.trim() || undefined,
            }
          : r
      )
    );
    setEditingRule(null);
    toast.success("Règle mise à jour");
  };

  // Delete a rule
  const handleDeleteRule = (id: string, label: string) => {
    onRulesChange(rules.filter((r) => r.id !== id));
    if (editingRule?.id === id) {
      setEditingRule(null);
    }
    toast.info(`Règle ${label} supprimée`);
  };

  // Add new rule
  const handleAddRule = () => {
    if (!newPattern.trim() || addPatternMatchCount === -1) return;

    const colorIndex = rules.length % HIGHLIGHT_COLORS.length;
    const newRule: AnonymizationRule = {
      id: crypto.randomUUID(),
      pattern: newPattern.trim(),
      label: newLabel.trim().toUpperCase() || `CUSTOM_${rules.length + 1}`,
      color: HIGHLIGHT_COLORS[colorIndex].border,
      enabled: true,
      condition: newCondition.trim() || undefined,
    };

    onRulesChange([...rules, newRule]);
    setNewPattern("");
    setNewLabel("");
    setNewCondition("");
    setIsAddOpen(false);
    toast.success(`Règle ${newRule.label} créée`);
  };

  // Add preset rule
  const addPreset = (preset: Omit<AnonymizationRule, "id">) => {
    const exists = rules.some((r) => r.pattern === preset.pattern);
    if (exists) {
      toast.info(`La règle ${preset.label} existe déjà`);
      return;
    }

    const colorIndex = rules.length % HIGHLIGHT_COLORS.length;
    const newRule: AnonymizationRule = {
      ...preset,
      id: crypto.randomUUID(),
      color: HIGHLIGHT_COLORS[colorIndex].border,
      enabled: true,
    };
    onRulesChange([...rules, newRule]);
    toast.success(`Preset ${preset.label} ajouté aux règles`);
  };

  // Export rules to JSON
  const handleExport = () => {
    const json = exportRulesToJson(rules);
    downloadAsFile(json, "anonymizer-rules.json");
    toast.success("Règles exportées (anonymizer-rules.json)");
  };

  // Import rules from JSON
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await readFileContent(file);
      const importedRules = importRulesFromJson(content);
      if (importedRules && importedRules.length > 0) {
        onRulesChange([...rules, ...importedRules]);
        toast.success(`${importedRules.length} règles importées`);
      } else {
        toast.error("Format de règles invalide");
      }
    } catch {
      toast.error("Erreur lors de la lecture du fichier");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Reset to default presets
  const handleResetDefaults = () => {
    const defaultRules = PRESET_RULES.slice(0, 5).map((preset, index) => ({
      ...preset,
      id: crypto.randomUUID(),
      color: HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length].border,
      enabled: true,
    }));
    onRulesChange(defaultRules);
    toast.success("Règles réinitialisées aux 5 standards (EMAIL, IP, UUID, PHONE, TOKEN)");
  };

  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="w-full bg-card/70 backdrop-blur-md border border-border/70 rounded-xl p-2 shadow-xs transition-all animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Section Header & Chips */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
          {/* Header Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border/50 text-xs font-semibold text-foreground shrink-0 select-none">
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
            <span>Règles</span>
            <Badge
              variant="secondary"
              className="h-4 px-1 text-[10px] bg-purple-500/20 text-purple-300 border-none font-mono"
            >
              {activeCount}/{rules.length}
            </Badge>
          </div>

          {/* Rules Chips List */}
          <div className="flex flex-wrap items-center gap-1.5">
            {rules.map((rule, index) => {
              const color = HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
              const count = matchCounts[rule.id] || 0;

              return (
                <div
                  key={rule.id}
                  onClick={() => toggleRule(rule.id)}
                  className={`group relative flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all select-none border ${
                    rule.enabled
                      ? "bg-muted/80 text-foreground border-border/80 shadow-xs hover:border-purple-400/80 hover:bg-muted"
                      : "bg-muted/20 text-muted-foreground/60 border-border/40 hover:border-border line-through hover:no-underline"
                  }`}
                  style={{
                    boxShadow: rule.enabled ? `0 0 0 1px ${color.border}20` : undefined,
                  }}
                  title={
                    rule.enabled
                      ? `Cliquer pour désactiver ${rule.label} (${count} matches)\nRegex: ${rule.pattern}`
                      : `Cliquer pour activer ${rule.label}`
                  }
                >
                  {/* Colored status dot */}
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 transition-opacity ${
                      rule.enabled ? "opacity-100" : "opacity-30"
                    }`}
                    style={{ backgroundColor: color.border }}
                  />

                  {/* Label */}
                  <span className="font-semibold text-[11px] tracking-wide">
                    {rule.label}
                  </span>

                  {/* Match Count Badge */}
                  {rule.enabled && (
                    <span
                      className={`text-[10px] font-mono px-1 py-0.2 rounded-full font-bold transition-transform ${
                        count > 0 ? "scale-100" : "opacity-40"
                      }`}
                      style={{
                        backgroundColor: count > 0 ? `${color.border}25` : "transparent",
                        color: count > 0 ? color.border : "inherit",
                      }}
                    >
                      {count}
                    </span>
                  )}

                  {/* Edit button */}
                  <button
                    onClick={(e) => handleOpenEdit(rule, e)}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 transition-opacity"
                    title="Modifier la règle"
                  >
                    <Settings2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Quick Add Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="h-7 px-2 text-xs gap-1 border-dashed border-purple-500/40 hover:border-purple-500 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Règle</span>
            </Button>

            {/* Presets Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPresetsOpen(true)}
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Presets</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </Button>
          </div>
        </div>

        {/* Right: Actions (Toggle all, Import/Export, Total Matches) */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {matches.length > 0 && (
            <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
              <Check className="w-3 h-3" />
              <span>{matches.length} anonymisations</span>
            </div>
          )}

          <div className="flex items-center gap-0.5 border-l border-border/50 pl-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleAll(activeCount < rules.length)}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {activeCount === rules.length ? "Tout désactiver" : "Tout activer"}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Importer des règles JSON"
            >
              <Upload className="w-3.5 h-3.5" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleExport}
              disabled={rules.length === 0}
              className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Exporter les règles JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleResetDefaults}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Réinitialiser les règles par défaut"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* ===================== DIALOG: ADD RULE ===================== */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4 text-purple-400" />
              Ajouter une Règle d&apos;Anonymisation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Expression Régulière (Regex) <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  placeholder="ex: \b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
                  className={`font-mono text-xs pr-14 ${
                    addPatternMatchCount === -1 && newPattern ? "border-destructive text-destructive" : ""
                  }`}
                  autoFocus
                />
                {newPattern.trim() && (
                  <div className="absolute right-2 top-2">
                    {addPatternMatchCount > 0 ? (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-emerald-500/20 text-emerald-400">
                        {addPatternMatchCount} match{addPatternMatchCount > 1 ? "es" : ""}
                      </Badge>
                    ) : addPatternMatchCount === -1 ? (
                      <Badge variant="destructive" className="h-5 px-1 text-[10px]">
                        Invalide
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">0 match</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Label de Remplacement
              </label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value.toUpperCase())}
                placeholder="Ex: API_KEY, USERNAME, CLIENT_ID..."
                className="text-xs uppercase font-medium"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Sera remplacé par <code className="text-purple-400 font-mono">[{newLabel.toUpperCase() || "LABEL"}_1]</code> dans vos logs.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Condition de contexte (optionnelle)
              </label>
              <Input
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="ex: error|failed|security (n'anonymise que si la ligne contient ce motif)"
                className="text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="text-xs">
              Annuler
            </Button>
            <Button
              onClick={handleAddRule}
              disabled={!newPattern.trim() || addPatternMatchCount === -1}
              className="text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium"
            >
              Ajouter la règle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== DIALOG: EDIT RULE ===================== */}
      <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Settings2 className="w-4 h-4 text-purple-400" />
                Modifier la Règle {editingRule?.label}
              </DialogTitle>
              {editingRule && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteRule(editingRule.id, editingRule.label)}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Label de Remplacement
              </label>
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value.toUpperCase())}
                placeholder="LABEL"
                className="text-xs uppercase font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Expression Régulière (Regex)
              </label>
              <Input
                value={editPattern}
                onChange={(e) => setEditPattern(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Condition de contexte (optionnelle)
              </label>
              <Input
                value={editCondition}
                onChange={(e) => setEditCondition(e.target.value)}
                placeholder="ex: error|token|auth"
                className="text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="ghost" onClick={() => setEditingRule(null)} className="text-xs">
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editPattern.trim()}
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-medium"
            >
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== DIALOG: PRESETS ===================== */}
      <Dialog open={isPresetsOpen} onOpenChange={setIsPresetsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Presets de Règles Prédéfinies
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Cliquez sur un preset pour l&apos;ajouter immédiatement à votre barre de règles actives :
          </p>

          <ScrollArea className="max-h-80 pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {PRESET_RULES.map((preset, index) => {
                const isAdded = rules.some((r) => r.pattern === preset.pattern);
                return (
                  <div
                    key={index}
                    onClick={() => !isAdded && addPreset(preset)}
                    className={`p-2.5 rounded-lg border transition-all text-left flex flex-col justify-between gap-1.5 ${
                      isAdded
                        ? "bg-muted/40 border-border/50 text-muted-foreground opacity-70"
                        : "bg-card/80 border-border/60 hover:border-purple-500/50 hover:bg-muted/50 cursor-pointer shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">
                        {preset.label}
                      </span>
                      {isAdded ? (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] text-emerald-400 bg-emerald-500/10">
                          Actif ✓
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-purple-400 font-medium">+ Ajouter</span>
                      )}
                    </div>
                    <code className="text-[10px] font-mono text-muted-foreground/80 truncate block bg-background/50 p-1 rounded">
                      {preset.pattern}
                    </code>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPresetsOpen(false)} className="text-xs">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
