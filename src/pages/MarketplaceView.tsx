import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Store,
  RefreshCw,
  Loader2,
  Download,
  Check,
  ChevronLeft,
  Folder,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnifiedSkillCard } from "@/components/skill/UnifiedSkillCard";
import { useMarketplaceStore } from "@/stores/marketplaceStore";
import { usePlatformStore } from "@/stores/platformStore";
import { SkillRegistry } from "@/types";
import {
  OFFICIAL_PUBLISHERS,
  RECOMMENDED_SKILLS,
  ALL_TAGS,
  TAG_LABELS,
  OfficialPublisher,
  SkillTag,
  RecommendedSkill,
} from "@/data/officialSources";
import { SkillPreviewDialog } from "@/components/marketplace/SkillPreviewDialog";
import { cn } from "@/lib/utils";

type TabId = "recommended" | "official" | "my-sources";

// ─── Registry Chip ───────────────────────────────────────────────────────────

function RegistryChip({
  registry,
  isActive,
  onClick,
}: {
  registry: SkillRegistry;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-md border transition-colors cursor-pointer shrink-0",
        isActive
          ? "bg-primary/15 border-primary text-foreground font-medium"
          : "border-border hover:border-primary/40 hover:bg-hover-bg/10 text-muted-foreground"
      )}
    >
      <Store className={cn("size-4", isActive ? "text-primary" : "text-muted-foreground")} />
      <span className="text-sm truncate max-w-[140px]">{registry.name}</span>
    </button>
  );
}

// ─── Publisher Card ──────────────────────────────────────────────────────────

function PublisherCard({
  publisher,
  onClick,
}: {
  publisher: OfficialPublisher;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-3 rounded-md border border-border hover:border-primary/40 hover:bg-hover-bg/10 transition-colors cursor-pointer text-left"
    >
      <div className="p-2 rounded-md bg-muted/60 shrink-0">
        <Store className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{publisher.name}</div>
        <div className="text-xs text-muted-foreground">{publisher.totalSkills} skills · {publisher.repos.length} repo{publisher.repos.length > 1 ? "s" : ""}</div>
      </div>
      <ChevronLeft className="size-4 text-muted-foreground rotate-180 shrink-0" />
    </button>
  );
}

// ─── MarketplaceView ─────────────────────────────────────────────────────────

