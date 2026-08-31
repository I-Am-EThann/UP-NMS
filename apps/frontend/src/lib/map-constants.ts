import { SeverityLevel } from "@/lib/types";

// Approximate campus center — used when a device has no saved coordinates yet.
export const UNIVERSITY_OF_PHAYAO_CENTER: [number, number] = [19.0333, 99.9022];

export const SEVERITY_MARKER_COLOR: Record<SeverityLevel, string> = {
  critical: "#dc2626",
  major: "#ea580c",
  warning: "#d97706",
  normal: "#16a34a",
};
