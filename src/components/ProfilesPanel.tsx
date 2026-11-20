"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnonymizationRule, RuleProfile } from "@/lib/anonymizer";
import { loadProfiles, saveProfile, deleteProfile } from "@/lib/storage";
import { SlidersHorizontal, Plus, Trash2, FolderDown } from "lucide-react";

interface ProfilesPanelProps {
  currentRules: AnonymizationRule[];
  onLoadProfile: (rules: AnonymizationRule[]) => void;
}

export function ProfilesPanel({ currentRules, onLoadProfile }: ProfilesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profiles, setProfiles] = useState<RuleProfile[]>([]);
  const [newProfileName, setNewProfileName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setProfiles(loadProfiles());
    }
  };

  const handleSave = () => {
    if (!newProfileName.trim()) return;
    saveProfile(newProfileName.trim(), currentRules);
    setProfiles(loadProfiles());
    setNewProfileName("");
    setShowSaveForm(false);
    toast.success("Profil de règles sauvegardé", { description: newProfileName });
  };

  const handleLoad = (profile: RuleProfile) => {
    onLoadProfile(profile.rules);
    setIsOpen(false);
    toast.success("Profil appliqué", { description: `${profile.name} (${profile.rules.length} règles)` });
  };

  const handleDelete = (id: string, name: string) => {
    deleteProfile(id);
    setProfiles(loadProfiles());
    toast.success("Profil supprimé", { description: name });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setProfiles(loadProfiles());
          setIsOpen(true);
        }}
        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
        <span>Profils</span>
        {profiles.length > 0 && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
            {profiles.length}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                Profils de Règles
              </DialogTitle>
              <Button
                size="sm"
                variant={showSaveForm ? "secondary" : "outline"}
                onClick={() => setShowSaveForm(!showSaveForm)}
                className="h-7 text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Sauvegarder l&apos;état actuel
              </Button>
            </div>
          </DialogHeader>

          {/* Formulaire de sauvegarde */}
          {showSaveForm && (
            <div className="p-3 bg-muted/40 border border-border/60 rounded-lg space-y-2">
              <p className="text-xs text-muted-foreground">
                Enregistre les {currentRules.length} règles actuelles sous un nom de profil :
              </p>
              <div className="flex gap-2">
                <Input
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Ex: Production AWS, Audit Sécurité..."
                  className="h-8 text-xs flex-1"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!newProfileName.trim()}
                  className="h-8 text-xs bg-purple-600 hover:bg-purple-500"
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          )}

          {/* Liste des profils */}
          <div className="flex-1 min-h-0 pt-2">
            <ScrollArea className="max-h-72 pr-2">
              {profiles.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  <p>Aucun profil sauvegardé</p>
                  <p className="text-[11px] mt-1 text-muted-foreground/70">
                    Créez un profil pour mémoriser et réappliquer rapidement vos jeux de règles favoris.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="p-3 rounded-lg bg-card/60 border border-border/50 hover:border-purple-500/40 hover:bg-muted/40 transition-all flex items-center justify-between gap-3 group"
                    >
                      <button
                        onClick={() => handleLoad(profile)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground group-hover:text-purple-400 transition-colors">
                            {profile.name}
                          </span>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                            {profile.rules.length} règle{profile.rules.length > 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Enregistré le {new Date(profile.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleLoad(profile)}
                          className="h-7 px-2 text-xs gap-1 text-purple-400 hover:text-purple-300"
                        >
                          <FolderDown className="w-3.5 h-3.5" />
                          Charger
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(profile.id, profile.name)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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
