"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  Smartphone,
  Wifi,
  WifiOff,
  Lock,
  Trash2,
  MessageSquare,
  MonitorSmartphone,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function OnlineIndicator({ online }: { online: boolean }) {
  return online ? (
    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Online
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
      <span className="w-2 h-2 rounded-full bg-gray-300" /> Offline
    </span>
  );
}

const MDM_COMMANDS = [
  { id: "lock", label: "Lock Device", icon: Lock, color: "text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-100" },
  { id: "wipe", label: "Wipe Device", icon: Trash2, color: "text-red-600 bg-red-50 hover:bg-red-100 border-red-100" },
  { id: "message", label: "Send Message", icon: MessageSquare, color: "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100" },
  { id: "kiosk", label: "Enable Kiosk", icon: MonitorSmartphone, color: "text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-100" },
  { id: "update", label: "Push Update", icon: RefreshCw, color: "text-green-600 bg-green-50 hover:bg-green-100 border-green-100" },
];

export default function KeetaPhonesPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [commandStatus, setCommandStatus] = useState<Record<string, string>>({});
  const [messageText, setMessageText] = useState("");
  const [showMessageInput, setShowMessageInput] = useState(false);

  const params = new URLSearchParams({ limit: "100" });
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("online", filters.status === "online" ? "true" : "false");

  const { data, loading, refetch } = useApiGet<any>(`/api/devices?${params}`);
  const devices: any[] = data?.data || [];

  // Fleet health stats
  const total = devices.length;
  const online = devices.filter((d) => d.isOnline || d.online).length;
  const onlinePercent = total > 0 ? Math.round((online / total) * 100) : 0;
  const outdatedAgent = devices.filter((d) => d.agentVersion && d.latestAgentVersion && d.agentVersion !== d.latestAgentVersion).length;

  const sendMdmCommand = async (deviceId: string, command: string, payload?: any) => {
    const key = `${deviceId}_${command}`;
    setCommandStatus((prev) => ({ ...prev, [key]: "SENDING" }));
    try {
      await api.post(`/api/devices/${deviceId}/commands`, { command, ...payload });
      setCommandStatus((prev) => ({ ...prev, [key]: "SENT" }));
      setTimeout(() => setCommandStatus((prev) => { const n = { ...prev }; delete n[key]; return n; }), 3000);
    } catch {
      setCommandStatus((prev) => ({ ...prev, [key]: "FAILED" }));
      setTimeout(() => setCommandStatus((prev) => { const n = { ...prev }; delete n[key]; return n; }), 3000);
    }
  };

  const columns = [
    {
      key: "imei",
      label: "IMEI",
      render: (v: string) => <span className="font-mono text-xs text-secondary">{v || "—"}</span>,
    },
    {
      key: "model",
      label: "Phone Model",
      render: (_: any, r: any) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <Smartphone size={13} className="text-gray-400" />
          </div>
          <span className="text-sm font-medium">{r.model || r.phoneModel || "—"}</span>
        </div>
      ),
    },
    {
      key: "driver",
      label: "Assigned Driver",
      render: (_: any, r: any) => (
        <span className="text-sm">{r.driver?.name || r.assignedDriver || "Unassigned"}</span>
      ),
    },
    {
      key: "mobileNumber",
      label: "Mobile Number",
      render: (_: any, r: any) => (
        <span className="font-mono text-xs text-secondary">{r.driver?.phone || "—"}</span>
      ),
    },
    {
      key: "lastSeen",
      label: "Last Seen",
      render: (v: string, r: any) => (
        <span className="text-xs text-secondary">{timeAgo(v || r.lastSeenAt)}</span>
      ),
    },
    {
      key: "agentVersion",
      label: "Agent Version",
      render: (v: string, r: any) => {
        const outdated = v && r.latestAgentVersion && v !== r.latestAgentVersion;
        return (
          <span className={cn("text-xs font-mono", outdated ? "text-orange-500" : "text-secondary")}>
            {v || "—"}
            {outdated && <AlertTriangle size={11} className="inline ml-1" />}
          </span>
        );
      },
    },
    {
      key: "isOnline",
      label: "Status",
      render: (v: boolean, r: any) => <OnlineIndicator online={v ?? r.online ?? false} />,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-keeta" />
        <h1 className="text-xl font-semibold">Keeta — Phones</h1>
        <span className="text-sm text-secondary">Sidra</span>
      </div>

      {/* Fleet Health Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Devices" value={total} icon={Smartphone} />
        <StatCard
          title="Online"
          value={`${onlinePercent}%`}
          icon={Wifi}
          trend={`${online} of ${total} devices`}
          highlight={onlinePercent < 50}
        />
        <StatCard
          title="Outdated Agent"
          value={outdatedAgent}
          icon={AlertTriangle}
          highlight={outdatedAgent > 0}
        />
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search IMEI, model, driver…" },
          {
            key: "status",
            type: "select",
            label: "All Statuses",
            options: [
              { value: "online", label: "Online" },
              { value: "offline", label: "Offline" },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={devices}
        onRowClick={setSelected}
        emptyMessage={loading ? "Loading…" : "No devices found"}
      />

      {/* Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => { setSelected(null); setShowMessageInput(false); setMessageText(""); }}
        title={selected?.model || selected?.phoneModel || "Device Detail"}
        subtitle="Keeta / Sidra"
      >
        {selected && (
          <div className="space-y-5">
            {/* Status banner */}
            <div className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3",
              (selected.isOnline || selected.online) ? "bg-green-50" : "bg-gray-50"
            )}>
              {(selected.isOnline || selected.online) ? (
                <><Wifi size={16} className="text-green-600" /><span className="text-sm font-medium text-green-700">Device Online</span></>
              ) : (
                <><WifiOff size={16} className="text-gray-400" /><span className="text-sm font-medium text-gray-500">Device Offline</span></>
              )}
              <span className="ml-auto text-xs text-secondary">{timeAgo(selected.lastSeen || selected.lastSeenAt)}</span>
            </div>

            {/* Device info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["IMEI", selected.imei],
                ["Model", selected.model || selected.phoneModel],
                ["Assigned Driver", selected.driver?.name || selected.assignedDriver || "Unassigned"],
                ["Agent Version", selected.agentVersion || "—"],
                ["Latest Agent", selected.latestAgentVersion || "—"],
                ["OS Version", selected.osVersion || "—"],
                ["Serial", selected.serialNumber || "—"],
                ["Last Seen", selected.lastSeen ? new Date(selected.lastSeen).toLocaleString() : "—"],
                ["Enrolled", selected.enrolledAt ? new Date(selected.enrolledAt).toLocaleDateString() : "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5 truncate">{val || "—"}</p>
                </div>
              ))}
            </div>

            {/* MDM Commands */}
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">MDM Commands</p>
              <div className="space-y-2">
                {MDM_COMMANDS.map(({ id, label, icon: Icon, color }) => {
                  const key = `${selected.id}_${id}`;
                  const status = commandStatus[key];
                  const isMessage = id === "message";
                  return (
                    <div key={id}>
                      <button
                        onClick={() => {
                          if (isMessage) {
                            setShowMessageInput((v) => !v);
                          } else {
                            sendMdmCommand(selected.id, id.toUpperCase());
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors",
                          color
                        )}
                      >
                        <Icon size={15} />
                        <span>{label}</span>
                        {status === "SENDING" && (
                          <span className="ml-auto text-xs opacity-70 flex items-center gap-1">
                            <RefreshCw size={11} className="animate-spin" /> Sending…
                          </span>
                        )}
                        {status === "SENT" && (
                          <span className="ml-auto text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 size={11} /> Sent
                          </span>
                        )}
                        {status === "FAILED" && (
                          <span className="ml-auto text-xs text-red-500 flex items-center gap-1">
                            <AlertTriangle size={11} /> Failed
                          </span>
                        )}
                      </button>
                      {isMessage && showMessageInput && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Type message…"
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <button
                            onClick={() => {
                              if (messageText.trim()) {
                                sendMdmCommand(selected.id, "SEND_MESSAGE", { message: messageText.trim() });
                                setMessageText("");
                                setShowMessageInput(false);
                              }
                            }}
                            className="px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors"
                          >
                            Send
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Command History */}
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock size={13} /> Command History
              </p>
              {selected.commandHistory?.length > 0 ? (
                <div className="space-y-2">
                  {selected.commandHistory.map((cmd: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                      <span className={cn("text-xs font-mono font-medium px-2 py-0.5 rounded-md", {
                        "bg-green-50 text-green-700": cmd.status === "COMPLETED",
                        "bg-yellow-50 text-yellow-700": cmd.status === "PENDING",
                        "bg-red-50 text-red-600": cmd.status === "FAILED",
                        "bg-gray-100 text-gray-600": !cmd.status,
                      })}>
                        {cmd.command}
                      </span>
                      <span className="text-xs text-secondary ml-auto">{timeAgo(cmd.sentAt || cmd.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-secondary py-4 text-center bg-gray-50 rounded-xl">No command history</p>
              )}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
