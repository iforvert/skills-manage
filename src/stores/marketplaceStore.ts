import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { SkillRegistry, MarketplaceSkill } from "@/types";

interface MarketplaceState {
  registries: SkillRegistry[];
  skills: MarketplaceSkill[];
  selectedRegistryId: string | null;
  searchQuery: string;
  isLoading: boolean;
  isSyncing: boolean;
  installingIds: Set<string>;
  error: string | null;

  loadRegistries: () => Promise<void>;
  selectRegistry: (id: string) => void;
  setSearchQuery: (query: string) => void;
  syncRegistry: (registryId: string) => Promise<void>;
  loadSkills: (registryId: string, query?: string) => Promise<void>;
  installSkill: (skillId: string) => Promise<void>;
  addRegistry: (name: string, sourceType: string, url: string) => Promise<SkillRegistry>;
  removeRegistry: (registryId: string) => Promise<void>;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  registries: [],
  skills: [],
  selectedRegistryId: null,
  searchQuery: "",
  isLoading: false,
  isSyncing: false,
  installingIds: new Set(),
  error: null,

  loadRegistries: async () => {
    set({ isLoading: true, error: null });
    try {
      const registries = await invoke<SkillRegistry[]>("list_registries");
      set({ registries: registries ?? [], isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  selectRegistry: (id: string) => {
    set({ selectedRegistryId: id, searchQuery: "" });
    get().loadSkills(id);
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    const { selectedRegistryId } = get();
    if (selectedRegistryId) {
      get().loadSkills(selectedRegistryId, query);
    }
  },

  syncRegistry: async (registryId: string) => {
    set({ isSyncing: true, error: null });
    try {
      const skills = await invoke<MarketplaceSkill[]>("sync_registry", { registryId });
      set({ skills: skills ?? [], isSyncing: false });
    } catch (err) {
      set({ error: String(err), isSyncing: false });
    }
  },

  loadSkills: async (registryId: string, query?: string) => {
    set({ isLoading: true, error: null });
    try {
      const skills = await invoke<MarketplaceSkill[]>("search_marketplace_skills", {
        registryId,
        query: query || null,
      });
      set({ skills: skills ?? [], isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  installSkill: async (skillId: string) => {
    set((s) => ({ installingIds: new Set(s.installingIds).add(skillId) }));
    try {
      await invoke("install_marketplace_skill", { skillId });
      // Update the skill's is_installed status locally
      set((s) => ({
        skills: s.skills.map((sk) =>
          sk.id === skillId ? { ...sk, is_installed: true } : sk
        ),
        installingIds: (() => {
          const next = new Set(s.installingIds);
          next.delete(skillId);
          return next;
        })(),
      }));
    } catch (err) {
      set((s) => {
        const next = new Set(s.installingIds);
        next.delete(skillId);
        return { installingIds: next, error: String(err) };
      });
      throw err;
    }
  },

  addRegistry: async (name: string, sourceType: string, url: string) => {
    const registry = await invoke<SkillRegistry>("add_registry", { name, sourceType, url });
    const registries = await invoke<SkillRegistry[]>("list_registries");
    set({ registries: registries ?? [] });
    return registry;
  },

  removeRegistry: async (registryId: string) => {
    await invoke("remove_registry", { registryId });
    const registries = await invoke<SkillRegistry[]>("list_registries");
    set((s) => ({
      registries: registries ?? [],
      selectedRegistryId: s.selectedRegistryId === registryId ? null : s.selectedRegistryId,
    }));
  },
}));
