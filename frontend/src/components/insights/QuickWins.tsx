"use client";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ArrowRight } from "lucide-react";
import type { QuickWin } from "./types";

interface Props {
  wins: QuickWin[];
}

export default function QuickWins({ wins }: Props) {
  if (wins.length === 0) return null;

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-3">3 Quick Wins</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {wins.map((win, i) => (
          <Link
            key={i}
            href={win.href}
            className={cn(
              "group rounded-2xl border bg-white p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-all",
              win.urgent ? "border-l-4 border-l-red-500 border-t-gray-100 border-r-gray-100 border-b-gray-100" : "border-gray-100"
            )}
          >
            <div className="flex items-start gap-2">
              <span className="text-2xl leading-none flex-shrink-0">{win.emoji}</span>
              <span className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                {win.title}
              </span>
            </div>
            <p className="text-xs text-secondary leading-snug line-clamp-2">{win.description}</p>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
              {win.urgent ? "Do this now" : "Take action"} <ArrowRight size={11} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
