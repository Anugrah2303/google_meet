import { create } from "zustand";

// Which side panel is open in the meeting room, plus small UI flags
export const useUiStore = create((set) => ({
  activePanel: null, // "participants" | "chat" | "files" | "recordings" | "settings" | null
  unreadChat: 0,
  infoOpen: false,
  togglePanel: (name) =>
    set((state) => {
      const next = state.activePanel === name ? null : name;
      return { activePanel: next, unreadChat: next === "chat" ? 0 : state.unreadChat };
    }),
  closePanel: () => set({ activePanel: null }),
  incrementUnread: () => set((state) => ({ unreadChat: state.unreadChat + 1 })),
  setInfoOpen: (infoOpen) => set({ infoOpen }),
  resetUi: () => set({ activePanel: null, unreadChat: 0, infoOpen: false }),
}));
