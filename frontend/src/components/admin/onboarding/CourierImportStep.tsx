"use client";
// Phase 2 Wave 5 — Step 2 of 5: courier XLSX/CSV import.
//
// REQ-gtm-onboarding. UI-SPEC §3.4.2 Step 2.
//
// Drag-drop zone for XLSX/CSV files. Required columns: name, phone,
// civilId, platformId, vehicleType. Server-side validates and de-dupes.
// Shows validation chip post-upload with valid/missingPhone/duplicateCivilId.
// Skip button advances even when no file uploaded.

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { importCouriers } from "@/lib/adminApi";
import type { ImportSummary } from "@/types/admin";
import { useToast } from "@/components/shared/Toast";
import { cn } from "@/lib/cn";

interface CourierImportStepProps {
  tenantId: string;
  onNext: () => void;
  onSkip: () => void;
}

const ACCEPT_EXT = [".xlsx", ".csv"];

export function CourierImportStep({
  tenantId,
  onNext,
  onSkip,
}: CourierImportStepProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile() {
    inputRef.current?.click();
  }

  function setSelected(f: File | null) {
    if (!f) return;
    const lower = f.name.toLowerCase();
    if (!ACCEPT_EXT.some((ext) => lower.endsWith(ext))) {
      toast.error(`Unsupported file (${f.name}). Use XLSX or CSV.`);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10 MB limit.");
      return;
    }
    setFile(f);
    setSummary(null);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    setSelected(e.target.files?.[0] ?? null);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    setSelected(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const resp = await importCouriers(tenantId, file);
      setSummary(resp);
      toast.success(`Imported ${resp.created} of ${resp.totalRows} couriers.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      toast.error(`Couldn't import couriers: ${msg}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="font-display text-xl text-slate-900 mb-1">
          Step 2 — Import couriers
        </h2>
        <p className="text-sm text-sand-600">
          Drag a courier roster (XLSX or CSV). Required columns:{" "}
          <code className="font-mono text-xs">name, phone, civilId, platformId, vehicleType</code>.
          Skip if you'd rather seed via API.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={pickFile}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pickFile();
          }
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-10 flex flex-col items-center gap-2 text-center cursor-pointer transition-all",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-sand-300 hover:border-sand-400 hover:bg-sand-50",
        )}
      >
        <Upload size={28} className="text-sand-500" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900">
          {file ? file.name : "Drag & drop XLSX or CSV here"}
        </p>
        <p className="text-xs text-sand-600">
          {file
            ? `${(file.size / 1024).toFixed(1)} KB · click to swap`
            : "or click to browse — max 10 MB, 10,000 rows"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_EXT.join(",")}
          onChange={onChange}
          className="hidden"
        />
      </div>

      {file && !summary && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-medium",
            uploading
              ? "bg-sand-200 text-sand-500 cursor-not-allowed"
              : "bg-primary text-white hover:bg-primary-hover",
          )}
        >
          <FileSpreadsheet size={14} />
          {uploading ? "Uploading…" : "Validate & import"}
        </button>
      )}

      {summary && (
        <div className="rounded-2xl bg-sand-50 border border-sand-200 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-900">Import summary</p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary/10 text-primary text-xs font-medium px-2.5 py-1">
              <CheckCircle2 size={12} />
              {summary.valid} valid · {summary.created} created
            </span>
            {summary.invalid.missingPhone > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium px-2.5 py-1">
                <AlertTriangle size={12} />
                {summary.invalid.missingPhone} missing phone
              </span>
            )}
            {summary.invalid.duplicateCivilId > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-red-50 text-red-700 border border-red-200 text-xs font-medium px-2.5 py-1">
                <AlertTriangle size={12} />
                {summary.invalid.duplicateCivilId} duplicate civilId
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-sand-600 hover:text-sand-900 font-medium"
        >
          Skip — seed manually
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!summary && !file}
          className={cn(
            "inline-flex items-center gap-2 px-5 h-10 rounded-pill text-sm font-medium transition-colors",
            summary
              ? "bg-primary text-white hover:bg-primary-hover"
              : "bg-sand-200 text-sand-500 cursor-not-allowed",
          )}
        >
          Continue
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default CourierImportStep;
