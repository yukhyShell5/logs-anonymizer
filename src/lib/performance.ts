import { AnonymizationRule, PRESET_RULES, HIGHLIGHT_COLORS } from "./anonymizer";

// Patterns pour l'auto-détection
const AUTO_DETECT_PATTERNS = [
  { regex: /[\w.-]+@[\w.-]+\.\w+/g, label: "EMAIL", preset: "EMAIL" },
  { regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, label: "IP", preset: "IP" },
  { regex: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, label: "UUID", preset: "UUID" },
  { regex: /eyJ[\w-]+\.[\w-]+\.[\w-]+/g, label: "JWT", preset: "JWT" },
  { regex: /(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}/g, label: "PHONE", preset: "PHONE" },
  { regex: /Bearer\s+[A-Za-z0-9-_]{20,}/g, label: "TOKEN", preset: "TOKEN" },
  // Patterns supplémentaires
  { regex: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, label: "NOM", preset: null },
  { regex: /\/[a-zA-Z0-9._/-]+\.[a-z]{2,4}\b/g, label: "PATH", preset: null },
  { regex: /https?:\/\/[^\s<>"{}|\\^`[\]]+/g, label: "URL", preset: null },
  { regex: /\b\d{4}[-/]\d{2}[-/]\d{2}(?:[\sT]\d{2}:\d{2}:\d{2})?\b/g, label: "DATE", preset: null },
];

export interface SuggestedRule {
  pattern: string;
  label: string;
  count: number;
  examples: string[];
  isPreset: boolean;
}

/**
 * Auto-détecte les patterns sensibles dans les logs
 */
export function detectPatterns(logs: string, existingRules: AnonymizationRule[]): SuggestedRule[] {
  if (!logs || logs.length < 10) return [];

  const suggestions: SuggestedRule[] = [];
  const existingPatterns = new Set(existingRules.map((r) => r.label.toUpperCase()));

  for (const detector of AUTO_DETECT_PATTERNS) {
    // Skip si déjà une règle avec ce label
    if (existingPatterns.has(detector.label)) continue;

    const matches = logs.match(detector.regex);
    if (matches && matches.length > 0) {
      // Dédupliquer les exemples
      const uniqueExamples = [...new Set(matches)].slice(0, 3);
      
      const preset = detector.preset
        ? PRESET_RULES.find((p) => p.label === detector.preset)
        : null;

      suggestions.push({
        pattern: preset?.pattern || detector.regex.source,
        label: detector.label,
        count: matches.length,
        examples: uniqueExamples,
        isPreset: !!detector.preset,
      });
    }
  }

  // Trier par nombre de matches (plus élevé en premier)
  return suggestions.sort((a, b) => b.count - a.count);
}

/**
 * Crée une règle à partir d'une suggestion
 */
export function createRuleFromSuggestion(
  suggestion: SuggestedRule,
  existingRulesCount: number
): AnonymizationRule {
  return {
    id: crypto.randomUUID(),
    pattern: suggestion.pattern,
    label: suggestion.label,
    color: HIGHLIGHT_COLORS[existingRulesCount % HIGHLIGHT_COLORS.length].border,
    enabled: true,
  };
}

/**
 * Traitement lazy pour gros fichiers (chunks)
 */
export function processLargeFile(
  content: string,
  chunkSize: number = 100000,
  onChunk: (chunk: string, progress: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    const totalChunks = Math.ceil(content.length / chunkSize);
    let currentChunk = 0;

    const processNextChunk = () => {
      if (currentChunk >= totalChunks) {
        resolve();
        return;
      }

      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, content.length);
      const chunk = content.slice(start, end);
      
      const progress = ((currentChunk + 1) / totalChunks) * 100;
      onChunk(chunk, progress);
      
      currentChunk++;
      
      // Utiliser requestAnimationFrame pour ne pas bloquer l'UI
      requestAnimationFrame(processNextChunk);
    };

    processNextChunk();
  });
}

/**
 * Estime si un fichier est "gros" (> 1MB)
 */
export function isLargeFile(content: string): boolean {
  return content.length > 1024 * 1024; // 1MB
}

/**
 * Fusionne plusieurs fichiers
 */
export function mergeFiles(files: string[], separator: string = "\n---\n"): string {
  return files.join(separator);
}
