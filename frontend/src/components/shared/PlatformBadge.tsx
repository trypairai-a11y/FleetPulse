import { cn } from "@/lib/cn";

const PLATFORM_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  KEETA: { bg: "bg-keeta/10", text: "text-keeta", ring: "ring-keeta/30" },
  TALABAT: { bg: "bg-talabat/10", text: "text-talabat", ring: "ring-talabat/30" },
  DELIVEROO: { bg: "bg-deliveroo/10", text: "text-deliveroo", ring: "ring-deliveroo/30" },
  AMERICANA: { bg: "bg-americana/10", text: "text-americana", ring: "ring-americana/30" },
};

export default function PlatformBadge({ platform }: { platform: string }) {
  const colors = PLATFORM_COLORS[platform] || { bg: "bg-sand-200", text: "text-sand-800", ring: "ring-sand-300" };
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-pill text-[11px] font-medium tracking-wide ring-1",
      colors.bg, colors.text, colors.ring
    )}>
      {platform}
    </span>
  );
}
