export default function KwdAmount({ value }: { value: number | string | null | undefined }) {
  const n = value == null ? 0 : typeof value === "string" ? Number(value) : value;
  return (
    <span className="font-mono tabular-nums">
      KWD {new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n)}
    </span>
  );
}
