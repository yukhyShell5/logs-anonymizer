"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnonymizationRule } from "@/lib/anonymizer";
import { detectPatterns, SuggestedRule, createRuleFromSuggestion } from "@/lib/performance";
import { Sparkles, Plus, Check, X } from "lucide-react";

interface AutoDetectPanelProps {
  logs: string;
  rules: AnonymizationRule[];
  onAddRule: (rule: AnonymizationRule) => void;
  onAddAllRules: (rules: AnonymizationRule[]) => void;
}

export function AutoDetectPanel({ logs, rules, onAddRule, onAddAllRules }: AutoDetectPanelProps) {
  const [dismissed, setDismissed] = useState(false);

  const suggestions = useMemo(() => {
    return detectPatterns(logs, rules);
  }, [logs, rules]);

  if (suggestions.length === 0 || dismissed) {
    return null;
  }

  const handleAddRule = (suggestion: SuggestedRule) => {
    const newRule = createRuleFromSuggestion(suggestion, rules.length);
    onAddRule(newRule);
    toast.success(`Règle ${suggestion.label} ajoutée (+${suggestion.count} détections)`);
  };

  const handleAddAll = () => {
    const newRules = suggestions.map((s, i) => 
      createRuleFromSuggestion(s, rules.length + i)
    );
    onAddAllRules(newRules);
    toast.success(`${newRules.length} règles auto-détectées ajoutées`);
  };

  return (
    <div className="mx-auto w-full px-4 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-purple-950/30 border border-purple-500/30 backdrop-blur-md text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-purple-500/20 text-purple-300 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-purple-200 shrink-0">Données sensibles détectées :</span>
          
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {suggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion.label}
                onClick={() => handleAddRule(suggestion)}
                className="group flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/20 hover:border-purple-400 text-[11px] text-purple-100 transition-all shrink-0 cursor-pointer"
                title={`Ajouter ${suggestion.label} (${suggestion.count} occurrences)`}
              >
                <span className="font-semibold">{suggestion.label}</span>
                <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-purple-500/30 text-purple-200 border-none">
                  {suggestion.count}
                </Badge>
                <Plus className="w-3 h-3 text-purple-300 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
            {suggestions.length > 5 && (
              <span className="text-[11px] text-purple-300/70 shrink-0">
                +{suggestions.length - 5} autres
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleAddAll}
            className="h-6 px-2.5 text-[11px] gap-1 bg-purple-600 hover:bg-purple-500 text-white font-medium"
          >
            <Check className="w-3 h-3" />
            Tout masquer ({suggestions.length})
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-purple-400/70 hover:text-purple-200 transition-colors"
            title="Masquer la suggestion"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
