import { PLATFORM_COLORS } from "@/lib/constants";

interface PlatformBadgeProps {
  platform: string | null;
}

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  if (!platform) return <span className="text-[12px] text-[#6B7A8D]">—</span>;
  const colors = PLATFORM_COLORS[platform] || { bg: "#6B7A8D0D", text: "#6B7A8D" };

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize"
      style={{ color: colors.text, backgroundColor: colors.bg }}
    >
      {platform}
    </span>
  );
}
