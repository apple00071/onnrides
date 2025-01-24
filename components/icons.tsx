import { Car, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Icon = LucideIcon;

export const Icons = {
  logo: Car,
  spinner: Loader2,
} as const; 