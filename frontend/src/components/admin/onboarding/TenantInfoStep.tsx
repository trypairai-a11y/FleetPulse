"use client";
// Phase 2 Wave 5 — Step 1 of 5: tenant info form.
//
// REQ-gtm-onboarding. UI-SPEC §3.4.2 Step 1.
//
// Validation rules:
//   - name: required, min 3 chars
//   - ownerName: required
//   - ownerEmail: required, basic email shape
//   - ownerPhone: required, Kuwait format `+965 9XXX XXXX`
//                 (regex /^\+965 \d{4} \d{4}$/) — operationally KW-only
//                 for design-partner-1.
//   - fleetSizeEstimate: required, 50..500
//   - tenantType: radio Standard (KD 200/mo floor) | Design partner
//                 (KD 100/mo override). Default Standard.
//
// Submit: POST /api/admin/onboarding/tenants → onNext({tenantId,...}).
// Errors surface via toast.

import { FormEvent, useState } from "react";
import type { CreateTenantResponse } from "@/types/admin";
import { createTenant } from "@/lib/adminApi";
import { useToast } from "@/components/shared/Toast";
import { cn } from "@/lib/cn";

interface TenantInfoStepProps {
  onNext: (response: CreateTenantResponse) => void;
}

const KUWAIT_PHONE = /^\+965 \d{4} \d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TenantType = "STANDARD" | "DESIGN_PARTNER";

export function TenantInfoStep({ onNext }: TenantInfoStepProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [fleetSize, setFleetSize] = useState<number | "">("");
  const [tenantType, setTenantType] = useState<TenantType>("STANDARD");
  const [submitting, setSubmitting] = useState(false);

  const errors = {
    name: name.trim().length < 3 ? "Tenant name (≥ 3 chars) required." : null,
    ownerName: !ownerName.trim() ? "Owner name required." : null,
    ownerEmail: !EMAIL_RE.test(ownerEmail) ? "Valid email required." : null,
    ownerPhone: !KUWAIT_PHONE.test(ownerPhone)
      ? "Kuwait phone (+965 9XXX XXXX) required."
      : null,
    fleetSize:
      fleetSize === "" || fleetSize < 50 || fleetSize > 500
        ? "Fleet size between 50 and 500 required."
        : null,
  };
  const isValid = Object.values(errors).every((e) => e === null);

  // Phase 2: design-partner override of KD 100 (per orchestrator decision #7).
  const designPartner = tenantType === "DESIGN_PARTNER";
  const monthlyOverrideKd = designPartner ? 100 : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      const resp = await createTenant({
        name: name.trim(),
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPhone: ownerPhone.trim(),
        fleetSizeEstimate: typeof fleetSize === "number" ? fleetSize : undefined,
        designPartner,
        monthlyOverrideKd,
      });
      toast.success(
        `Tenant created. Temp password: ${resp.tempPassword} — share verbally.`,
      );
      onNext(resp);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create tenant.";
      toast.error(`Couldn't create tenant: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <div>
        <h2 className="font-display text-xl text-slate-900 mb-1">
          Step 1 — Tenant info
        </h2>
        <p className="text-sm text-sand-600">
          Owner contact + fleet size. All fields required.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tenant-name" className="text-sm font-medium text-slate-900">
          Fleet name
        </label>
        <input
          id="tenant-name"
          type="text"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Fleet"
          className="w-full px-4 py-2.5 rounded-xl border border-sand-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        {errors.name && (
          <p className="text-xs text-red-600">{errors.name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="owner-name" className="text-sm font-medium text-slate-900">
            Owner name
          </label>
          <input
            id="owner-name"
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Mohammed Khalifa"
            className="w-full px-4 py-2.5 rounded-xl border border-sand-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {errors.ownerName && (
            <p className="text-xs text-red-600">{errors.ownerName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="owner-email" className="text-sm font-medium text-slate-900">
            Owner email
          </label>
          <input
            id="owner-email"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@acme.kw"
            className="w-full px-4 py-2.5 rounded-xl border border-sand-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {errors.ownerEmail && (
            <p className="text-xs text-red-600">{errors.ownerEmail}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="owner-phone" className="text-sm font-medium text-slate-900">
            Owner phone (Kuwait)
          </label>
          <input
            id="owner-phone"
            type="tel"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="+965 9XXX XXXX"
            className="w-full px-4 py-2.5 rounded-xl border border-sand-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {errors.ownerPhone && (
            <p className="text-xs text-red-600">{errors.ownerPhone}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="fleet-size" className="text-sm font-medium text-slate-900">
            Fleet size estimate
          </label>
          <input
            id="fleet-size"
            type="number"
            min={50}
            max={500}
            value={fleetSize}
            onChange={(e) =>
              setFleetSize(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="142"
            className="w-full px-4 py-2.5 rounded-xl border border-sand-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {errors.fleetSize && (
            <p className="text-xs text-red-600">{errors.fleetSize}</p>
          )}
        </div>
      </div>

      <fieldset className="space-y-2.5">
        <legend className="text-sm font-medium text-slate-900 mb-1">
          Plan
        </legend>
        <label
          className={cn(
            "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
            tenantType === "STANDARD"
              ? "border-primary bg-primary/5"
              : "border-sand-200 hover:bg-sand-50",
          )}
        >
          <input
            type="radio"
            name="tenant-type"
            value="STANDARD"
            checked={tenantType === "STANDARD"}
            onChange={() => setTenantType("STANDARD")}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">Standard</span>
            <span className="block text-xs text-sand-600">
              KD 2 per active courier per month, floor KD 200/month.
            </span>
          </span>
        </label>
        <label
          className={cn(
            "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
            tenantType === "DESIGN_PARTNER"
              ? "border-primary bg-primary/5"
              : "border-sand-200 hover:bg-sand-50",
          )}
        >
          <input
            type="radio"
            name="tenant-type"
            value="DESIGN_PARTNER"
            checked={tenantType === "DESIGN_PARTNER"}
            onChange={() => setTenantType("DESIGN_PARTNER")}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">
              Design partner — designPartner=true
            </span>
            <span className="block text-xs text-sand-600">
              KD 100/month override + 14-day trial. Founder approval only.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={!isValid || submitting}
          className={cn(
            "inline-flex items-center gap-2 px-5 h-10 rounded-pill text-sm font-medium transition-colors",
            isValid && !submitting
              ? "bg-primary text-white hover:bg-primary-hover"
              : "bg-sand-200 text-sand-500 cursor-not-allowed",
          )}
        >
          {submitting ? "Creating tenant…" : "Save & continue"}
        </button>
      </div>
    </form>
  );
}

export default TenantInfoStep;
