import { cn } from "@/lib/cn";

const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  KEETA: { bg: "bg-keeta/10", text: "text-keeta" },
  TALABAT: { bg: "bg-talabat/10", text: "text-talabat" },
  DELIVEROO: { bg: "bg-deliveroo/10", text: "text-deliveroo" },
  AMERICANA: { bg: "bg-americana/10", text: "text-americana" },
};

export default function PlatformBadge({ platform }: { platform: string }) {
  const colors = PLATFORM_COLORS[platform] || { bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", colors.bg, colors.text)}>
      {platform}
    </span>
  );
}
