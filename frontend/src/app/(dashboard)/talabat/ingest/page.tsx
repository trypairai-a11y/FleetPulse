"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useApiGet } from "@/hooks/useApi";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

type DriverOption = { id: string; name: string; zone: string | null };

export default function TalabatIngestUploadPage() {
  const { t } = useI18n();
  const { data } = useApiGet<{ data: DriverOption[] }>(
    "/api/drivers?platform=TALABAT&status=ACTIVE&limit=500"
  );
  const drivers = data?.data ?? [];

  const [driverId, setDriverId] = useState("");
  const [shiftDate, setShiftDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId || !file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("driverId", driverId);
      fd.append("shiftDate", shiftDate);
      const { data } = await api.post("/api/talabat/metrics/ingest-screenshot", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.error ?? t("talabat.uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <header className="mb-6">
        <h1 className="text-lg font-semibold">{t("talabat.ingestUploadTitle")}</h1>
        <p className="text-sm text-gray-500">
          {t("talabat.ingestUploadIntro")}{" "}
          <span className="font-medium">{t("talabat.ingestUploadIntroLink")}</span>.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-gray-500">{t("talabat.driverSelectorPlaceholder")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            required
          >
            <option value="">{t("talabat.selectDriver")}</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.zone ? `· ${d.zone}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-gray-500">{t("talabat.shiftDate")}</span>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={shiftDate}
            onChange={(e) => setShiftDate(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-gray-500">{t("talabat.screenshot")}</span>
          <div className="mt-1 flex items-center justify-center rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-xs"
              required
            />
          </div>
          {file && <p className="mt-2 text-xs text-gray-500">{file.name}</p>}
        </label>

        <button
          type="submit"
          disabled={busy || !driverId || !file}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {t("talabat.uploadAndExtract")}
        </button>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        {result && (
          <div className="rounded-lg bg-green-50 px-3 py-3 text-xs text-green-800">
            <div className="flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-4 w-4" /> {result.status}
            </div>
            {result.extracted && (
              <pre className="mt-2 whitespace-pre-wrap text-[11px] text-green-900">
                {JSON.stringify(result.extracted, null, 2)}
              </pre>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
