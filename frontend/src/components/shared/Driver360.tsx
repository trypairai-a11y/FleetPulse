"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiQuery } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { PageSkeleton } from "@/components/shared/Skeleton";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Car,
  Smartphone,
  Shield,
  DollarSign,
  ClipboardCheck,
  Activity,
  Calendar,
  Gauge,
} from "lucide-react";

type Platform = "talabat" | "keeta";

type Tab =
  | "overview"
  | "attendance"
  | "performance"
  | "cash-violations"
  | "assets";

const TABS: Array<{ key: Tab; label: string; icon: any }> = [
  { key: "overview", label: "Overview", icon: Gauge },
  { key: "attendance", label: "Attendance & Shifts", icon: Calendar },
  { key: "performance", label: "Orders & Performance", icon: Activity },
  { key: "cash-violations", label: "Cash, Violations & Documents", icon: Shield },
  { key: "assets", label: "Assets", icon: Smartphone },
];

export default function Driver360({
  driverId,
  platform,
}: {
  driverId: string;
  platform: Platform;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "overview";
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const { data, isLoading, error } = useApiQuery<any>(
    ["driver360", driverId, platform],
    `/api/drivers/${driverId}/profile?platform=${platform.toUpperCase()}`
  );

  if (isLoading || !data) return <PageSkeleton />;

  if (error) {
    return (
      <div className="p-8 text-sm text-red-600">
        Failed to load driver profile.
      </div>
    );
  }

  const o = data.overview?.driver ?? {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/${platform}/drivers`)}
          className="rounded-xl p-2 hover:bg-gray-50"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          {o.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-sm text-gray-500">
              {(o.name ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-lg font-semibold">{o.name}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Phone size={12} />
                {o.phone}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} />
                {o.zone ?? "Unassigned"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Car size={12} />
                {o.vehicleType ?? "—"}
              </span>
              {o.performanceTier && (
                <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-[10px] text-yellow-700">
                  {o.performanceTier}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
              tab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab data={data} />}
      {tab === "attendance" && <AttendanceTab data={data} />}
      {tab === "performance" && <PerformanceTab data={data} platform={platform} />}
      {tab === "cash-violations" && <CashViolationsTab data={data} />}
      {tab === "assets" && <AssetsTab data={data} />}
    </div>
  );
}

function KPI({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
    </div>
  );
}

function OverviewTab({ data }: { data: any }) {
  const o = data.overview;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KPI label="Today orders" value={o.todayOrders ?? 0} />
      <KPI label="Today cash" value={`${Number(o.todayCash ?? 0).toFixed(3)} KD`} />
      <KPI label="Week orders" value={o.weekOrders ?? 0} />
      <KPI
        label="UTR (week)"
        value={o.utrThisWeek != null ? Number(o.utrThisWeek).toFixed(2) : "—"}
      />
      <KPI
        label="Active shift"
        value={
          o.activeSession ? (
            <span className="text-green-600">Online</span>
          ) : (
            <span className="text-gray-400">Offline</span>
          )
        }
        hint={o.activeSession?.area ?? undefined}
      />
      <KPI label="Platform" value={o.driver?.platform ?? "—"} />
      <KPI label="Status" value={o.driver?.status ?? "—"} />
      <KPI label="Supervisor" value={o.driver?.supervisor ?? "—"} />
    </div>
  );
}

function AttendanceTab({ data }: { data: any }) {
  const rows = data.attendance?.records ?? [];
  const leaves = data.attendance?.leaves ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-gray-200 bg-white lg:col-span-2">
        <header className="border-b border-gray-100 px-4 py-2 text-sm font-semibold">
          Last 30 days
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Late</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{new Date(r.date).toLocaleDateString()}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2">{r.lateMinutes ? `${r.lateMinutes}m` : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">
                  No attendance records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white">
        <header className="border-b border-gray-100 px-4 py-2 text-sm font-semibold">
          Leaves
        </header>
        <ul className="divide-y divide-gray-100">
          {leaves.length === 0 && (
            <li className="px-4 py-4 text-center text-xs text-gray-400">No leave history.</li>
          )}
          {leaves.map((l: any) => (
            <li key={l.id} className="px-4 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span>{new Date(l.startDate).toLocaleDateString()}</span>
                <span className="text-xs text-gray-500">{l.status}</span>
              </div>
              {l.reason && <div className="text-xs text-gray-500">{l.reason}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PerformanceTab({ data, platform }: { data: any; platform: Platform }) {
  const metrics =
    platform === "talabat"
      ? data.performance?.talabatMetrics ?? []
      : data.performance?.keetaMetrics ?? [];
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <header className="border-b border-gray-100 px-4 py-2 text-sm font-semibold">
        Daily performance (last 7 days)
      </header>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-gray-500">
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Orders</th>
            <th className="px-4 py-2">Online h</th>
            <th className="px-4 py-2">UTR</th>
            <th className="px-4 py-2">On-time</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m: any) => {
            const date = platform === "talabat" ? m.shiftDate : m.date;
            const orders = platform === "talabat" ? m.ordersCompleted : m.deliveredTasks;
            const online =
              platform === "talabat"
                ? m.onlineHours
                : m.onlineTime != null
                  ? (m.onlineTime / 60).toFixed(1)
                  : null;
            const utr = platform === "talabat" ? m.utr : null;
            const onTime = platform === "keeta" && m.onTimeRate != null
              ? `${(Number(m.onTimeRate) * 100).toFixed(1)}%`
              : "—";
            return (
              <tr key={m.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{new Date(date).toLocaleDateString()}</td>
                <td className="px-4 py-2">{orders ?? "—"}</td>
                <td className="px-4 py-2">{online ?? "—"}</td>
                <td className="px-4 py-2">{utr != null ? Number(utr).toFixed(2) : "—"}</td>
                <td className="px-4 py-2">{onTime}</td>
              </tr>
            );
          })}
          {metrics.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-xs text-gray-400">
                No metrics yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CashViolationsTab({ data }: { data: any }) {
  const cash = data.cash ?? {};
  const v = data.violations ?? {};
  const docs = data.documents ?? {};
  const docRows = Object.entries(docs);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-gray-200 bg-white">
        <header className="flex items-center justify-between border-b border-gray-100 px-4 py-2 text-sm font-semibold">
          <span className="inline-flex items-center gap-1">
            <DollarSign size={14} /> Cash
          </span>
          <span className="text-xs text-red-600">
            Outstanding {Number(cash.pendingDues ?? 0).toFixed(3)} KD
          </span>
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Collected</th>
              <th className="px-4 py-2">Pending</th>
            </tr>
          </thead>
          <tbody>
            {(cash.records ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{new Date(c.date).toLocaleDateString()}</td>
                <td className="px-4 py-2">{Number(c.collectionAmount).toFixed(3)}</td>
                <td className="px-4 py-2">{Number(c.pendingDues).toFixed(3)}</td>
              </tr>
            ))}
            {(cash.records ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">
                  No cash records this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <header className="border-b border-gray-100 px-4 py-2 text-sm font-semibold">
          <span className="inline-flex items-center gap-1">
            <Shield size={14} /> Violations
          </span>
        </header>
        <ul className="divide-y divide-gray-100">
          {(v.items ?? []).length === 0 && (
            <li className="px-4 py-4 text-center text-xs text-gray-400">
              No violations on record.
            </li>
          )}
          {(v.items ?? []).map((vio: any) => (
            <li key={vio.id} className="px-4 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span>{vio.violationType.replace(/_/g, " ")}</span>
                <span className="text-xs text-gray-500">{vio.violationStatus}</span>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(vio.violationTime).toLocaleDateString()} · Appeal: {vio.appealStatus}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <header className="border-b border-gray-100 px-4 py-2 text-sm font-semibold">
          <span className="inline-flex items-center gap-1">
            <ClipboardCheck size={14} /> Documents
          </span>
        </header>
        <ul className="divide-y divide-gray-100">
          {docRows.map(([key, val]: any) => (
            <li key={key} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px]",
                  val?.status === "VALID" && "bg-green-50 text-green-700",
                  val?.status === "EXPIRING" && "bg-yellow-50 text-yellow-700",
                  val?.status === "EXPIRED" && "bg-red-50 text-red-700",
                  (!val?.status || val?.status === "MISSING") && "bg-gray-100 text-gray-500"
                )}
              >
                {val?.status ?? "MISSING"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AssetsTab({ data }: { data: any }) {
  const device = data.assets?.device;
  const vehicle = data.assets?.vehicle;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <header className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
          <Smartphone size={14} /> Phone
        </header>
        {device ? (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">IMEI</dt>
            <dd>{device.imei}</dd>
            <dt className="text-gray-500">Model</dt>
            <dd>{device.model}</dd>
            <dt className="text-gray-500">Online</dt>
            <dd>
              <span className={device.isOnline ? "text-green-600" : "text-gray-500"}>
                {device.isOnline ? "Yes" : "No"}
              </span>
            </dd>
            <dt className="text-gray-500">Last seen</dt>
            <dd>{device.lastSeen ? new Date(device.lastSeen).toLocaleString() : "—"}</dd>
          </dl>
        ) : (
          <p className="text-xs text-gray-400">No phone assigned.</p>
        )}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <header className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
          <Car size={14} /> Vehicle
        </header>
        {vehicle ? (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">Plate</dt>
            <dd>{vehicle.plateNumber}</dd>
            <dt className="text-gray-500">Type</dt>
            <dd>{vehicle.vehicleType}</dd>
            <dt className="text-gray-500">Status</dt>
            <dd>{vehicle.status}</dd>
          </dl>
        ) : (
          <p className="text-xs text-gray-400">No vehicle assigned.</p>
        )}
      </div>
    </div>
  );
}
