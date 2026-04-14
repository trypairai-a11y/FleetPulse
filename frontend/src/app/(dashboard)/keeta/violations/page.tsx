import ViolationsPage from "@/components/platform/ViolationsPage";
import InsightBanner from "@/components/shared/InsightBanner";

export default function KeetaViolationsPage() {
  return (
    <div className="space-y-4">
      <InsightBanner context="keeta/violations" platform="KEETA" maxInsights={2} />
      <ViolationsPage platform="KEETA" />
    </div>
  );
}
