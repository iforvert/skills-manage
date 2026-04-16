import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Tag,
  Plus,
  FileText,
  Code,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/platform/PlatformIcon";
import { useSkillDetailStore } from "@/stores/skillDetailStore";
import { usePlatformStore } from "@/stores/platformStore";
import { CollectionPickerDialog } from "@/components/collection/CollectionPickerDialog";
import { AgentWithStatus, SkillInstallation } from "@/types";
import { cn } from "@/lib/utils";

// ─── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-2">
      {children}
    </div>
  );
}

// ─── MetadataRow (compact) ───────────────────────────────────────────────────

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">{label}</div>
      <div className="font-mono text-xs text-foreground break-all leading-relaxed">
        {value}
      </div>
    </div>
  );
}

// ─── Platform Toggle Icon (compact install/uninstall) ─────────────────────────

interface PlatformToggleIconProps {
  agent: AgentWithStatus;
  skillName: string;
  isInstalled: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

function PlatformToggleIcon({ agent, skillName, isInstalled, isLoading, onToggle }: PlatformToggleIconProps) {
  const { t } = useTranslation();
  return (
    <button
      className={cn(
        "p-1.5 rounded-md transition-colors cursor-pointer",
        isInstalled
          ? "text-primary hover:bg-primary/15"
          : "text-muted-foreground/40 hover:bg-muted/60 hover:text-muted-foreground",
        isLoading && "animate-pulse pointer-events-none"
      )}
      title={`${agent.display_name}${isInstalled ? ` — ${t("central.linked")}` : ""}`}
      aria-label={t("central.toggleInstallLabel", { platform: agent.display_name, skill: skillName })}
      disabled={isLoading}
      onClick={onToggle}
    >
      <PlatformIcon agentId={agent.id} className="size-4 shrink-0" size={16} />
    </button>
  );
}

// ─── Tab Toggle ───────────────────────────────────────────────────────────────

type PreviewTab = "markdown" | "raw";

interface TabToggleProps {
  activeTab: PreviewTab;
  onChange: (tab: PreviewTab) => void;
}

function TabToggle({ activeTab, onChange }: TabToggleProps) {
  const { t } = useTranslation();
  return (
    <div className="flex border border-border rounded-lg p-0.5 gap-0.5 bg-muted/40">
      <button
        role="tab"
        aria-selected={activeTab === "markdown"}
        onClick={() => onChange("markdown")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          activeTab === "markdown"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <FileText className="size-3.5" />
        {t("detail.markdown")}
      </button>
      <button
        role="tab"
        aria-selected={activeTab === "raw"}
        onClick={() => onChange("raw")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          activeTab === "raw"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Code className="size-3.5" />
        {t("detail.rawSource")}
      </button>
    </div>
  );
}

// ─── SkillDetail ──────────────────────────────────────────────────────────────

export function SkillDetail() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Store data
  const detail = useSkillDetailStore((s) => s.detail);
  const content = useSkillDetailStore((s) => s.content);
  const isLoading = useSkillDetailStore((s) => s.isLoading);
  const installingAgentId = useSkillDetailStore((s) => s.installingAgentId);
  const error = useSkillDetailStore((s) => s.error);
  const loadDetail = useSkillDetailStore((s) => s.loadDetail);
  const installSkill = useSkillDetailStore((s) => s.installSkill);
  const uninstallSkill = useSkillDetailStore((s) => s.uninstallSkill);
  const reset = useSkillDetailStore((s) => s.reset);

  // Platform agents (loaded at app init)
  const agents = usePlatformStore((s) => s.agents);
  const rescan = usePlatformStore((s) => s.rescan);

  // Local UI state
  const [activeTab, setActiveTab] = useState<PreviewTab>("markdown");
  const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false);

  // Load detail on mount / skillId change, reset on unmount
  useEffect(() => {
    if (skillId) {
      loadDetail(skillId);
    }
    return () => {
      reset();
    };
  }, [skillId, loadDetail, reset]);

  // ── Derived values ───────────────────────────────────────────────────────

  const targetAgents = agents.filter((a) => a.id !== "central");
  const lobsterAgents = targetAgents.filter((a) => a.category === "lobster");
  const codingAgents = targetAgents.filter((a) => a.category !== "lobster");

  const installationMap = new Map<string, SkillInstallation>(
    (detail?.installations ?? []).map((inst) => [inst.agent_id, inst])
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleToggle(agentId: string) {
    if (!skillId) return;
    const isInstalled = installationMap.has(agentId);
    try {
      if (isInstalled) {
        await uninstallSkill(skillId, agentId);
      } else {
        await installSkill(skillId, agentId);
      }
      rescan();
    } catch (err) {
      toast.error(
        isInstalled
          ? t("detail.uninstallError", { error: String(err) })
          : t("detail.installError", { error: String(err) })
      );
    }
  }

  function handleCollectionAdded() {
    if (skillId) {
      loadDetail(skillId);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label={t("detail.goBack")}
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold truncate">
            {isLoading ? (skillId ?? "") : (detail?.name ?? skillId ?? "")}
          </h1>
          {detail?.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {detail.description}
            </p>
          )}
        </div>
        <TabToggle activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">{t("detail.loading")}</span>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => skillId && loadDetail(skillId)}
              >
                {t("detail.retry")}
              </Button>
            </div>
          </div>
        )}

        {/* Two-column layout: Preview (left) + Sidebar (right) */}
        {!isLoading && !error && detail && (
          <div className="flex h-full">
            {/* ── Left: SKILL.md Preview ─────────────────────────────── */}
            <div className="flex-1 min-w-0 overflow-auto">
              {activeTab === "markdown" ? (
                <div
                  className="markdown-body p-6"
                  role="tabpanel"
                  aria-label={t("detail.markdown")}
                >
                  {content ? (
                    <ReactMarkdown>{content}</ReactMarkdown>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {t("detail.noContent")}
                    </p>
                  )}
                </div>
              ) : (
                <pre
                  className="p-6 text-xs font-mono whitespace-pre-wrap break-words text-foreground/80"
                  role="tabpanel"
                  aria-label={t("detail.rawSource")}
                >
                  {content ?? t("detail.noContent")}
                </pre>
              )}
            </div>

            {/* ── Right: Sidebar ─────────────────────────────────────── */}
            <aside className="w-64 shrink-0 border-l border-border overflow-y-auto p-4 space-y-5">
              {/* Metadata */}
              <section aria-label={t("detail.metadataRegion")}>
                <SectionLabel>{t("detail.metadata")}</SectionLabel>
                <div className="space-y-2.5">
                  <MetadataRow label={t("detail.filePath")} value={detail.file_path} />
                  {detail.canonical_path && (
                    <MetadataRow label={t("detail.canonical")} value={detail.canonical_path} />
                  )}
                  {detail.source && (
                    <MetadataRow label={t("detail.source")} value={detail.source} />
                  )}
                  <MetadataRow
                    label={t("detail.scannedAt")}
                    value={new Date(detail.scanned_at).toLocaleString()}
                  />
                </div>
              </section>

              {/* Install Status — compact icon grid */}
              <section aria-label={t("detail.installStatusRegion")}>
                <SectionLabel>{t("detail.installStatus")}</SectionLabel>
                <div className="space-y-1.5">
                  {targetAgents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t("detail.noPlatforms")}
                    </p>
                  ) : (
                    <>
                      {lobsterAgents.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider w-12 shrink-0">
                            {t("sidebar.categoryLobster")}
                          </span>
                          <div className="flex items-center gap-0.5 flex-wrap">
                            {lobsterAgents.map((agent) => (
                              <PlatformToggleIcon
                                key={agent.id}
                                agent={agent}
                                skillName={detail.name}
                                isInstalled={installationMap.has(agent.id)}
                                isLoading={installingAgentId === agent.id}
                                onToggle={() => handleToggle(agent.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {codingAgents.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider w-12 shrink-0">
                            {t("sidebar.categoryCoding")}
                          </span>
                          <div className="flex items-center gap-0.5 flex-wrap">
                            {codingAgents.map((agent) => (
                              <PlatformToggleIcon
                                key={agent.id}
                                agent={agent}
                                skillName={detail.name}
                                isInstalled={installationMap.has(agent.id)}
                                isLoading={installingAgentId === agent.id}
                                onToggle={() => handleToggle(agent.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>

              {/* Collections */}
              <section aria-label={t("detail.collections")}>
                <SectionLabel>{t("detail.collections")}</SectionLabel>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {(detail.collections ?? []).map((collectionId) => (
                    <span
                      key={collectionId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary ring-1 ring-primary/20"
                    >
                      <Tag className="size-2.5" />
                      {collectionId}
                    </span>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground hover:text-foreground h-6 px-2 text-xs"
                    aria-label={t("detail.addToCollection")}
                    onClick={() => setIsCollectionPickerOpen(true)}
                  >
                    <Plus className="size-3" />
                    {t("detail.addToCollection")}
                  </Button>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>

      {/* Collection Picker Dialog */}
      {skillId && (
        <CollectionPickerDialog
          open={isCollectionPickerOpen}
          onOpenChange={setIsCollectionPickerOpen}
          skillId={skillId}
          currentCollectionIds={detail?.collections ?? []}
          onAdded={handleCollectionAdded}
        />
      )}
    </div>
  );
}
