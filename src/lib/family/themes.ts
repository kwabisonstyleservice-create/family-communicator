export const familyThemes = [
  { id: "forest", name: "Forest green", color: "#276955", soft: "#e4f1ea", paper: "#f7faf6" },
  { id: "teal", name: "Teal", color: "#0f666b", soft: "#def3f1", paper: "#f4faf9" },
  { id: "ocean", name: "Ocean blue", color: "#225dab", soft: "#e3edfc", paper: "#f5f8fd" },
  { id: "navy", name: "Midnight blue", color: "#283e70", soft: "#e5eaf6", paper: "#f6f7fb" },
  { id: "violet", name: "Violet", color: "#6540a0", soft: "#efe6fb", paper: "#faf7fd" },
  { id: "plum", name: "Plum", color: "#793b78", soft: "#f3e5f3", paper: "#fcf7fc" },
  { id: "rose", name: "Rose pink", color: "#a13666", soft: "#fbe5ed", paper: "#fff7fa" },
  { id: "burgundy", name: "Burgundy", color: "#873947", soft: "#f7e4e8", paper: "#fdf7f8" },
  { id: "terracotta", name: "Terracotta", color: "#9a482e", soft: "#fbe9df", paper: "#fff9f4" },
  { id: "amber", name: "Golden amber", color: "#805b12", soft: "#fff0cd", paper: "#fffaf0" },
  { id: "olive", name: "Olive green", color: "#58672c", soft: "#edf1da", paper: "#fafbf3" },
  { id: "slate", name: "Slate grey", color: "#45556b", soft: "#e6ecf3", paper: "#f7f9fc" },
] as const;

export function findFamilyTheme(id: unknown) {
  return familyThemes.find((theme) => theme.id === id);
}
