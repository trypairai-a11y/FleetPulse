"use client";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ArrowRight } from "lucide-react";
import type { SuggestionCard } from "./types";

const leftBorder: Record<string, string> = {
  red: "border-l-red-500",
  yellow: "border-l-amber-400",
  green: "border-l-green-500",
};

const actionStyle: Record<string, string> = {
  red: "text-red-600 bg-red-50 hover:bg-red-100",
  yellow: "text-amber-700 bg-amber-50 hover:bg-amber-100",
  green: "text-green-700 bg-green-50 hover:bg-green-100",
};

interface Props {
  card: SuggestionCard;
}

export default function SuggestionCardItem({ card }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex gap-4 hover:shadow-md transition-shadow border-l-4",
        leftBorder[card.severity]
      )}
    >
      <div className="text-2xl leading-none flex-shrink-0 mt-0.5">{card.emoji}</div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="font-semibold text-foreground text-sm leading-snug">{card.title}</p>
        <p className="text-sm text-secondary leading-snug">{card.suggestion}</p>
        <Link
          href={card.action.href}
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
            actionStyle[card.severity]
          )}
        >
          {card.action.label} <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}
