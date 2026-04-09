export type SuggestionType =
  | "COLLECT_CASH"
  | "TALK_TO_DRIVER"
  | "CELEBRATE_DRIVER"
  | "FILL_OPEN_SHIFT"
  | "RESOLVE_VIOLATION"
  | "CHECK_ABSENCE";

export interface SuggestionCard {
  id: string;
  type: SuggestionType;
  severity: "red" | "yellow" | "green";
  priorityScore: number;
  emoji: string;
  title: string;
  suggestion: string;
  action: { label: string; href: string };
  driverId?: string;
  driverName?: string;
  platform?: string;
}

export interface DayBar {
  label: string;
  orders: number;
}

export interface QuickWin {
  emoji: string;
  title: string;
  description: string;
  href: string;
  urgent: boolean;
}

export interface InsightsOverview {
  ordersToday: number;
  ordersVsYesterday: number;
  ordersSuggestion: string;
  ordersStatus: "green" | "yellow" | "red";
  cashUncollected: number;
  cashSuggestion: string;
  cashStatus: "green" | "yellow" | "red";
  topSuggestion: string;
  topSuggestionHref: string;
}

export interface InsightsPayload {
  generatedAt: string;
  overview: InsightsOverview;
  suggestions: SuggestionCard[];
  weeklyChart: { thisWeek: DayBar[]; lastWeek: DayBar[] };
  quickWins: QuickWin[];
}
