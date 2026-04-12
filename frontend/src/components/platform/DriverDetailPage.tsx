"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  ArrowLeft, Package, Banknote, CalendarClock, ShieldAlert,
  Phone, MapPin, Clock, Ban,
} from "lucide-react";

type Tab = "overview" | "orders" | "attendance" | "restrictions";

interface Props {
  platformKey: string;
  platformLabel: string;
  /** Extra tabs beyond the defaults (Overview, Orders, Attendance, Restrictions) */
  extraTabs?: { key: string; label: string; icon: any; render: (driverId: string) => React.ReactNode }[];
}

export default function DriverDetailPage({ platformKey, platformLabel, extraTabs = [] }: Props) {
  const params = useParams();
  const router = useRouter();
  const driverId = params.id as string;
  const [tab, setTab] = useState<string>("overview");

  const { data: driver, loading } = useApiGet<any>(`/api/drivers/${driverId}`);
  const { data: ordersData } = useApiGet<any>(tab === "orders" ? `/api/orders?platform=${platformKey.toUpperCase()}&driverId=${driverId}&limit=50` : null);
  const { data: attendanceData } = useApiGet<any>(tab === "attendance" ? `/api/attendance?driverId=${driverId}&limit=30` : null);
  const { data: restrictionsData } = useApiGet<any>(tab === "restrictions" ? `/api/driver-restrictions?driverId=${driverId}` : null);

  const orders = ordersData?.data || [];
  const attendance = attendanceData?.data || [];
  const restrictions: any[] = restrictionsData || [];

  const allTabs = [
    { key: "overview", label: "Overview", icon: CalendarClock },
    { key: "orders", label: "Orders", icon: Package },
    { key: "attendance", label: "Attendance", icon: Clock },
    ...extraTabs.map((t) => ({ key: t.key, label: t.label, icon: t.icon })),
    { key: "restrictions", label: "Restrictions", icon: Ban },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-secondary">Driver not found</p>
        <button onClick={() => router.back()} className="text-primary hover:underline text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 text-secondary">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{driver.name}</h1>
          <p className="text-sm text-secondary flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1"><Phone size={12} /> {driver.phone || "—"}</span>
            <span className="flex items-center gap-1"><MapPin size={12} /> {driver.zone || "—"}</span>
            <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
              driver.status === "ACTIVE" ? "bg-green-50 text-green-600" :
              driver.status === "SUSPENDED" ? "bg-red-50 text-red-600" :
              driver.status === "RESTRICTED" || driver.status === "RESTRICTED_PERMANENTLY" ? "bg-orange-50 text-orange-600" :
              "bg-gray-100 text-gray-500"
            )}>{driver.status}</span>
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Platform" value={driver.platform} icon={Package} />
        <StatCard title="Company" value={driver.company?.name || "—"} icon={Banknote} />
        <StatCard title="Batch" value={driver.batchNumber || "—"} icon={CalendarClock} />
        <StatCard title="Restrictions" value={driver._count?.restrictions || 0}
          icon={ShieldAlert} highlight={(driver._count?.restrictions || 0) > 0} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {allTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-secondary hover:text-foreground hover:border-gray-300"
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold mb-3">Driver Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {[
              ["Civil ID", driver.civilId],
              ["Join Date", driver.joinDate ? new Date(driver.joinDate).toLocaleDateString() : "—"],
              ["Salary", driver.salary ? `${driver.salary} KD` : "—"],
              ["Nationality", driver.nationality],
              ["Vehicle Type", driver.vehicleType],
              ["Platform ID", driver.platformDriverId],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-secondary text-xs mb-0.5">{label}</p>
                <p className="font-medium">{value || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold">Recent Orders ({orders.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-secondary">
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Orders</th>
                  <th className="text-left px-5 py-3">Cash</th>
                  <th className="text-left px-5 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id} className="border-b border-gray-50 last:border-0 text-sm">
                    <td className="px-5 py-3">{new Date(o.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 font-semibold">{o.orderCount}</td>
                    <td className="px-5 py-3">{o.cashCollected ? `${Number(o.cashCollected).toFixed(3)} KD` : "—"}</td>
                    <td className="px-5 py-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-100">{o.source}</span></td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-secondary">No orders found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "attendance" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold">Attendance ({attendance.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-xs font-medium text-secondary">
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Late Minutes</th>
                  <th className="text-left px-5 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a: any) => (
                  <tr key={a.id} className="border-b border-gray-50 last:border-0 text-sm">
                    <td className="px-5 py-3">{new Date(a.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
                        a.status === "PRESENT" ? "bg-green-50 text-green-600" :
                        a.status === "LATE" ? "bg-yellow-50 text-yellow-600" :
                        a.status === "ABSENT" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-400"
                      )}>{a.status}</span>
                    </td>
                    <td className="px-5 py-3">{a.lateMinutes > 0 ? `${a.lateMinutes}m` : "—"}</td>
                    <td className="px-5 py-3 text-secondary">{a.source}</td>
                  </tr>
                ))}
                {attendance.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-secondary">No attendance records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "restrictions" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold">Restrictions ({restrictions.length})</h2>
          </div>
          {restrictions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-secondary">No restrictions</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {restrictions.map((r: any) => (
                <div key={r.id} className="px-5 py-4 flex items-center gap-4">
                  <Ban size={16} className="text-red-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.type}</p>
                    <p className="text-xs text-secondary">{r.reason || "No reason given"}</p>
                    <p className="text-xs text-secondary mt-0.5">
                      {new Date(r.startDate).toLocaleDateString()}
                      {r.endDate ? ` — ${new Date(r.endDate).toLocaleDateString()}` : " — ongoing"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Render any extra tab content from platform-specific config */}
      {extraTabs.find((t) => t.key === tab)?.render(driverId)}
    </div>
  );
}
