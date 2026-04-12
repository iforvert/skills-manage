import { Folder, Globe, ArrowUpRight, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/platform/PlatformIcon";
import { DiscoveredSkill } from "@/types";
import { cn } from "@/lib/utils";

// ─── DiscoveredSkillCard ─────────────────────────────────────────────────────

interface DiscoveredSkillCardProps {
  skill: DiscoveredSkill;
  isSelected: boolean;
  onToggleSelect: () => void;
  onInstallToCentral: () => void;
  onInstallToPlatform: () => void;
  isImporting: boolean;
}

export function DiscoveredSkillCard({
  skill,
  isSelected,
  onToggleSelect,
  onInstallToCentral,
  onInstallToPlatform,
  isImporting,
}: DiscoveredSkillCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "rounded-lg border border-border p-3 transition-colors",
        isSelected && "ring-1 ring-primary/40 bg-primary/5",
        isImporting && "opacity-50"
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Selection checkbox */}
        <div className="pt-0.5">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label={t("discover.selectSkill")}
          />
        </div>

        {/* Skill info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium truncate">{skill.name}</h3>
            {skill.is_already_central && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                <Globe className="size-3" />
                {t("discover.alreadyCentral")}
              </span>
            )}
          </div>

          {skill.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {skill.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            {/* Platform badge */}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <PlatformIcon agentId={skill.platform_id} className="size-3" />
              {skill.platform_name}
            </span>

            {/* Project badge */}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Folder className="size-3" />
              {skill.project_name}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!skill.is_already_central && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onInstallToCentral}
              disabled={isImporting}
              title={t("discover.installToCentral")}
              aria-label={t("discover.installToCentral")}
              className="h-7 px-2 text-xs"
            >
              <ArrowUpRight className="size-3 mr-1" />
              {t("discover.installToCentral")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onInstallToPlatform}
            disabled={isImporting}
            title={t("discover.installToPlatform")}
            aria-label={t("discover.installToPlatform")}
            className="h-7 px-2 text-xs"
          >
            <Plus className="size-3 mr-1" />
            {t("discover.installToPlatform")}
          </Button>
        </div>
      </div>
    </div>
  );
}
