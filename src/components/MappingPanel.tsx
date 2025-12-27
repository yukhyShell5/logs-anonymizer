"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnonymizationMapping, deanonymize } from "@/lib/anonymizer";
import { downloadAsFile, exportMappingToJson, importMappingFromJson, readFileContent } from "@/lib/storage";
import { useRef } from "react";

interface MappingPanelProps {
  mapping: AnonymizationMapping;
  onDeanonymize?: (text: string) => void;
}

export function MappingPanel({ mapping, onDeanonymize }: MappingPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deanonText, setDeanonText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedMapping, setImportedMapping] = useState<AnonymizationMapping | null>(null);

  const mappingEntries = Object.entries(mapping);
  const activeMapping = importedMapping || mapping;

  const handleExport = () => {
    const json = exportMappingToJson(mapping);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadAsFile(json, `mapping-${timestamp}.json`);
    toast.success("Mapping exporté");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await readFileContent(file);
      const imported = importMappingFromJson(content);
      if (imported) {
        setImportedMapping(imported);
        toast.success("Mapping importé", { description: `${Object.keys(imported).length} entrées` });
      } else {
        toast.error("Format invalide");
      }
    } catch {
      toast.error("Erreur de lecture");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeanonymize = () => {
    if (!deanonText.trim()) return;
    const result = deanonymize(deanonText, activeMapping);
    onDeanonymize?.(result);
    toast.success("Texte désanonymisé");
  };

  if (mappingEntries.length === 0 && !importedMapping) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Mapping ({mappingEntries.length})
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <Card className="absolute left-0 top-8 z-50 w-96 p-4 bg-card/95 backdrop-blur shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Mapping de désanonymisation</span>
              <div className="flex gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                  title="Importer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
                <button
                  onClick={handleExport}
                  disabled={mappingEntries.length === 0}
                  className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50 rounded hover:bg-muted"
                  title="Exporter"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            </div>

            {/* Désanonymisation */}
            <div className="mb-3 p-2 bg-muted/50 rounded">
              <label className="text-xs text-muted-foreground mb-1 block">Coller un texte anonymisé pour le restaurer:</label>
              <textarea
                value={deanonText}
                onChange={(e) => setDeanonText(e.target.value)}
                placeholder="[EMAIL_1] [IP_1]..."
                className="w-full h-16 p-2 text-xs font-mono bg-background border rounded resize-none"
              />
              <Button size="sm" onClick={handleDeanonymize} disabled={!deanonText.trim()} className="w-full mt-2">
                Désanonymiser
              </Button>
            </div>

            {/* Liste des mappings */}
            <ScrollArea className="max-h-48">
              <div className="space-y-1">
                {Object.entries(activeMapping).map(([placeholder, original]) => (
                  <div key={placeholder} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-muted">
                    <Badge variant="secondary" className="font-mono shrink-0">
                      {placeholder}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono text-foreground truncate">{original}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </>
      )}
    </div>
  );
}
