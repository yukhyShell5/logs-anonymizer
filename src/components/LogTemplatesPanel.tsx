"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutTemplate } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AnonymizationRule, HIGHLIGHT_COLORS } from "@/lib/anonymizer";

interface LogTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  rules: Omit<AnonymizationRule, "id" | "color">[];
  sampleLog: string;
}

const LOG_TEMPLATES: LogTemplate[] = [
  {
    id: "apache",
    name: "Apache Access",
    description: "Logs d'accès Apache/httpd",
    icon: "🌐",
    rules: [
      { pattern: "\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b", label: "IP", enabled: true },
      { pattern: '"[A-Z]+ [^"]+ HTTP/[\\d.]+"', label: "REQUEST", enabled: false },
      { pattern: '"[^"]*"$', label: "USER_AGENT", enabled: true },
      { pattern: "\\d{2}/\\w{3}/\\d{4}:\\d{2}:\\d{2}:\\d{2}", label: "TIMESTAMP", enabled: false },
    ],
    sampleLog: '192.168.1.1 - - [27/Dec/2024:12:00:00 +0100] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0"',
  },
  {
    id: "nginx",
    name: "Nginx",
    description: "Logs d'accès Nginx",
    icon: "⚡",
    rules: [
      { pattern: "\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b", label: "IP", enabled: true },
      { pattern: '"[A-Z]+ [^"]+"', label: "REQUEST", enabled: false },
      { pattern: "\\d{2}/\\w{3}/\\d{4}:\\d{2}:\\d{2}:\\d{2}", label: "TIMESTAMP", enabled: false },
      { pattern: 'upstream: "[^"]+"', label: "UPSTREAM", enabled: true },
    ],
    sampleLog: '192.168.1.1 - user [27/Dec/2024:12:00:00 +0100] "GET /api HTTP/1.1" 200 upstream: "127.0.0.1:3000"',
  },
  {
    id: "json",
    name: "JSON Logs",
    description: "Logs structurés en JSON",
    icon: "📋",
    rules: [
      { pattern: '"email":\\s*"[^"]+"', label: "EMAIL_FIELD", enabled: true },
      { pattern: '"user(?:name|_?id)":\\s*"[^"]+"', label: "USER_FIELD", enabled: true },
      { pattern: '"(?:ip|ip_?address)":\\s*"[^"]+"', label: "IP_FIELD", enabled: true },
      { pattern: '"(?:token|api_?key|secret)":\\s*"[^"]+"', label: "SECRET_FIELD", enabled: true },
      { pattern: '"password":\\s*"[^"]+"', label: "PASSWORD_FIELD", enabled: true },
    ],
    sampleLog: '{"user": "john", "email": "john@example.com", "ip": "192.168.1.1", "action": "login"}',
  },
  {
    id: "syslog",
    name: "Syslog",
    description: "Logs système Linux",
    icon: "🐧",
    rules: [
      { pattern: "\\w{3}\\s+\\d{1,2}\\s+\\d{2}:\\d{2}:\\d{2}", label: "SYSLOG_TS", enabled: false },
      { pattern: "\\b[a-zA-Z][a-zA-Z0-9-]{0,62}\\b(?=\\s+\\w+\\[)", label: "HOSTNAME", enabled: true },
      { pattern: "\\w+\\[\\d+\\]", label: "PROCESS", enabled: false },
      { pattern: "user\\s+\\w+", label: "USER", enabled: true },
      { pattern: "from\\s+\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}", label: "FROM_IP", enabled: true },
    ],
    sampleLog: "Dec 27 12:00:00 server01 sshd[1234]: Accepted publickey for admin from 192.168.1.1 port 22",
  },
  {
    id: "docker",
    name: "Docker",
    description: "Logs de containers Docker",
    icon: "🐳",
    rules: [
      { pattern: "[a-f0-9]{12}(?=\\s|$)", label: "CONTAINER_ID", enabled: true },
      { pattern: "[a-f0-9]{64}", label: "FULL_CONTAINER_ID", enabled: true },
      { pattern: "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d+Z", label: "DOCKER_TS", enabled: false },
    ],
    sampleLog: "2024-12-27T12:00:00.000Z container=abc123def456 image=myapp:latest Starting service...",
  },
  {
    id: "aws",
    name: "AWS CloudWatch",
    description: "Logs AWS CloudWatch/Lambda",
    icon: "☁️",
    rules: [
      { pattern: "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z", label: "AWS_TS", enabled: false },
      { pattern: "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}", label: "REQUEST_ID", enabled: true },
      { pattern: "arn:aws:[^\\s]+", label: "ARN", enabled: true },
      { pattern: "AKID[A-Z0-9]{16,}", label: "ACCESS_KEY", enabled: true },
    ],
    sampleLog: "2024-12-27T12:00:00.000Z abc12345-1234-5678-9012-abcdef123456 INFO Processing request",
  },
];

interface LogTemplatesPanelProps {
  onApplyTemplate: (rules: AnonymizationRule[]) => void;
  onLoadSample: (sample: string) => void;
}

export function LogTemplatesPanel({ onApplyTemplate, onLoadSample }: LogTemplatesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LogTemplate | null>(null);

  const handleApply = (template: LogTemplate) => {
    const rulesWithIds: AnonymizationRule[] = template.rules.map((rule, index) => ({
      ...rule,
      id: crypto.randomUUID(),
      color: HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length].border,
    }));
    onApplyTemplate(rulesWithIds);
    setIsOpen(false);
    toast.success(`Template ${template.name} appliqué`, {
      description: `${rulesWithIds.length} règles ajoutées`,
    });
  };

  const handleLoadSample = (template: LogTemplate) => {
    onLoadSample(template.sampleLog);
    toast.success("Exemple chargé");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <LayoutTemplate className="w-3.5 h-3.5 text-blue-400" />
        <span>Templates</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Templates de logs
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            {LOG_TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className={`p-3 cursor-pointer transition-all hover:border-blue-500/50 ${
                  selectedTemplate?.id === template.id ? "border-blue-500 bg-blue-500/10" : ""
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {template.rules.length} règles
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Selected template details */}
          {selectedTemplate && (
            <Card className="p-3 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">{selectedTemplate.name}</h4>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleLoadSample(selectedTemplate)}
                  >
                    Charger exemple
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApply(selectedTemplate)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    Appliquer
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-24">
                <div className="space-y-1">
                  {selectedTemplate.rules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Badge variant={rule.enabled ? "default" : "outline"} className="shrink-0">
                        {rule.label}
                      </Badge>
                      <code className="text-muted-foreground truncate">{rule.pattern}</code>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="mt-2 p-2 bg-background rounded text-xs font-mono text-muted-foreground overflow-x-auto">
                {selectedTemplate.sampleLog}
              </div>
            </Card>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
