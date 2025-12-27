export interface AnonymizationRule {
  id: string;
  pattern: string;
  label: string;
  color: string;
  enabled: boolean;
  // Règle conditionnelle - n'anonymise que si le contexte est présent sur la même ligne
  condition?: string;
}

export interface Match {
  ruleId: string;
  text: string;
  start: number;
  end: number;
  replacementIndex: number;
}

// Mapping pour la désanonymisation
export interface AnonymizationMapping {
  [placeholder: string]: string;
}

// Profil de règles
export interface RuleProfile {
  id: string;
  name: string;
  description?: string;
  rules: AnonymizationRule[];
  createdAt: number;
}

// Résultat d'anonymisation avec mapping
export interface AnonymizationResult {
  anonymized: string;
  mapping: AnonymizationMapping;
  reverseMapping: AnonymizationMapping;
}

// Couleurs pour le highlighting des matches (style regex101)
export const HIGHLIGHT_COLORS = [
  { bg: "rgba(147, 51, 234, 0.3)", border: "#9333ea" },   // purple
  { bg: "rgba(59, 130, 246, 0.3)", border: "#3b82f6" },   // blue
  { bg: "rgba(34, 197, 94, 0.3)", border: "#22c55e" },    // green
  { bg: "rgba(249, 115, 22, 0.3)", border: "#f97316" },   // orange
  { bg: "rgba(236, 72, 153, 0.3)", border: "#ec4899" },   // pink
  { bg: "rgba(20, 184, 166, 0.3)", border: "#14b8a6" },   // teal
  { bg: "rgba(245, 158, 11, 0.3)", border: "#f59e0b" },   // amber
  { bg: "rgba(99, 102, 241, 0.3)", border: "#6366f1" },   // indigo
];

// Règles prédéfinies communes
export const PRESET_RULES: Omit<AnonymizationRule, "id">[] = [
  {
    pattern: "[\\w.-]+@[\\w.-]+\\.\\w+",
    label: "EMAIL",
    color: HIGHLIGHT_COLORS[0].border,
    enabled: true,
  },
  {
    pattern: "\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b",
    label: "IP",
    color: HIGHLIGHT_COLORS[1].border,
    enabled: true,
  },
  {
    pattern: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
    label: "UUID",
    color: HIGHLIGHT_COLORS[2].border,
    enabled: true,
  },
  {
    pattern: "eyJ[\\w-]+\\.[\\w-]+\\.[\\w-]+",
    label: "JWT",
    color: HIGHLIGHT_COLORS[3].border,
    enabled: false,
  },
  {
    pattern: "(?:\\+33|0)[1-9](?:[\\s.-]?\\d{2}){4}",
    label: "PHONE",
    color: HIGHLIGHT_COLORS[4].border,
    enabled: false,
  },
  {
    pattern: "(?:Bearer\\s+)?[A-Za-z0-9-_]{20,}",
    label: "TOKEN",
    color: HIGHLIGHT_COLORS[5].border,
    enabled: false,
  },
];

/**
 * Vérifie si une condition est satisfaite pour une ligne donnée
 */
function checkCondition(line: string, condition?: string): boolean {
  if (!condition) return true;
  try {
    const conditionRegex = new RegExp(condition, "i");
    return conditionRegex.test(line);
  } catch {
    return true; // Si la condition est invalide, on l'ignore
  }
}

/**
 * Trouve la ligne contenant une position donnée
 */
function getLineAtPosition(text: string, position: number): string {
  const lineStart = text.lastIndexOf("\n", position - 1) + 1;
  const lineEnd = text.indexOf("\n", position);
  return text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
}

/**
 * Trouve toutes les correspondances pour les règles activées
 * Les valeurs identiques reçoivent le même index de remplacement
 * Supporte les règles conditionnelles
 */
