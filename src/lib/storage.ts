import { AnonymizationRule, RuleProfile, AnonymizationMapping } from "./anonymizer";

const RULES_STORAGE_KEY = "log-anonymizer-rules";
const HISTORY_STORAGE_KEY = "log-anonymizer-history";
const PROFILES_STORAGE_KEY = "log-anonymizer-profiles";
const MAPPINGS_STORAGE_KEY = "log-anonymizer-mappings";

export interface HistoryEntry {
  id: string;
  timestamp: number;
  logsPreview: string;
  rulesCount: number;
  matchesCount: number;
  logs: string;
  rules: AnonymizationRule[];
}

export interface SavedMapping {
  id: string;
  name: string;
  mapping: AnonymizationMapping;
  createdAt: number;
}

// =============== RULES ===============

export function saveRulesToStorage(rules: AnonymizationRule[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
}

export function loadRulesFromStorage(): AnonymizationRule[] | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(RULES_STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return null;

    // Mise à niveau automatique des anciens patterns obsolètes/défaillants
    return parsed.map((rule: AnonymizationRule) => {
      // Corriger l'ancien regex de téléphone qui échouait avec les espaces
      if (
        rule.label === "PHONE" &&
        (rule.pattern === "(?:\\+33|0)[1-9](?:[\\s.-]?\\d{2}){4}" || !rule.pattern.includes("\\s"))
      ) {
        return {
          ...rule,
          pattern:
            "(?:\\+33[\\s.-]?(?:\\(0\\)[\\s.-]?)?|0)[1-9](?:[\\s.-]?\\d{2}){4}\\b|\\+\\d{1,3}[\\s.-]?(?:\\([0-9]{1,4}\\)[\\s.-]?)?[0-9]{3,4}[\\s.-]?[0-9]{3,4}\\b",
        };
      }

      // Corriger l'ancien regex de token qui tronquait les JWTs ou coupait les tokens
      if (
        rule.label === "TOKEN" &&
        rule.pattern === "(?:Bearer\\s+)?[A-Za-z0-9-_]{20,}"
      ) {
        return {
          ...rule,
          pattern:
            "Bearer\\s+[a-zA-Z0-9_.~+/=-]+|\\beyJ[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+\\b|\\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16})\\b",
        };
      }

      return rule;
    });
  } catch {
    return null;
  }
}

export function exportRulesToJson(rules: AnonymizationRule[]): string {
  return JSON.stringify(rules, null, 2);
}

export function importRulesFromJson(json: string): AnonymizationRule[] | null {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (r) =>
        typeof r.pattern === "string" &&
        typeof r.label === "string" &&
        typeof r.enabled === "boolean"
    ).map((r) => ({
      ...r,
      id: r.id || crypto.randomUUID(),
    }));
  } catch {
    return null;
  }
}

// =============== PROFILES ===============

export function saveProfile(name: string, rules: AnonymizationRule[], description?: string): RuleProfile {
  if (typeof window === "undefined") throw new Error("Not in browser");
  
  const profiles = loadProfiles();
  const profile: RuleProfile = {
    id: crypto.randomUUID(),
    name,
    description,
    rules,
    createdAt: Date.now(),
  };
  
  profiles.push(profile);
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  return profile;
}

export function loadProfiles(): RuleProfile[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function deleteProfile(id: string): void {
  if (typeof window === "undefined") return;
  const profiles = loadProfiles();
  const newProfiles = profiles.filter((p) => p.id !== id);
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(newProfiles));
}

export function updateProfile(id: string, updates: Partial<RuleProfile>): void {
  if (typeof window === "undefined") return;
  const profiles = loadProfiles();
  const newProfiles = profiles.map((p) => 
    p.id === id ? { ...p, ...updates } : p
  );
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(newProfiles));
}

// =============== MAPPINGS ===============

export function saveMapping(name: string, mapping: AnonymizationMapping): SavedMapping {
  if (typeof window === "undefined") throw new Error("Not in browser");
  
  const mappings = loadMappings();
  const saved: SavedMapping = {
    id: crypto.randomUUID(),
    name,
    mapping,
    createdAt: Date.now(),
  };
  
  mappings.push(saved);
  localStorage.setItem(MAPPINGS_STORAGE_KEY, JSON.stringify(mappings));
  return saved;
}

export function loadMappings(): SavedMapping[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(MAPPINGS_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function deleteMapping(id: string): void {
  if (typeof window === "undefined") return;
  const mappings = loadMappings();
  const newMappings = mappings.filter((m) => m.id !== id);
  localStorage.setItem(MAPPINGS_STORAGE_KEY, JSON.stringify(newMappings));
}

export function exportMappingToJson(mapping: AnonymizationMapping): string {
  return JSON.stringify(mapping, null, 2);
}

export function importMappingFromJson(json: string): AnonymizationMapping | null {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// =============== FILES ===============

export function downloadAsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// =============== HISTORY ===============

export function saveToHistory(
  logs: string,
  rules: AnonymizationRule[],
  matchesCount: number
): void {
  if (typeof window === "undefined" || !logs.trim()) return;

  const history = loadHistory();
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    logsPreview: logs.slice(0, 100) + (logs.length > 100 ? "..." : ""),
    rulesCount: rules.length,
    matchesCount,
    logs,
    rules,
  };

  const newHistory = [entry, ...history.slice(0, 9)];
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function deleteFromHistory(id: string): void {
  if (typeof window === "undefined") return;
  const history = loadHistory();
  const newHistory = history.filter((h) => h.id !== id);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_STORAGE_KEY);
}
