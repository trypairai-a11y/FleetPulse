"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useApiGet } from "@/hooks/useApi";

interface Form {
  demandCar: number;
  demandBike: number;
  targetMonthlyCar: number;
  targetMonthlyBike: number;
  weightOrders: number;
  weightAttendance: number;
  weightViolations: number;
  goldThreshold: number;
  silverThreshold: number;
  lateArrivalGraceMin: number;
  bikeAreaWhitelist: string;
}

const EMPTY: Form = {
  demandCar: 30, demandBike: 25,
  targetMonthlyCar: 800, targetMonthlyBike: 600,
  weightOrders: 0.4, weightAttendance: 0.6, weightViolations: 0.05,
  goldThreshold: 0.95, silverThreshold: 0.8,
  lateArrivalGraceMin: 15,
  bikeAreaWhitelist: "Salmiya, Hawally, Jabriya",
};

export default function TargetsPage() {
  const { data: s } = useApiGet<any>("/api/americana/settings/tenant");
  const [form, setForm] = useState<Form>(EMPTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!s) return;
    setForm({
      demandCar: s?.demandTargetPerDriverPerDay?.car ?? EMPTY.demandCar,
      demandBike: s?.demandTargetPerDriverPerDay?.bike ?? EMPTY.demandBike,
      targetMonthlyCar: s?.monthlyOrderTarget?.car ?? EMPTY.targetMonthlyCar,
      targetMonthlyBike: s?.monthlyOrderTarget?.bike ?? EMPTY.targetMonthlyBike,
      weightOrders: s?.tierWeights?.orders ?? EMPTY.weightOrders,
      weightAttendance: s?.tierWeights?.attendance ?? EMPTY.weightAttendance,
      weightViolations: s?.tierWeights?.violations ?? EMPTY.weightViolations,
      goldThreshold: s?.tierThresholds?.gold ?? EMPTY.goldThreshold,
      silverThreshold: s?.tierThresholds?.silver ?? EMPTY.silverThreshold,
      lateArrivalGraceMin: s?.lateArrivalGraceMin ?? EMPTY.lateArrivalGraceMin,
      bikeAreaWhitelist: (s?.bikeAreaWhitelist ?? ["Salmiya", "Hawally", "Jabriya"]).join(", "),
    });
  }, [s]);

  const save = async () => {
    const payload = {
      americana: {
        demandTargetPerDriverPerDay: { car: form.demandCar, bike: form.demandBike },
        monthlyOrderTarget: { car: form.targetMonthlyCar, bike: form.targetMonthlyBike },
        tierWeights: { orders: form.weightOrders, attendance: form.weightAttendance, violations: form.weightViolations },
        tierThresholds: { gold: form.goldThreshold, silver: form.silverThreshold },
        lateArrivalGraceMin: form.lateArrivalGraceMin,
        bikeAreaWhitelist: form.bikeAreaWhitelist.split(",").map((s) => s.trim()).filter(Boolean),
      },
    };
    await api.put("/api/americana/settings/tenant", payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-secondary">{label}</span>
      <div className="w-40">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[900px]">
      <h1 className="text-xl font-semibold">Targets & tier weights</h1>
      <p className="text-sm text-secondary">
        Tenant-scoped parameters for the demand math, tier engine, and violation grace window.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold mb-2">Demand targets</h3>
          <Row label="Car driver orders / day">
            <input type="number" value={form.demandCar} onChange={(e) => setForm({ ...form, demandCar: Number(e.target.value) })} className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
          </Row>
          <Row label="Bike driver orders / day">
            <input type="number" value={form.demandBike} onChange={(e) => setForm({ ...form, demandBike: Number(e.target.value) })} className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
          </Row>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold mb-2">Monthly order targets</h3>
          <Row label="Car driver monthly">
            <input type="number" value={form.targetMonthlyCar} onChange={(e) => setForm({ ...form, targetMonthlyCar: Number(e.target.value) })} className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
          </Row>
          <Row label="Bike driver monthly">
            <input type="number" value={form.targetMonthlyBike} onChange={(e) => setForm({ ...form, targetMonthlyBike: Number(e.target.value) })} className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
          </Row>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold mb-2">Tier weights & thresholds</h3>
          <Row label="Weight: orders">
            <input type="number" step="0.05" value={form.weightOrders} onChange={(e) => setForm({ ...form, weightOrders: Number(e.target.value) })} className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
          </Row>
          <Row label="Weight: attendance">
            <input type="number" step="0.05" value={form.weightAttendance} onChange={(e) => setForm({ ...form, weightAttendance: Number(e.target.value) })} className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
          </Row>
          <Row label="Weight: violations (penalty)">
            <input type="number" step="0.01" value={form.weightViolations} onChange={(e) => setForm({ ...form, weightViolations: Number(e.target.value) })} className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
          </Row>
          <Row label="Gold composite ≥">
            <input type="number" step="0.01" value={form.goldThreshold} onChange={(e) => setForm({ ...form, goldThreshold: Number(e.target.value) })} className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
          </Row>
          <Row label="Silver composite ≥">
            <input type="number" step="0.01" value={form.silverThreshold} onChange={(e) => setForm({ ...form, silverThreshold: Number(e.target.value) })} className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
          </Row>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold mb-2">Violations & assignment</h3>
          <Row label="Late-arrival grace (min)">
            <input type="number" value={form.lateArrivalGraceMin} onChange={(e) => setForm({ ...form, lateArrivalGraceMin: Number(e.target.value) })} className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
          </Row>
          <div className="pt-2">
            <p className="text-xs text-secondary mb-1">Bike whitelist areas (comma-separated)</p>
            <input value={form.bikeAreaWhitelist} onChange={(e) => setForm({ ...form, bikeAreaWhitelist: e.target.value })} className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover">
          Save targets
        </button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
      </div>
    </div>
  );
}
