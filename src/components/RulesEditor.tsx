"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface RulesEditorProps {
  rules: AnonymizationRule[];
  onRulesChange: (rules: AnonymizationRule[]) => void;
  matches: Match[];
  logs: string;
  onPendingPatternChange?: (pattern: string) => void;
}

export function RulesEditor({ rules, onRulesChange, matches, logs, onPendingPatternChange }: RulesEditorProps) {
  const [newPattern, setNewPattern] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notifier le parent quand le pattern change
  useEffect(() => {
    onPendingPatternChange?.(newPattern);
  }, [newPattern, onPendingPatternChange]);

  // Preview du nombre de matches pour le nouveau pattern en temps réel
  const newPatternMatchCount = useMemo(() => {
    if (!newPattern || !logs) return 0;
    try {
      const regex = new RegExp(newPattern, "gi");
      const matchArray = logs.match(regex);
      return matchArray ? matchArray.length : 0;
    } catch {
      return -1; // Regex invalide
    }
  }, [newPattern, logs]);

  const addRule = () => {
    if (!newPattern.trim()) return;
    
    const colorIndex = rules.length % HIGHLIGHT_COLORS.length;
    const newRule: AnonymizationRule = {
      id: crypto.randomUUID(),
      pattern: newPattern,
      label: newLabel.trim() || `CUSTOM_${rules.length + 1}`,
      color: HIGHLIGHT_COLORS[colorIndex].border,
      enabled: true,
    };
    onRulesChange([...rules, newRule]);
    setNewPattern("");
    setNewLabel("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newPattern.trim()) {
      addRule();
    }
  };

  const updateRule = (id: string, updates: Partial<AnonymizationRule>) => {
    onRulesChange(
      rules.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
    );
  };

  const deleteRule = (id: string) => {
    onRulesChange(rules.filter((rule) => rule.id !== id));
  };

  const toggleRule = (id: string) => {
    onRulesChange(
      rules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  const addPreset = (preset: Omit<AnonymizationRule, "id">) => {
    const exists = rules.some((r) => r.pattern === preset.pattern);
    if (exists) return;

    const newRule: AnonymizationRule = {
      ...preset,
      id: crypto.randomUUID(),
    };
    onRulesChange([...rules, newRule]);
  };

  // Export rules as JSON
  const handleExport = () => {
    const json = exportRulesToJson(rules);
    downloadAsFile(json, "anonymizer-rules.json");
  };

  // Import rules from JSON file
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await readFileContent(file);
      const importedRules = importRulesFromJson(content);
      if (importedRules) {
        onRulesChange([...rules, ...importedRules]);
      }
    } catch (error) {
      console.error("Error importing rules:", error);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Compter les matches par règle
  const matchCounts = rules.reduce((acc, rule) => {
    acc[rule.id] = matches.filter((m) => m.ruleId === rule.id).length;
    return acc;
  }, {} as Record<string, number>);

  // Couleur pour le preview du nouveau pattern
  const previewColor = HIGHLIGHT_COLORS[rules.length % HIGHLIGHT_COLORS.length];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header avec titre et boutons import/export */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Règles
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted"
            title="Importer des règles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          <button
            onClick={handleExport}
            disabled={rules.length === 0}
            className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors rounded hover:bg-muted"
            title="Exporter les règles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Nouvelle règle - Input inline comme regex101 */}
      <Card className="p-3 bg-card/50 backdrop-blur border-l-4" style={{ borderLeftColor: previewColor.border }}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 font-mono text-sm"
              placeholder="Entrez un pattern regex..."
              style={{ 
                borderColor: newPatternMatchCount === -1 ? "#ef4444" : undefined,
              }}
            />
            {newPatternMatchCount > 0 && (
              <Badge
                variant="secondary"
                className="text-xs animate-pulse"
                style={{ backgroundColor: previewColor.bg, borderColor: previewColor.border }}
              >
                {newPatternMatchCount}
              </Badge>
            )}
            {newPatternMatchCount === -1 && (
              <Badge variant="destructive" className="text-xs">
                ✗
              </Badge>
            )}
            <Button 
              size="sm" 
              onClick={addRule}
              disabled={!newPattern.trim() || newPatternMatchCount === -1}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            className="h-7 text-xs font-medium uppercase"
            placeholder="LABEL (optionnel)"
          />
        </div>
      </Card>

      {/* Presets */}
      <Card className="p-3 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2 mb-2">
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Règles prédéfinies
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_RULES.map((preset, index) => {
            const isAdded = rules.some((r) => r.pattern === preset.pattern);
            return (
              <Badge
                key={index}
                variant={isAdded ? "secondary" : "outline"}
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => !isAdded && addPreset(preset)}
              >
                {preset.label}
                {isAdded && " ✓"}
              </Badge>
            );
          })}
        </div>
      </Card>

      {/* Statistiques par règle */}
      {matches.length > 0 && (
        <Card className="p-3 bg-card/50 backdrop-blur">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Statistiques
            </span>
            <span className="text-xs text-foreground ml-auto font-medium">
              {matches.length} total
            </span>
          </div>
          <div className="space-y-1">
            {rules.filter(r => r.enabled && matchCounts[r.id] > 0).map((rule, index) => {
              const count = matchCounts[rule.id];
              const percentage = Math.round((count / matches.length) * 100);
              const color = HIGHLIGHT_COLORS[rules.indexOf(rule) % HIGHLIGHT_COLORS.length];
              return (
                <div key={rule.id} className="flex items-center gap-2">
                  <span 
                    className="w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: color.border }}
                  />
                  <span className="text-xs text-muted-foreground flex-1 truncate">
                    {rule.label}
                  </span>
                  <span className="text-xs font-mono text-foreground">
                    {count}
                  </span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percentage}%`, backgroundColor: color.border }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Liste des règles - scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-3">
          {rules.map((rule, index) => {
            const color = HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
            return (
              <Card
                key={rule.id}
                className="p-3 bg-card/50 backdrop-blur border-l-4 transition-all"
                style={{ borderLeftColor: rule.enabled ? color.border : "transparent" }}
              >
                <div className="flex items-start gap-3">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`mt-1 w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${
                      rule.enabled
                        ? "bg-primary border-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {rule.enabled && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10.28 2.28L4 8.56 1.72 6.28a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l7-7a.75.75 0 00-1.06-1.06z" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 space-y-2">
                    {/* Label */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={rule.label}
                        onChange={(e) => updateRule(rule.id, { label: e.target.value })}
                        className="h-7 text-xs font-medium uppercase"
                        placeholder="LABEL"
                      />
                      {matchCounts[rule.id] > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ backgroundColor: color.bg, borderColor: color.border }}
                        >
                          {matchCounts[rule.id]}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Pattern */}
                    <Input
                      value={rule.pattern}
                      onChange={(e) => updateRule(rule.id, { pattern: e.target.value })}
                      className="font-mono text-xs"
                      placeholder="Pattern regex..."
                    />
                    
                    {/* Condition (optionnel) */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={rule.condition || ""}
                        onChange={(e) => updateRule(rule.id, { condition: e.target.value })}
                        className="font-mono text-xs"
                        placeholder="Condition (ex: error|exception)..."
                      />
                      {rule.condition && (
                        <span className="text-xs text-muted-foreground shrink-0" title="Anonymise seulement si cette condition est présente sur la ligne">
                          si ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {rules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Aucune règle définie</p>
              <p className="text-xs mt-1">
                Ajoutez une règle ou sélectionnez un preset
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
