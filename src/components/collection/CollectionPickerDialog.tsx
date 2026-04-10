import { useState, useEffect } from "react";
import { Loader2, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCollectionStore } from "@/stores/collectionStore";
import { CollectionEditor } from "@/components/collection/CollectionEditor";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CollectionPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The skill to add to collections. */
  skillId: string;
  /** Collection IDs the skill is already a member of (pre-checked, disabled). */
  currentCollectionIds: string[];
  /** Called after skills are successfully added so the parent can refresh. */
  onAdded: () => void;
}

// ─── CollectionPickerDialog ───────────────────────────────────────────────────

export function CollectionPickerDialog({
  open,
  onOpenChange,
  skillId,
  currentCollectionIds,
  onAdded,
}: CollectionPickerDialogProps) {
  const collections = useCollectionStore((s) => s.collections);
  const isLoading = useCollectionStore((s) => s.isLoading);
  const loadCollections = useCollectionStore((s) => s.loadCollections);
  const addSkillToCollection = useCollectionStore((s) => s.addSkillToCollection);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Load collections and reset selection when dialog opens.
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setError(null);
      loadCollections();
    }
  }, [open, loadCollections]);

  function handleToggle(collectionId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(collectionId);
      else next.delete(collectionId);
      return next;
    });
  }

  async function handleConfirm() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsAdding(true);
    setError(null);
    try {
      for (const collectionId of ids) {
        await addSkillToCollection(collectionId, skillId);
      }
      onAdded();
      onOpenChange(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加到 Collection</DialogTitle>
            <DialogClose />
          </DialogHeader>

          <DialogBody className="space-y-3">
            <DialogDescription>
              选择要将此 Skill 添加到的 Collection。
            </DialogDescription>

            {/* Collections list */}
            <div
              className="max-h-60 overflow-y-auto space-y-1 border border-border rounded-md p-2"
              role="group"
              aria-label="Select collections"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Loading collections...
                </div>
              ) : collections.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No collections yet. Create one below.
                </p>
              ) : (
                collections.map((collection) => {
                  const isAlreadyMember = currentCollectionIds.includes(collection.id);
                  const isChecked = isAlreadyMember || selectedIds.has(collection.id);

                  return (
                    <div
                      key={collection.id}
                      className={
                        isAlreadyMember
                          ? "flex items-start gap-2.5 px-2 py-1.5 rounded opacity-50 cursor-not-allowed"
                          : "flex items-start gap-2.5 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      }
                      onClick={() => {
                        if (!isAlreadyMember) {
                          handleToggle(collection.id, !selectedIds.has(collection.id));
                        }
                      }}
                    >
                      <Checkbox
                        checked={isChecked}
                        disabled={isAlreadyMember}
                        onCheckedChange={(checked) => {
                          if (!isAlreadyMember) {
                            handleToggle(collection.id, !!checked);
                          }
                        }}
                        aria-label={collection.name}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{collection.name}</div>
                        {collection.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {collection.description}
                          </div>
                        )}
                        {isAlreadyMember && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Already a member
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Create new collection */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setIsCreateOpen(true)}
              disabled={isAdding}
              aria-label="Create new collection"
            >
              <Plus className="size-3.5" />
              Create new collection
            </Button>

            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAdding}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isAdding || selectedIds.size === 0}
            >
              {isAdding ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  添加中...
                </>
              ) : (
                `添加${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create collection dialog — opens on top */}
      <CollectionEditor
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          // Refresh collections list after creating a new one.
          if (!open) loadCollections();
        }}
        collection={null}
      />
    </>
  );
}