export function MarketplaceView() {
  const { t } = useTranslation();
  const lang = i18n.language;

  // Store
  const registries = useMarketplaceStore((s) => s.registries);
  const skills = useMarketplaceStore((s) => s.skills);
  const selectedRegistryId = useMarketplaceStore((s) => s.selectedRegistryId);
  const searchQuery = useMarketplaceStore((s) => s.searchQuery);
  const isLoading = useMarketplaceStore((s) => s.isLoading);
  const isSyncing = useMarketplaceStore((s) => s.isSyncing);
  const installingIds = useMarketplaceStore((s) => s.installingIds);
  const loadRegistries = useMarketplaceStore((s) => s.loadRegistries);
  const selectRegistry = useMarketplaceStore((s) => s.selectRegistry);
  const setSearchQuery = useMarketplaceStore((s) => s.setSearchQuery);
  const syncRegistry = useMarketplaceStore((s) => s.syncRegistry);
  const installSkill = useMarketplaceStore((s) => s.installSkill);
  const addRegistry = useMarketplaceStore((s) => s.addRegistry);

  const rescan = usePlatformStore((s) => s.rescan);

  // Local state
  const [activeTab, setActiveTab] = useState<TabId>("recommended");
  const [selectedTag, setSelectedTag] = useState<SkillTag | null>(null);
  const [recommendedSearch, setRecommendedSearch] = useState("");
  const [selectedPublisher, setSelectedPublisher] = useState<OfficialPublisher | null>(null);
  const [publisherSearch, setPublisherSearch] = useState("");
  const [recommendedInstallingIds, setRecommendedInstallingIds] = useState<Set<string>>(new Set());
  const [addingRepos, setAddingRepos] = useState<Set<string>>(new Set());

  // Preview state — inline skills preview in Official Directory
  interface PreviewSkill { name: string; description?: string; downloadUrl: string }
  const [previewRepo, setPreviewRepo] = useState<string | null>(null); // repo fullName
  const [previewSkills, setPreviewSkills] = useState<PreviewSkill[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewInstallingIds, setPreviewInstallingIds] = useState<Set<string>>(new Set());
  const [detailSkill, setDetailSkill] = useState<{ name: string; downloadUrl: string; publisher?: string } | null>(null);

  useEffect(() => {
    loadRegistries();
  }, [loadRegistries]);

  useEffect(() => {
    if (activeTab === "my-sources" && !selectedRegistryId && registries.length > 0) {
      selectRegistry(registries[0].id);
    }
  }, [activeTab, selectedRegistryId, registries, selectRegistry]);

  const selectedRegistryObj = useMemo(
    () => registries.find((r) => r.id === selectedRegistryId) ?? null,
    [registries, selectedRegistryId]
  );

  // Recommended skills filtered by tag and search
  const filteredRecommended = useMemo(() => {
    let list = RECOMMENDED_SKILLS;
    if (selectedTag) {
      list = list.filter((s) => s.tags.includes(selectedTag));
    }
    if (recommendedSearch.trim()) {
      const q = recommendedSearch.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.publisher.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedTag, recommendedSearch]);

  // Publishers filtered by search
  const filteredPublishers = useMemo(() => {
    if (!publisherSearch.trim()) return OFFICIAL_PUBLISHERS;
    const q = publisherSearch.toLowerCase();
    return OFFICIAL_PUBLISHERS.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
  }, [publisherSearch]);

  // Check if a repo is already added as a registry
  const addedRepoUrls = useMemo(() => {
    return new Set(registries.map((r) => r.url));
  }, [registries]);

  // ── Handlers ───────────────────────────────────────────────────────────

  async function handleInstallRecommended(skill: RecommendedSkill) {
    // Check if the source repo is already added
    const repoUrl = `https://github.com/${skill.repoFullName}`;
    if (!addedRepoUrls.has(repoUrl)) {
      // Add the source first, then switch to My Sources tab
      setRecommendedInstallingIds((prev) => new Set(prev).add(skill.name));
      try {
        const name = skill.repoFullName.split("/").pop() ?? skill.repoFullName;
        const reg = await addRegistry(name, "github", repoUrl);
        await syncRegistry(reg.id);
        selectRegistry(reg.id);
        setActiveTab("my-sources");
        toast.success(lang === "zh" ? `已添加源 ${skill.repoFullName}，请在技能列表中安装` : `Source ${skill.repoFullName} added. Install from the skill list.`);
      } catch (err) {
        toast.error(String(err));
      } finally {
        setRecommendedInstallingIds((prev) => {
          const next = new Set(prev);
          next.delete(skill.name);
          return next;
        });
      }
      return;
    }
    // Source already added — find the registry and switch to it
    const reg = registries.find((r) => r.url === repoUrl);
    if (reg) {
      selectRegistry(reg.id);
      setActiveTab("my-sources");
    }
  }

  async function handleInstallFromSource(skillId: string) {
    try {
      await installSkill(skillId);
      await rescan();
      toast.success(t("marketplace.installSuccess"));
    } catch (err) {
      toast.error(String(err));
    }
  }

  async function handleSync() {
    if (!selectedRegistryId) return;
    try {
      await syncRegistry(selectedRegistryId);
    } catch (err) {
      toast.error(String(err));
    }
  }

  async function handlePreviewRepo(repoFullName: string) {
    if (previewRepo === repoFullName) {
      setPreviewRepo(null); // toggle off
      return;
    }
    setPreviewRepo(repoFullName);
    setPreviewSkills([]);
    setIsPreviewLoading(true);
    try {
      const [owner, repo] = repoFullName.split("/");
      const headers: Record<string, string> = { "User-Agent": "skills-manage" };

      // Scan root + skills/ subdirectory
      const scanPaths = ["", "skills"];
      const found: PreviewSkill[] = [];
      const seenNames = new Set<string>();

      for (const base of scanPaths) {
        const apiUrl = base
          ? `https://api.github.com/repos/${owner}/${repo}/contents/${base}`
          : `https://api.github.com/repos/${owner}/${repo}/contents/`;
        const resp = await fetch(apiUrl, { headers });
        if (!resp.ok) continue;
        const contents: Array<{ name: string; type: string; path: string }> = await resp.json();
        const dirs = contents.filter((c) => c.type === "dir" && c.name !== "skills");

        for (const dir of dirs) {
          const dirResp = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${dir.path}`,
            { headers }
          );
          if (!dirResp.ok) continue;
          const dirContents: Array<{ name: string; type: string; download_url?: string }> = await dirResp.json();
          const skillMd = dirContents.find((c) => c.name === "SKILL.md" && c.type === "file");
          if (skillMd && !seenNames.has(dir.name)) {
            seenNames.add(dir.name);
            const downloadUrl = skillMd.download_url ??
              `https://raw.githubusercontent.com/${owner}/${repo}/main/${dir.path}/SKILL.md`;

            // Try to parse frontmatter for description
            let description: string | undefined;
            try {
              const mdResp = await fetch(downloadUrl);
              if (mdResp.ok) {
                const text = await mdResp.text();
                const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
                if (match) {
                  const descMatch = match[1].match(/description:\s*(.+)/);
                  if (descMatch) description = descMatch[1].trim().replace(/^["']|["']$/g, "");
                }
              }
            } catch { /* ignore */ }

            found.push({ name: dir.name, description, downloadUrl });
          }
        }
      }

      setPreviewSkills(found);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleInstallPreviewSkill(skill: PreviewSkill) {
    setPreviewInstallingIds((prev) => new Set(prev).add(skill.name));
    try {
      // Download SKILL.md and write to central dir via Tauri FS plugin
      const resp = await fetch(skill.downloadUrl);
      if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
      const content = await resp.text();

      // Write via the Tauri FS plugin
      const { writeTextFile, mkdir, BaseDirectory } = await import("@tauri-apps/plugin-fs");
      const skillDir = `.agents/skills/${skill.name}`;
      await mkdir(skillDir, { baseDir: BaseDirectory.Home, recursive: true });
      await writeTextFile(`${skillDir}/SKILL.md`, content, { baseDir: BaseDirectory.Home });

      await rescan();
      toast.success(t("marketplace.installSuccess"));
    } catch (err) {
      toast.error(String(err));
    } finally {
      setPreviewInstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(skill.name);
        return next;
      });
    }
  }

  async function handleAddRepoToSources(repoFullName: string, url: string) {
    setAddingRepos((prev) => new Set(prev).add(repoFullName));
    try {
      const name = repoFullName.split("/").pop() ?? repoFullName;
      await addRegistry(name, "github", url);
      toast.success(lang === "zh" ? `已添加 ${repoFullName}` : `Added ${repoFullName}`);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setAddingRepos((prev) => {
        const next = new Set(prev);
        next.delete(repoFullName);
        return next;
      });
    }
  }

  // ── Tabs ───────────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string }[] = [
    { id: "recommended", label: lang === "zh" ? "推荐" : "Recommended" },
    { id: "official", label: lang === "zh" ? "官方源目录" : "Official Directory" },
    { id: "my-sources", label: lang === "zh" ? "我的源" : "My Sources" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold">{t("marketplace.title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("marketplace.desc")}</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedPublisher(null); }}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
              activeTab === tab.id
                ? "bg-primary/15 text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/40"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">

        {/* ── Tab: Recommended ──────────────────────────────────────────── */}
        {activeTab === "recommended" && (
          <div className="p-6 space-y-4">
            {/* Tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedTag(null)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs transition-colors cursor-pointer",
                  !selectedTag ? "bg-primary/15 text-foreground font-medium" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                )}
              >
                All
              </button>
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs transition-colors cursor-pointer",
                    selectedTag === tag ? "bg-primary/15 text-foreground font-medium" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  {lang === "zh" ? TAG_LABELS[tag].zh : TAG_LABELS[tag].en}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t("marketplace.searchPlaceholder")}
                value={recommendedSearch}
                onChange={(e) => setRecommendedSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-muted/40"
              />
            </div>

            {/* Skills grid */}
            {filteredRecommended.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                {lang === "zh" ? "没有匹配的推荐技能" : "No matching recommended skills"}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredRecommended.map((skill) => (
                  <UnifiedSkillCard
                    key={skill.name}
                    name={skill.name}
                    description={skill.description}
                    publisher={skill.publisher}
                    tags={skill.tags.slice(0, 2).map((tag) => ({
                      key: tag,
                      label: lang === "zh" ? TAG_LABELS[tag].zh : TAG_LABELS[tag].en,
                    }))}
                    onInstall={() => handleInstallRecommended(skill)}
                    isLoading={recommendedInstallingIds.has(skill.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Official Directory ───────────────────────────────────── */}
        {activeTab === "official" && !selectedPublisher && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={lang === "zh" ? "搜索发布者..." : "Search publishers..."}
                  value={publisherSearch}
                  onChange={(e) => setPublisherSearch(e.target.value)}
                  className="pl-8 h-8 text-sm bg-muted/40"
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {OFFICIAL_PUBLISHERS.length} {lang === "zh" ? "个官方发布者" : "publishers"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {filteredPublishers.map((pub) => (
                <PublisherCard
                  key={pub.slug}
                  publisher={pub}
                  onClick={() => setSelectedPublisher(pub)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: Official Directory → Publisher Detail ────────────────── */}
        {activeTab === "official" && selectedPublisher && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPublisher(null)}
                className="p-1.5 rounded-md hover:bg-muted/60 transition-colors cursor-pointer text-muted-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div>
                <h2 className="text-sm font-semibold">{selectedPublisher.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedPublisher.totalSkills} skills · {selectedPublisher.repos.length} repo{selectedPublisher.repos.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {selectedPublisher.repos.map((repo) => {
                const isAdded = addedRepoUrls.has(repo.url);
                const isAdding = addingRepos.has(repo.fullName);
                const isPreviewing = previewRepo === repo.fullName;
                return (
                  <div key={repo.fullName} className="rounded-md border border-border overflow-hidden">
                    {/* Repo header — clickable to toggle preview */}
                    <button
                      onClick={() => handlePreviewRepo(repo.fullName)}
                      className={cn(
                        "flex items-center gap-3 w-full p-4 transition-colors cursor-pointer text-left",
                        isPreviewing ? "bg-primary/10" : "hover:bg-hover-bg/10"
                      )}
                    >
                      <Folder className={cn("size-4 shrink-0", isPreviewing ? "text-primary" : "text-muted-foreground")} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{repo.fullName}</span>
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-primary hover:underline shrink-0"
                          >{repo.url}</a>
                        </div>
                        <div className="text-xs text-muted-foreground">{repo.skillCount} skills</div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {isPreviewing ? "▾" : "▸"} {lang === "zh" ? "浏览 Skills" : "Browse Skills"}
                      </span>
                    </button>

                    {/* Expanded preview — inline skills list */}
                    {isPreviewing && (
                      <div className="border-t border-border bg-muted/10">
                        {/* Actions bar */}
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
                          <span className="text-xs text-muted-foreground flex-1">
                            {isPreviewLoading
                              ? (lang === "zh" ? "正在获取..." : "Fetching...")
                              : `${previewSkills.length} skills`}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handlePreviewRepo(repo.fullName); setTimeout(() => handlePreviewRepo(repo.fullName), 50); }}
                            disabled={isPreviewLoading}
                            className="h-6 text-xs px-2"
                          >
                            <RefreshCw className={cn("size-3", isPreviewLoading && "animate-spin")} />
                          </Button>
                          {!isAdded && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleAddRepoToSources(repo.fullName, repo.url); }}
                              disabled={isAdding}
                              className="h-6 text-xs px-2"
                            >
                              {isAdding ? <Loader2 className="size-3 animate-spin" /> : null}
                              <span>{lang === "zh" ? "+ 添加到我的源" : "+ Add to My Sources"}</span>
                            </Button>
                          )}
                          {isAdded && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                              <Check className="size-3" />
                              {lang === "zh" ? "已添加" : "Added"}
                            </span>
                          )}
                        </div>

                        {/* Skills */}
                        {isPreviewLoading ? (
                          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                            <Loader2 className="size-4 animate-spin" />
                            <span>{lang === "zh" ? "正在从 GitHub 获取 Skills..." : "Fetching skills from GitHub..."}</span>
                          </div>
                        ) : previewSkills.length === 0 ? (
                          <div className="text-center py-6 text-xs text-muted-foreground">
                            {lang === "zh" ? "未找到 Skills" : "No skills found"}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 p-3 max-h-80 overflow-y-auto">
                            {previewSkills.map((skill) => (
                              <div
                                key={skill.name}
                                className="flex items-start gap-2 p-2.5 rounded-md border border-border/50 bg-background"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium truncate">{skill.name}</div>
                                  {skill.description && (
                                    <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{skill.description}</div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); setDetailSkill({ name: skill.name, downloadUrl: skill.downloadUrl, publisher: repo.fullName }); }}
                                    className="h-6 text-[10px] px-2"
                                  >
                                    <FileText className="size-3" />
                                    <span>Detail</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleInstallPreviewSkill(skill); }}
                                    disabled={previewInstallingIds.has(skill.name)}
                                    className="h-6 text-[10px] px-2"
                                  >
                                    {previewInstallingIds.has(skill.name)
                                      ? <Loader2 className="size-3 animate-spin" />
                                      : <Download className="size-3" />}
                                    <span>{t("marketplace.install")}</span>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab: My Sources ───────────────────────────────────────────── */}
        {activeTab === "my-sources" && (
          <>
            {/* Registry chips */}
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border overflow-x-auto">
              {registries.map((reg) => (
                <RegistryChip
                  key={reg.id}
                  registry={reg}
                  isActive={selectedRegistryId === reg.id}
                  onClick={() => selectRegistry(reg.id)}
                />
              ))}
              {registries.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  {lang === "zh" ? "暂无源。从「官方源目录」中添加。" : "No sources. Add from Official Directory."}
                </span>
              )}
            </div>

            {selectedRegistryObj && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Source header */}
                <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold">{selectedRegistryObj.name}</h2>
                    <a
                      href={selectedRegistryObj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate block"
                    >{selectedRegistryObj.url}</a>
                  </div>
                  <div className="relative w-48 shrink-0">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder={t("marketplace.searchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-7 h-7 text-xs bg-muted/40"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
                    {isSyncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                    <span>{t("marketplace.sync")}</span>
                  </Button>
                </div>

                {/* Skills */}
                <div className="flex-1 overflow-auto p-6">
                  {isLoading || isSyncing ? (
                    <div className="flex items-center justify-center h-full gap-3 text-muted-foreground">
                      <Loader2 className="size-5 animate-spin" />
                      <span className="text-sm">{isSyncing ? t("marketplace.syncing") : t("common.loading")}</span>
                    </div>
                  ) : skills.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
                      <div className="p-4 rounded-full bg-muted/60">
                        <Store className="size-12 text-muted-foreground opacity-60" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">{t("marketplace.noSkills")}</p>
                      <p className="text-xs text-muted-foreground">{t("marketplace.noSkillsDesc")}</p>
                      <Button variant="default" size="sm" onClick={handleSync}>
                        <RefreshCw className="size-3.5" />
                        {t("marketplace.syncNow")}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {skills.map((skill) => (
                        <UnifiedSkillCard
                          key={skill.id}
                          name={skill.name}
                          description={skill.description}
                          isInstalled={skill.is_installed}
                          onInstall={() => handleInstallFromSource(skill.id)}
                          isLoading={installingIds.has(skill.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Skill Detail Dialog */}
      {detailSkill && (
        <SkillPreviewDialog
          open={!!detailSkill}
          onOpenChange={(open) => { if (!open) setDetailSkill(null); }}
          skillName={detailSkill.name}
          downloadUrl={detailSkill.downloadUrl}
          publisher={detailSkill.publisher}
          onInstall={() => {
            handleInstallPreviewSkill({ name: detailSkill.name, downloadUrl: detailSkill.downloadUrl });
          }}
          isInstalling={previewInstallingIds.has(detailSkill.name)}
        />
      )}
    </div>
  );
}
