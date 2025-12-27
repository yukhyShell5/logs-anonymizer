"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnonymizationRule } from "@/lib/anonymizer";
import { detectPatterns, SuggestedRule, createRuleFromSuggestion } from "@/lib/performance";

interface AutoDetectPanelProps {
  logs: string;
  rules: AnonymizationRule[];
  onAddRule: (rule: AnonymizationRule) => void;
  onAddAllRules: (rules: AnonymizationRule[]) => void;
}

export function AutoDetectPanel({ logs, rules, onAddRule, onAddAllRules }: AutoDetectPanelProps) {
  const suggestions = useMemo(() => {
    return detectPatterns(logs, rules);
  }, [logs, rules]);

  if (suggestions.length === 0) {
    return null;
  }

  const handleAddRule = (suggestion: SuggestedRule) => {
    const newRule = createRuleFromSuggestion(suggestion, rules.length);
    onAddRule(newRule);
    toast.success(`Règle ${suggestion.label} ajoutée`);
  };

  const handleAddAll = () => {
    const newRules = suggestions.map((s, i) => 
      createRuleFromSuggestion(s, rules.length + i)
    );
    onAddAllRules(newRules);
    toast.success(`${newRules.length} règles ajoutées`);
  };

  return (
    <Card className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-xs font-medium text-purple-400">Auto-détection</span>
          <Badge variant="secondary" className="text-xs">
            {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAddAll}
          className="text-xs h-6 text-purple-400 hover:text-purple-300"
        >
          Tout ajouter
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.slice(0, 6).map((suggestion) => (
          <button
            key={suggestion.label}
            onClick={() => handleAddRule(suggestion)}
            className="group flex items-center gap-1 px-2 py-1 rounded bg-card/50 hover:bg-card transition-colors text-xs"
          >
            <span className="text-foreground font-medium">{suggestion.label}</span>
            <Badge variant="outline" className="text-xs scale-90">
              {suggestion.count}
            </Badge>
            <span className="opacity-0 group-hover:opacity-100 text-green-400 transition-opacity">+</span>
          </button>
        ))}
      </div>
      {suggestions.length > 0 && suggestions[0].examples.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2 truncate">
          Ex: {suggestions[0].examples[0]}
        </p>
      )}
    </Card>
  );
}
