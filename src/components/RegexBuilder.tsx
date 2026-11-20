"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RegexBuilderProps {
  onPatternCreate: (pattern: string, label: string) => void;
  testText?: string;
}

// Composants de regex prédéfinis
const REGEX_COMPONENTS = {
  characters: [
    { label: "Lettre", pattern: "[a-zA-Z]", desc: "Une lettre" },
    { label: "Lettres+", pattern: "[a-zA-Z]+", desc: "Une ou plusieurs lettres" },
    { label: "Chiffre", pattern: "\\d", desc: "Un chiffre" },
    { label: "Chiffres+", pattern: "\\d+", desc: "Un ou plusieurs chiffres" },
    { label: "Alphanum", pattern: "\\w", desc: "Lettre, chiffre ou _" },
    { label: "Alphanum+", pattern: "\\w+", desc: "Un ou plusieurs" },
    { label: "Espace", pattern: "\\s", desc: "Espace ou tab" },
    { label: "N'importe", pattern: ".", desc: "N'importe quel caractère" },
  ],
  anchors: [
    { label: "Début", pattern: "^", desc: "Début de ligne" },
    { label: "Fin", pattern: "$", desc: "Fin de ligne" },
    { label: "Mot début", pattern: "\\b", desc: "Limite de mot" },
  ],
  quantifiers: [
    { label: "0 ou +", pattern: "*", desc: "Zéro ou plus" },
    { label: "1 ou +", pattern: "+", desc: "Un ou plus" },
    { label: "0 ou 1", pattern: "?", desc: "Optionnel" },
    { label: "{n}", pattern: "{3}", desc: "Exactement n fois" },
    { label: "{n,m}", pattern: "{1,3}", desc: "Entre n et m fois" },
  ],
  groups: [
    { label: "Groupe", pattern: "()", desc: "Groupe de capture" },
    { label: "Ou", pattern: "|", desc: "Alternative" },
    { label: "Classe", pattern: "[]", desc: "Classe de caractères" },
    { label: "Négation", pattern: "[^]", desc: "Classe négative" },
  ],
  common: [
    { label: "Email", pattern: "[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}", desc: "Adresse email" },
    { label: "IPv4", pattern: "\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b", desc: "Adresse IP" },
    { label: "URL", pattern: "https?://[^\\s]+", desc: "URL HTTP(S)" },
    { label: "UUID", pattern: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", desc: "UUID" },
    { label: "Date ISO", pattern: "\\d{4}-\\d{2}-\\d{2}", desc: "YYYY-MM-DD" },
    { label: "Heure", pattern: "\\d{2}:\\d{2}:\\d{2}", desc: "HH:MM:SS" },
    { label: "Téléphone", pattern: "(?:\\+33[\\s.-]?(?:\\(0\\)[\\s.-]?)?|0)[1-9](?:[\\s.-]?\\d{2}){4}\\b", desc: "+33 ou 0..." },
    { label: "Bearer Token", pattern: "Bearer\\s+[a-zA-Z0-9_.~+/=-]+", desc: "Token d'autorisation" },
    { label: "JWT", pattern: "eyJ[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+", desc: "JSON Web Token" },
  ],
};

export function RegexBuilder({ onPatternCreate, testText = "" }: RegexBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pattern, setPattern] = useState("");
  const [label, setLabel] = useState("");
  const [activeTab, setActiveTab] = useState<keyof typeof REGEX_COMPONENTS>("common");

  // Tester le pattern
  const testResult = useMemo(() => {
    if (!pattern) return { valid: false, matches: [], count: 0 };
    try {
      const regex = new RegExp(pattern, "gi");
      // Valider la syntaxe même sans texte de test
      if (!testText) return { valid: true, matches: [], count: 0 };
      const matches = testText.match(regex) || [];
      return { valid: true, matches: matches.slice(0, 5), count: matches.length };
    } catch {
      return { valid: false, matches: [], count: 0, error: "Regex invalide" };
    }
  }, [pattern, testText]);

  const addComponent = (comp: string) => {
    setPattern((prev) => prev + comp);
  };

  const handleCreate = () => {
    if (!pattern.trim() || !testResult.valid) return;
    onPatternCreate(pattern, label.toUpperCase() || "CUSTOM");
    setPattern("");
    setLabel("");
    setIsOpen(false);
    toast.success("Règle créée");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Wand2 className="w-3.5 h-3.5 text-purple-400" />
        <span>Builder</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
              Regex Builder
            </DialogTitle>
          </DialogHeader>

          {/* Pattern input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="Construisez votre regex..."
                className={`font-mono flex-1 ${!testResult.valid && pattern ? "border-red-500" : ""}`}
              />
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value.toUpperCase())}
                placeholder="LABEL"
                className="w-24 uppercase"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={testResult.valid ? "text-green-400" : "text-red-400"}>
                {pattern ? (testResult.valid ? `✓ ${testResult.count} match(es)` : "✗ Regex invalide") : "Entrez un pattern"}
              </span>
              <button onClick={() => setPattern("")} className="text-muted-foreground hover:text-foreground">
                Effacer
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border pb-2">
            {(Object.keys(REGEX_COMPONENTS) as Array<keyof typeof REGEX_COMPONENTS>).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  activeTab === tab ? "bg-purple-500/20 text-purple-400" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "characters" ? "Caractères" : 
                 tab === "anchors" ? "Ancres" :
                 tab === "quantifiers" ? "Quantifieurs" :
                 tab === "groups" ? "Groupes" : "Communs"}
              </button>
            ))}
          </div>

          {/* Components grid */}
          <ScrollArea className="h-32">
            <div className="grid grid-cols-4 gap-2">
              {REGEX_COMPONENTS[activeTab].map((comp, i) => (
                <button
                  key={i}
                  onClick={() => addComponent(comp.pattern)}
                  className="p-2 text-left rounded bg-muted/50 hover:bg-muted transition-colors group"
                  title={comp.desc}
                >
                  <div className="text-xs font-medium">{comp.label}</div>
                  <code className="text-xs text-muted-foreground group-hover:text-purple-400 truncate block">
                    {comp.pattern}
                  </code>
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Test results */}
          {testResult.matches.length > 0 && (
            <div className="p-2 bg-muted/50 rounded">
              <div className="text-xs text-muted-foreground mb-1">Exemples de matches:</div>
              <div className="flex flex-wrap gap-1">
                {testResult.matches.map((m, i) => (
                  <Badge key={i} variant="secondary" className="font-mono text-xs">
                    {m.slice(0, 30)}{m.length > 30 ? "..." : ""}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!pattern.trim() || !testResult.valid}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              Créer la règle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
