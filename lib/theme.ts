/** City Boy Movement — green-dominant palette with red accents. */
export const theme = {
  page: "bg-green-50/80",
  card: "bg-white border-green-100",
  link: "text-green-700 hover:text-green-900 hover:underline",

  btnPrimary: "bg-green-700 text-white hover:bg-green-800",
  btnDanger: "bg-red-600 text-white hover:bg-red-700",
  btnOutline: "border border-green-300 text-green-800 hover:bg-green-50",

  tabActive: "bg-green-700 text-white",
  tabInactive: "text-green-900 hover:bg-green-100",

  sidebar: "bg-slate-900 text-slate-100",
  sidebarBorder: "border-slate-700/60",
  sidebarMuted: "text-slate-400",
  sidebarNavActive: "bg-red-600 text-white",
  sidebarNavIdle: "text-slate-300 hover:bg-red-600/80 hover:text-white",

  statGreen: {
    card: "bg-gradient-to-br from-green-50 to-green-100 border-green-300",
    icon: "text-green-700",
    value: "text-green-950",
    label: "text-green-800/90",
  },
  statRed: {
    card: "bg-gradient-to-br from-red-50 to-red-100 border-red-300",
    icon: "text-red-600",
    value: "text-red-950",
    label: "text-red-800/90",
  },
} as const;
