"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnonymizationMapping, deanonymize } from "@/lib/anonymizer";
import { downloadAsFile, exportMappingToJson, importMappingFromJson, readFileContent } from "@/lib/storage";
import { ArrowLeftRight, Download, Upload, Undo2 } from "lucide-react";

interface MappingPanelProps {
  mapping: AnonymizationMapping;
  onDeanonymize?: (text: string) => void;
}

export function MappingPanel({ mapping, onDeanonymize }: MappingPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deanonText, setDeanonText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedMapping, setImportedMapping] = useState<AnonymizationMapping | null>(null);

  const activeMapping = importedMapping || mapping;
  const activeEntriesCount = Object.keys(activeMapping).length;

  const handleExport = () => {
    const json = exportMappingToJson(activeMapping);
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
        toast.error("Format de mapping invalide");
      }
    } catch {
      toast.error("Erreur lors de la lecture du fichier");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeanonymize = () => {
    if (!deanonText.trim()) return;
    const result = deanonymize(deanonText, activeMapping);
    onDeanonymize?.(result);
    setIsOpen(false);
    toast.success("Texte désanonymisé et rechargé dans l'éditeur");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
        <span>Mapping</span>
        {activeEntriesCount > 0 && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
            {activeEntriesCount}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="flex items-center gap-2 text-base">
                <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                Mapping de Désanonymisation
              </DialogTitle>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs gap-1"
                >
                  <Upload className="w-3 h-3" />
                  Importer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExport}
                  disabled={activeEntriesCount === 0}
                  className="h-7 text-xs gap-1"
                >
                  <Download className="w-3 h-3" />
                  Exporter
                </Button>
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              </div>
            </div>
          </DialogHeader>

          {/* Section Désanonymisation */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/40 border border-border/60">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Restaurer un texte anonymisé :</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Remplace les tags ([EMAIL_1], [IP_1]...) par leur valeur d&apos;origine
              </span>
            </label>
            <textarea
              value={deanonText}
              onChange={(e) => setDeanonText(e.target.value)}
              placeholder="Collez ici votre réponse LLM ou texte contenant [TAG_X]..."
              className="w-full h-20 p-2.5 text-xs font-mono bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              size="sm"
              onClick={handleDeanonymize}
              disabled={!deanonText.trim()}
              className="w-full h-8 text-xs gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Désanonymiser et charger dans l&apos;éditeur
            </Button>
          </div>

          {/* Liste des entrées */}
          <div className="flex-1 min-h-0 flex flex-col pt-2">
            <div className="flex items-center justify-between pb-2 text-xs text-muted-foreground font-medium">
              <span>Remplacement ({activeEntriesCount})</span>
              <span>Valeur originale</span>
            </div>
            <ScrollArea className="flex-1 max-h-56 pr-2">
              {activeEntriesCount === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Aucun mapping actif. Les correspondances trouvées dans vos logs apparaîtront ici.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(activeMapping).map(([placeholder, original]) => (
                    <div
                      key={placeholder}
                      className="flex items-center justify-between gap-3 text-xs p-2 rounded-md bg-muted/30 border border-border/40 hover:bg-muted/60 transition-colors"
                    >
                      <Badge variant="secondary" className="font-mono text-[11px] shrink-0 font-medium">
                        {placeholder}
                      </Badge>
                      <span className="text-muted-foreground/60 text-xs">→</span>
                      <span className="font-mono text-foreground truncate max-w-[280px]" title={original}>
                        {original}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
