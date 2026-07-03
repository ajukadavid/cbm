/** Nigerian states + FCT for state-scoped submissions. */
export const NIGERIAN_STATES = [
  { id: "abia", label: "Abia" },
  { id: "adamawa", label: "Adamawa" },
  { id: "akwa-ibom", label: "Akwa Ibom" },
  { id: "anambra", label: "Anambra" },
  { id: "bauchi", label: "Bauchi" },
  { id: "bayelsa", label: "Bayelsa" },
  { id: "benue", label: "Benue" },
  { id: "borno", label: "Borno" },
  { id: "cross-river", label: "Cross River" },
  { id: "delta", label: "Delta" },
  { id: "ebonyi", label: "Ebonyi" },
  { id: "edo", label: "Edo" },
  { id: "ekiti", label: "Ekiti" },
  { id: "enugu", label: "Enugu" },
  { id: "fct", label: "FCT (Abuja)" },
  { id: "gombe", label: "Gombe" },
  { id: "imo", label: "Imo" },
  { id: "jigawa", label: "Jigawa" },
  { id: "kaduna", label: "Kaduna" },
  { id: "kano", label: "Kano" },
  { id: "katsina", label: "Katsina" },
  { id: "kebbi", label: "Kebbi" },
  { id: "kogi", label: "Kogi" },
  { id: "kwara", label: "Kwara" },
  { id: "lagos", label: "Lagos" },
  { id: "nasarawa", label: "Nasarawa" },
  { id: "niger", label: "Niger" },
  { id: "ogun", label: "Ogun" },
  { id: "ondo", label: "Ondo" },
  { id: "osun", label: "Osun" },
  { id: "oyo", label: "Oyo" },
  { id: "plateau", label: "Plateau" },
  { id: "rivers", label: "Rivers" },
  { id: "sokoto", label: "Sokoto" },
  { id: "taraba", label: "Taraba" },
  { id: "yobe", label: "Yobe" },
  { id: "zamfara", label: "Zamfara" },
] as const;

export type StateId = (typeof NIGERIAN_STATES)[number]["id"];

const stateIds = new Set(NIGERIAN_STATES.map((s) => s.id));

export function isValidStateId(id: string): id is StateId {
  return stateIds.has(id as StateId);
}

export function stateLabel(id: string): string {
  return NIGERIAN_STATES.find((s) => s.id === id)?.label ?? id;
}
