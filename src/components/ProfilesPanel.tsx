"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnonymizationRule, RuleProfile } from "@/lib/anonymizer";
import { loadProfiles, saveProfile, deleteProfile } from "@/lib/storage";

interface ProfilesPanelProps {
  currentRules: AnonymizationRule[];
  onLoadProfile: (rules: AnonymizationRule[]) => void;
}

export function ProfilesPanel({ currentRules, onLoadProfile }: ProfilesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profiles, setProfiles] = useState<RuleProfile[]>([]);
  const [newProfileName, setNewProfileName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    setProfiles(loadProfiles());
  }, [isOpen]);

  const handleSave = () => {
    if (!newProfileName.trim()) return;
    saveProfile(newProfileName, currentRules);
    setProfiles(loadProfiles());
    setNewProfileName("");
    setShowSaveForm(false);
    toast.success("Profil sauvegardé", { description: newProfileName });
  };

  const handleLoad = (profile: RuleProfile) => {
    onLoadProfile(profile.rules);
    setIsOpen(false);
    toast.success("Profil chargé", { description: profile.name });
  };

  const handleDelete = (id: string, name: string) => {
    deleteProfile(id);
    setProfiles(loadProfiles());
    toast.success("Profil supprimé", { description: name });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        Profils ({profiles.length})
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <Card className="absolute right-0 top-8 z-50 w-72 p-3 bg-card/95 backdrop-blur shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Profils de règles</span>
              <button
                onClick={() => setShowSaveForm(!showSaveForm)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                title="Nouveau profil"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Formulaire de sauvegarde */}
            {showSaveForm && (
              <div className="mb-3 p-2 bg-muted/50 rounded flex gap-2">
                <Input
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Nom du profil..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <Button size="sm" onClick={handleSave} disabled={!newProfileName.trim()}>
                  Sauver
                </Button>
              </div>
            )}

            {/* Liste des profils */}
            <ScrollArea className="max-h-64">
              {profiles.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Aucun profil sauvegardé
                </p>
              ) : (
                <div className="space-y-2">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="p-2 rounded bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => handleLoad(profile)}
                          className="flex-1 text-left"
                        >
                          <p className="text-sm font-medium">{profile.name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {profile.rules.length} règle{profile.rules.length !== 1 ? "s" : ""}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(profile.createdAt).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDelete(profile.id, profile.name)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </>
      )}
    </div>
  );
}