export function findMatches(logs: string, rules: AnonymizationRule[]): Match[] {
  const matches: Match[] = [];
  const valueIndexes: Record<string, Map<string, number>> = {};

  const enabledRules = rules.filter((r) => r.enabled);

  for (const rule of enabledRules) {
    try {
      const regex = new RegExp(rule.pattern, "gi");
      let match;
      valueIndexes[rule.id] = new Map();
      let nextIndex = 1;

      while ((match = regex.exec(logs)) !== null) {
        // Vérifier la condition si elle existe
        if (rule.condition) {
          const line = getLineAtPosition(logs, match.index);
          if (!checkCondition(line, rule.condition)) {
            continue; // Skip ce match car la condition n'est pas satisfaite
          }
        }

        const matchText = match[0];
        const normalizedText = matchText.toLowerCase();
        
        let replacementIndex: number;
        if (valueIndexes[rule.id].has(normalizedText)) {
          replacementIndex = valueIndexes[rule.id].get(normalizedText)!;
        } else {
          replacementIndex = nextIndex++;
          valueIndexes[rule.id].set(normalizedText, replacementIndex);
        }

        matches.push({
          ruleId: rule.id,
          text: matchText,
          start: match.index,
          end: match.index + match[0].length,
          replacementIndex,
        });
      }
    } catch {
      console.warn(`Invalid regex pattern: ${rule.pattern}`);
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

/**
 * Anonymise le texte et génère le mapping pour désanonymisation
 */
export function anonymize(logs: string, rules: AnonymizationRule[]): string {
  const result = anonymizeWithMapping(logs, rules);
  return result.anonymized;
}

/**
 * Anonymise le texte et retourne le mapping complet
 */
export function anonymizeWithMapping(logs: string, rules: AnonymizationRule[]): AnonymizationResult {
  const matches = findMatches(logs, rules);
  const mapping: AnonymizationMapping = {};
  const reverseMapping: AnonymizationMapping = {};

  const sortedMatches = [...matches].sort((a, b) => b.start - a.start);

  let result = logs;
  for (const match of sortedMatches) {
    const rule = rules.find((r) => r.id === match.ruleId);
    if (rule) {
      const placeholder = `[${rule.label}_${match.replacementIndex}]`;
      mapping[placeholder] = match.text;
      reverseMapping[match.text] = placeholder;
      result = result.slice(0, match.start) + placeholder + result.slice(match.end);
    }
  }

  return { anonymized: result, mapping, reverseMapping };
}

/**
 * Désanonymise un texte en utilisant le mapping
 */
export function deanonymize(anonymizedText: string, mapping: AnonymizationMapping): string {
  let result = anonymizedText;
  for (const [placeholder, original] of Object.entries(mapping)) {
    result = result.split(placeholder).join(original);
  }
  return result;
}

/**
 * Valide une regex et retourne des informations
 */
export function validateRegex(pattern: string): { 
  valid: boolean; 
  error?: string;
  description?: string;
} {
  try {
    new RegExp(pattern);
    
    // Générer une description basique
    const descriptions: string[] = [];
    
    if (pattern.includes("\\d")) descriptions.push("chiffres");
    if (pattern.includes("\\w")) descriptions.push("caractères alphanumériques");
    if (pattern.includes("@")) descriptions.push("symbole @");
    if (pattern.includes("\\.")) descriptions.push("points");
    if (pattern.includes("\\b")) descriptions.push("limites de mots");
    if (pattern.includes("+")) descriptions.push("répétitions");
    if (pattern.includes("*")) descriptions.push("zéro ou plus");
    if (pattern.includes("?")) descriptions.push("optionnel");
    if (pattern.includes("|")) descriptions.push("alternatives");
    if (pattern.includes("[") && pattern.includes("]")) descriptions.push("classes de caractères");
    if (pattern.includes("(") && pattern.includes(")")) descriptions.push("groupes");
    
    return {
      valid: true,
      description: descriptions.length > 0 
        ? `Recherche: ${descriptions.join(", ")}`
        : "Pattern regex valide"
    };
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : "Regex invalide"
    };
  }
}

/**
 * Obtient la couleur pour une règle donnée
 */
export function getRuleColor(index: number): { bg: string; border: string } {
  return HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
}
