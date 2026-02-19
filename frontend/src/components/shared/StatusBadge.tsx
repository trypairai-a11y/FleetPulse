interface StatusBadgeProps {
  status: string;
  config: Record<string, { labelEn: string; labelAr: string; color: string; bg: string }>;
  language?: string;
}

export function StatusBadge({ status, config, language = "en" }: StatusBadgeProps) {
  const isAr = language === "ar";
  const c = config[status] || { labelEn: status, labelAr: status, color: "#6B7A8D", bg: "#6B7A8D0D" };

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ color: c.color, backgroundColor: c.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {isAr ? c.labelAr : c.labelEn}
    </span>
  );
}
