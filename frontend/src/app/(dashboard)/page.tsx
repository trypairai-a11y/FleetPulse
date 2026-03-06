"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useDrivers, useDriverLeaderboard, useDriverSummary } from "@/hooks/useDrivers";
import { useOrderSummary, useHourlyDistribution } from "@/hooks/useOrders";
import { useAttendanceSummary } from "@/hooks/useAttendance";
import { useCashSummary, useOutstandingDrivers } from "@/hooks/useCash";
import { useCompanies } from "@/hooks/useSettings";
import type { CompanyConfig } from "@/types/settings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useShifts, useMissingScreenshots } from "@/hooks/useShifts";
import type { MissingScreenshotItem } from "@/hooks/useShifts";
import { useAlerts, useDigest } from "@/hooks/useAI";
import type { DigestItem } from "@/hooks/useAI";
import { formatKWD, formatRelativeTime } from "@/lib/utils";
import { PLATFORM_COLORS, PLATFORM_ORDER_TARGETS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Area, ReferenceDot, ReferenceLine,
  ComposedChart, ReferenceArea, Line,
} from "recharts";
import {
  Users, Package, ArrowUpRight, ArrowDownRight,
  Clock, AlertTriangle, CheckCircle2, Brain,
  Banknote, ChevronDown, ChevronUp, Trophy, X,
  Sparkles, Star, TrendingUp, Zap,
  CalendarDays, Activity, Target, Gauge, UserCheck, CalendarClock, Camera,
  LogIn, LogOut, ImageOff, Receipt,
} from "lucide-react";
import { PeriodSelector, useDateRange } from "@/components/PeriodSelector";
import type { Period } from "@/components/PeriodSelector";

const CARD_BASE = "bg-white rounded-lg border border-[#E5E5ED]/40 hover:border-[#E5E5ED] transition-colors duration-150";
const PLATFORM_COLOR_MAP: Record<string, string> = { talabat: "#FF5A00", keeta: "#FFD500", americana: "#1E3A5F" };

function SectionHeader({ icon: Icon, title, actionLabel, actionHref }: { icon: React.ElementType; title: string; actionLabel?: string; actionHref?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-[#8E8EA0]" strokeWidth={2} /><h3 className="text-[13px] font-semibold text-[#1E1E2D]">{title}</h3></div>
      {actionLabel && actionHref && <Link href={actionHref} className="text-[12px] font-medium text-[#C0C0CC] hover:text-[#8E8EA0] transition-colors">{actionLabel}</Link>}
    </div>
  );
}

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
}


function MiniRing({ percent, size = 36, stroke = 3, color = "#6366F1" }: { percent: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E5ED" strokeWidth={stroke} transform={`rotate(-90 ${size/2} ${size/2})`} />
      {percent > 0 && <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (percent/100)*c} transform={`rotate(-90 ${size/2} ${size/2})`} className="transition-all duration-1000 ease-out" />}
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill={percent > 0 ? color : "#C0C0CC"} fontSize={size*0.28} fontWeight={700}>{Math.round(percent)}%</text>
    </svg>
  );
}

function computeChange(current: number, previous: number | undefined | null): { text: string; positive: boolean } | null {
  if (previous == null || previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return null;
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, positive: pct > 0 };
}

function MetricCard({ label, value, numericValue, suffix, change, icon: Icon, iconColor, delay, loading, href }: { label: string; value: string | number; numericValue?: number; suffix?: string; change?: { text: string; positive: boolean } | null; icon: React.ElementType; iconColor: string; delay: number; loading?: boolean; href?: string }) {
  const card = (
    <div className="group bg-white rounded-lg border border-[#F1F0FB] p-5 animate-in-view hover:border-[#E5E5ED] transition-all duration-300" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor }} strokeWidth={2} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#C0C0CC] truncate">{label}</span>
      </div>
      {loading ? <Skeleton className="h-8 w-16 rounded-md" /> : (
        <div className="flex items-baseline gap-1.5">
          <span className="text-[28px] font-bold tracking-[-0.02em] leading-none text-[#1E1E2D]" style={{ fontFeatureSettings: "'tnum' 1" }}>{numericValue != null ? <AnimatedNumber value={numericValue} /> : value}</span>
          {suffix && <span className="text-[13px] font-medium text-[#C0C0CC]">{suffix}</span>}
          {change && <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ms-auto ${change.positive ? "text-[#0F7B6C]" : "text-[#EF4444]"}`}>{change.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{change.text}</span>}
        </div>
      )}
    </div>
  );
  return href ? <Link href={href} className="block">{card}</Link> : card;
}

function IntelTooltip({ active, payload, label, isAr }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string; isAr?: boolean }) {
  if (!active || !payload?.length) return null;
  const today = payload.find(p => p.dataKey === "orders"), yesterday = payload.find(p => p.dataKey === "yesterday");
  const drivers = payload.find(p => p.dataKey === "scheduledDrivers"), projected = payload.find(p => p.dataKey === "projected");
  const orderCount = today?.value ?? projected?.value ?? 0;
  const yesterdayCount = yesterday?.value ?? 0;
  const driverCount = drivers?.value ?? 0;
  const diff = yesterdayCount > 0 ? Math.round(((orderCount - yesterdayCount) / yesterdayCount) * 100) : null;
  const loadRatio = driverCount > 0 ? (orderCount / driverCount).toFixed(1) : null;
  return (
    <div className="bg-[#1E1E2D]/95 backdrop-blur-sm text-white px-3.5 py-2.5 rounded-lg text-[12px] shadow-lg border border-white/[0.06] min-w-[160px]">
      <div className="text-[10px] text-[#8E8EA0] uppercase tracking-wider font-medium">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-[16px] font-bold tracking-tight">{orderCount}</span>
        <span className="text-[11px] text-[#7ECBF5]">{isAr ? "طلب" : "orders"}</span>
        {diff != null && <span className={`text-[10px] font-semibold ${diff >= 0 ? "text-[#0F7B6C]" : "text-[#EF4444]"}`}>{diff >= 0 ? "+" : ""}{diff}%</span>}
      </div>
      {yesterdayCount > 0 && <div className="text-[10px] text-[#8E8EA0] mt-0.5">{isAr ? "الأسبوع الماضي" : "Last week"}: {yesterdayCount}</div>}
      {driverCount > 0 && <div className="text-[10px] text-[#8E8EA0] mt-1">{isAr ? "سائقين" : "Drivers"}: {driverCount}{loadRatio && <> &middot; {isAr ? "حمولة" : "Load"}: {loadRatio}</>}</div>}
    </div>
  );
}

function PeakDot({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx == null || cy == null) return null;
  return (<g><circle cx={cx} cy={cy} r={12} fill="#6366F1" opacity={0.08}><animate attributeName="r" values="10;14;10" dur="2.5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.10;0.04;0.10" dur="2.5s" repeatCount="indefinite" /></circle><circle cx={cx} cy={cy} r={4} fill="#fff" stroke="#6366F1" strokeWidth={2.5} /></g>);
}

function NowLabel({ viewBox }: { viewBox?: { x?: number; y?: number } }) {
  if (!viewBox?.x) return null;
  return <text x={viewBox.x} y={10} textAnchor="middle" fill="#6366F1" fontSize={9} fontWeight={700}>NOW</text>;
}

function OperationalPulseCard({ hourlyData, yesterdayHourly, orderSummary, yesterdayOrders, driverSummary, attendanceSummary, todayShifts, loading, isAr }: {
  hourlyData: { hour: number; count: number }[];
  yesterdayHourly: { hour: number; count: number }[];
  orderSummary: { total: number; total_amount: number } | undefined;
  yesterdayOrders: { total: number; total_amount: number } | undefined;
  driverSummary: { total: number } | undefined;
  attendanceSummary: { summary: Record<string, number> } | undefined;
  todayShifts: { scheduled_start: string; scheduled_end: string }[];
  loading: boolean;
  isAr: boolean;
}) {
  const currentHour = new Date().getHours();

  if (loading) return (
    <div className={`${CARD_BASE} animate-in-view`} style={{ animationDelay: "200ms" }}>
      <div className="px-5 pt-5 pb-2"><Skeleton className="h-4 w-40 mb-3" /><Skeleton className="h-7 w-24 mb-2" /><Skeleton className="h-3 w-56" /></div>
      <div className="flex gap-3 px-5 py-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="flex-1 h-[82px] rounded-lg" />)}</div>
      <div className="px-5 pb-5"><Skeleton className="h-[260px] w-full rounded-lg" /></div>
    </div>
  );

  const totalOrders = orderSummary?.total ?? 0;
  const totalAmount = orderSummary?.total_amount ?? 0;
  const yesterdayTotal = yesterdayOrders?.total ?? 0;
  const yesterdayAmount = yesterdayOrders?.total_amount ?? 0;
  const presentDrivers = (attendanceSummary?.summary?.present ?? 0) + (attendanceSummary?.summary?.late ?? 0);
  const totalDrivers = driverSummary?.total ?? 0;
  const orderChangePct = yesterdayTotal > 0 ? Math.round(((totalOrders - yesterdayTotal) / yesterdayTotal) * 100) : null;
  const avgOrder = totalOrders > 0 ? totalAmount / totalOrders : 0;
  const yesterdayAvg = yesterdayTotal > 0 ? yesterdayAmount / yesterdayTotal : 0;
  const ordersPerDriver = presentDrivers > 0 ? totalOrders / presentDrivers : 0;
  const utilization = totalDrivers > 0 ? Math.round((presentDrivers / totalDrivers) * 100) : 0;
  const peakHour = hourlyData.length > 0 ? hourlyData.reduce((m, d) => d.count > m.count ? d : m, { hour: 0, count: 0 }) : { hour: 0, count: 0 };

  const driversPerHour = useMemo(() => {
    const r: number[] = Array(24).fill(0);
    todayShifts.forEach(s => {
      const sh = new Date(s.scheduled_start).getHours();
      const eh = new Date(s.scheduled_end).getHours();
      if (eh > sh) { for (let h = sh; h < eh; h++) r[h]++; }
      else if (eh < sh) { for (let h = sh; h < 24; h++) r[h]++; for (let h = 0; h < eh; h++) r[h]++; }
    });
    return r;
  }, [todayShifts]);

  const paceRatio = useMemo(() => {
    if (currentHour < 8) return 1;
    const ts = hourlyData.filter(d => d.hour <= currentHour).reduce((s, d) => s + d.count, 0);
    const ys = yesterdayHourly.filter(d => d.hour <= currentHour).reduce((s, d) => s + d.count, 0);
    return ys > 0 ? ts / ys : 1;
  }, [hourlyData, yesterdayHourly, currentHour]);

  const projectedTotal = useMemo(() => {
    if (currentHour < 8) return null;
    const soFar = hourlyData.reduce((s, d) => s + d.count, 0);
    const remaining = yesterdayHourly.filter(d => d.hour > currentHour).reduce((s, d) => s + d.count, 0);
    return Math.round(soFar + remaining * paceRatio);
  }, [hourlyData, yesterdayHourly, currentHour, paceRatio]);

  const projectedRevenue = projectedTotal != null && totalOrders > 0 ? (totalAmount / totalOrders) * projectedTotal : null;

  const chartData = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const tc = hourlyData.find(d => d.hour === i)?.count ?? 0;
    const yc = yesterdayHourly.find(d => d.hour === i)?.count ?? 0;
    const isPast = i <= currentHour;
    return {
      name: `${i}:00`,
      orders: isPast ? tc : null,
      yesterday: yc,
      projected: i === currentHour ? tc : (!isPast && currentHour >= 8 ? Math.round(yc * paceRatio) : null),
      scheduledDrivers: driversPerHour[i],
    };
  }), [hourlyData, yesterdayHourly, currentHour, paceRatio, driversPerHour]);

  const understaffedWindows = useMemo(() => {
    const wins: { start: string; end: string }[] = [];
    let inW = false, ws = 0;
    for (let h = 0; h < 24; h++) {
      const o = (chartData[h].orders ?? chartData[h].projected ?? 0) as number;
      const d = driversPerHour[h];
      const bad = d > 0 && o > 0 && o / d > 4;
      if (bad && !inW) { ws = h; inW = true; } else if (!bad && inW) { wins.push({ start: `${ws}:00`, end: `${h}:00` }); inW = false; }
    }
    if (inW) wins.push({ start: `${ws}:00`, end: "23:00" });
    return wins;
  }, [chartData, driversPerHour]);


const driverLoadHealth = ordersPerDriver > 5 ? "critical" : ordersPerDriver > 3.5 ? "warning" : "good";
  const utilHealth = utilization >= 70 ? "good" : utilization >= 50 ? "warning" : "critical";
  const healthColor = (h: string) => h === "critical" ? "#EF4444" : h === "warning" ? "#D9730D" : "#0F7B6C";

  const kpis: { icon: React.ElementType; label: string; value: string; color: string; change?: number | null; subtitle?: string; percent?: number }[] = [
    { icon: Banknote, label: isAr ? "إيرادات اليوم" : "Revenue Today", value: formatKWD(totalAmount), color: "#0D9488", change: yesterdayAmount > 0 ? Math.round(((totalAmount - yesterdayAmount) / yesterdayAmount) * 100) : null, subtitle: isAr ? "مقارنة بالأسبوع الماضي" : "vs last week" },
    { icon: Target, label: isAr ? "متوسط الطلب" : "Avg Order", value: formatKWD(avgOrder), color: "#6366F1", change: yesterdayAvg > 0 ? Math.round(((avgOrder - yesterdayAvg) / yesterdayAvg) * 100) : null, subtitle: isAr ? "مقارنة بالأسبوع الماضي" : "vs last week" },
{ icon: UserCheck, label: isAr ? "طلب/سائق" : "Orders/Driver", value: ordersPerDriver.toFixed(1), color: healthColor(driverLoadHealth), subtitle: isAr ? `${presentDrivers} سائق حاضر` : `${presentDrivers} on duty` },
    { icon: Gauge, label: isAr ? "استغلال الأسطول" : "Utilization", value: `${utilization}%`, color: healthColor(utilHealth), percent: utilization, subtitle: `${presentDrivers} / ${totalDrivers}` },
  ];

  return (
    <div className={`${CARD_BASE} animate-in-view overflow-hidden`} style={{ animationDelay: "200ms" }}>
      <div className="flex items-start justify-between px-5 pt-5 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-2"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366F1]/10 to-[#6366F1]/[0.04] flex items-center justify-center"><Activity className="w-3.5 h-3.5 text-[#6366F1]" strokeWidth={2.5} /></div><h3 className="text-[13px] font-semibold text-[#1E1E2D]">{isAr ? "نبض العمليات" : "Operational Pulse"}</h3></div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[28px] font-extrabold text-[#1E1E2D] tracking-tight leading-none">{totalOrders.toLocaleString()}</span>
            <span className="text-[12px] text-[#8E8EA0] font-medium">{isAr ? "طلب" : "orders"}</span>
            {orderChangePct != null && <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${orderChangePct >= 0 ? "bg-[#0F7B6C]/10 text-[#0F7B6C]" : "bg-[#EF4444]/10 text-[#EF4444]"}`}>{orderChangePct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(orderChangePct)}%</span>}
          </div>
          {projectedTotal != null && <div className="text-[11px] text-[#8E8EA0] mt-1">{isAr ? "المتوقع" : "Projected"}: ~{projectedTotal.toLocaleString()} {isAr ? "بنهاية اليوم" : "by end of day"}{projectedRevenue != null && ` (${formatKWD(projectedRevenue)})`}</div>}
        </div>
        <div className="flex items-center gap-2.5">
          {peakHour.count > 0 && <div className="flex items-center gap-1.5 ps-1.5 pe-3 py-1.5 rounded-full bg-gradient-to-r from-[#6366F1]/[0.08] to-[#6366F1]/[0.03] border border-[#6366F1]/10"><div className="w-5 h-5 rounded-full bg-[#6366F1] flex items-center justify-center"><Zap className="w-2.5 h-2.5 text-white" strokeWidth={2.5} /></div><span className="text-[10px] uppercase tracking-wider text-[#6366F1]/60 font-semibold">{isAr ? "ذروة" : "Peak"}</span><span className="text-[13px] font-extrabold text-[#6366F1] tracking-tight">{peakHour.hour}:00</span></div>}
          <Link href="/orders" className="text-[12px] font-medium text-[#C0C0CC] hover:text-[#8E8EA0] transition-colors">{isAr ? "عرض الكل" : "View all"}</Link>
        </div>
      </div>
      <div className="flex gap-3 px-5 py-3">
        {kpis.map((k, i) => (
          <div key={i} className="flex-1 min-w-0 bg-white rounded-lg border border-[#F1F0FB] p-4 hover:border-[#E5E5ED] transition-all duration-300">
            <div className="flex items-center gap-1.5 mb-3">
              <k.icon className="w-3.5 h-3.5 shrink-0" style={{ color: k.color }} strokeWidth={2} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#C0C0CC] truncate">{k.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-bold tracking-[-0.02em] leading-none text-[#1E1E2D]" style={{ fontFeatureSettings: "'tnum' 1" }}>{k.value}</span>
              {k.change != null && (
                <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ms-auto ${k.change >= 0 ? "text-[#0F7B6C]" : "text-[#EF4444]"}`}>
                  {k.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {k.change >= 0 ? "+" : ""}{k.change}%
                </span>
              )}
            </div>
            {k.subtitle && <div className="text-[11px] text-[#C0C0CC] font-medium mt-1">{k.subtitle}</div>}
          </div>
        ))}
      </div>
      <div className="px-2 pb-1" dir="ltr">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.28} /><stop offset="40%" stopColor="#3B82F6" stopOpacity={0.12} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} /></linearGradient>
              <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.10} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} /></linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#F1F0FB" strokeOpacity={0.5} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#B0B8C4" }} tickLine={false} axisLine={false} interval={2} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#E5E5ED" }} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, (max: number) => Math.ceil(max * 1.15)]} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#86EFAC" }} tickLine={false} axisLine={false} allowDecimals={false} width={30} domain={[0, (max: number) => Math.max(Math.ceil(max * 1.3), 1)]} />
            <Tooltip content={<IntelTooltip isAr={isAr} />} cursor={{ stroke: "#6366F1", strokeWidth: 1, strokeDasharray: "4 4", strokeOpacity: 0.3 }} />
            {understaffedWindows.map((w, i) => <ReferenceArea key={i} yAxisId="left" x1={w.start} x2={w.end} fill="#EF4444" fillOpacity={0.04} />)}
            <Area yAxisId="left" type="natural" dataKey="yesterday" stroke="#C0C0CC" strokeWidth={1.5} strokeDasharray="6 3" fill="none" dot={false} activeDot={false} animationDuration={1200} />
            <Area yAxisId="left" type="natural" dataKey="projected" stroke="#7ECBF5" strokeWidth={1.5} strokeDasharray="3 2" fill="url(#projGrad)" dot={false} activeDot={false} connectNulls={false} animationDuration={1200} />
            <Area yAxisId="left" type="natural" dataKey="orders" stroke="#6366F1" strokeWidth={2} fill="url(#pulseGrad)" dot={false} activeDot={{ r: 4.5, fill: "#fff", stroke: "#6366F1", strokeWidth: 2 }} connectNulls={false} animationDuration={1200} animationEasing="ease-out" />
            <Line yAxisId="right" type="stepAfter" dataKey="scheduledDrivers" stroke="#22C55E" strokeWidth={1.5} dot={false} activeDot={false} animationDuration={1200} />
            <ReferenceLine x={`${currentHour}:00`} yAxisId="left" stroke="#6366F1" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.35} label={<NowLabel />} />
            {peakHour.count > 0 && <ReferenceDot x={`${peakHour.hour}:00`} y={peakHour.count} yAxisId="left" shape={<PeakDot />} ifOverflow="extendDomain" />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-2 px-5 pb-4 pt-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#6366F1]/[0.08]">
          <div className="w-3.5 h-[2px] rounded-full bg-[#6366F1]" />
          <span className="text-[10px] font-semibold text-[#6366F1]">{isAr ? "اليوم" : "Today"}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C0C0CC]/[0.08]">
          <svg width="14" height="2" className="shrink-0"><line x1="0" y1="1" x2="14" y2="1" stroke="#C0C0CC" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
          <span className="text-[10px] font-semibold text-[#8E8EA0]">{isAr ? "الأسبوع الماضي" : "Last Week"}</span>
        </div>
        {currentHour >= 8 && <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7ECBF5]/[0.08]">
          <svg width="14" height="2" className="shrink-0"><line x1="0" y1="1" x2="14" y2="1" stroke="#7ECBF5" strokeWidth="1.5" strokeDasharray="2 2" /></svg>
          <span className="text-[10px] font-semibold text-[#60A5FA]">{isAr ? "المتوقع" : "Projected"}</span>
        </div>}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22C55E]/[0.08]">
          <CalendarClock className="w-3 h-3 text-[#22C55E] shrink-0" strokeWidth={2} />
          <span className="text-[10px] font-semibold text-[#16A34A]">{isAr ? "سائقين مجدولين" : "Scheduled"}</span>
        </div>
      </div>
    </div>
  );
}

function AttendanceDonut({ summary, rate, loading, isAr }: { summary: Record<string, number>; rate: number; loading: boolean; isAr: boolean }) {
  const [hov, setHov] = useState<number | null>(null);
  const cfg: Record<string, { en: string; ar: string; color: string }> = { present: { en: "Present", ar: "حاضر", color: "#22C55E" }, late: { en: "Late", ar: "متأخر", color: "#D9730D" }, absent: { en: "Absent", ar: "غائب", color: "#EF4444" }, excused: { en: "Excused", ar: "معذور", color: "#3B82F6" }, day_off: { en: "Day Off", ar: "يوم إجازة", color: "#C0C0CC" } };
  const pieData = ["present","late","absent","excused","day_off"].filter(k => (summary[k] ?? 0) > 0).map(k => ({ key: k, name: isAr ? cfg[k].ar : cfg[k].en, value: summary[k], color: cfg[k]?.color ?? "#C0C0CC" }));
  const total = pieData.reduce((s, d) => s + d.value, 0);
  const rc = rate >= 80 ? "#22C55E" : rate >= 60 ? "#D9730D" : "#EF4444";
  if (loading) return <div className={`${CARD_BASE} animate-in-view`} style={{ animationDelay: "250ms" }}><div className="p-6"><Skeleton className="h-4 w-20 mb-8" /><div className="flex justify-center"><Skeleton className="w-[180px] h-[180px] rounded-full" /></div></div></div>;
  return (
    <div className={`${CARD_BASE} animate-in-view h-full flex flex-col`} style={{ animationDelay: "250ms" }}>
      <div className="flex items-center justify-between px-6 pt-6"><div><h3 className="text-[15px] font-semibold text-[#1E1E2D]">{isAr ? "الحضور" : "Attendance"}</h3><p className="text-[11px] text-[#C0C0CC] mt-0.5">{isAr ? "اليوم" : "Today"}</p></div><Link href="/attendance" className="text-[12px] font-medium text-[#C0C0CC] hover:text-[#8E8EA0] transition-colors">{isAr ? "التفاصيل" : "Details"}</Link></div>
      <div className="flex-1 px-6 pb-6">
        {pieData.length === 0 ? <div className="h-[280px] flex flex-col items-center justify-center"><div className="w-16 h-16 rounded-full bg-[#F8FAFC] flex items-center justify-center mb-4"><Clock className="w-6 h-6 text-[#E5E5ED]" strokeWidth={1.5} /></div><p className="text-[13px] text-[#C0C0CC]">{isAr ? "لا توجد بيانات حضور" : "No attendance data yet"}</p></div> : (<>
          <div className="relative flex justify-center mt-4" dir="ltr">
            <ResponsiveContainer width="100%" height={190}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={62} outerRadius={85} paddingAngle={3} dataKey="value" animationDuration={900} stroke="none" cornerRadius={4} onMouseEnter={(_, i) => setHov(i)} onMouseLeave={() => setHov(null)}>{pieData.map((e, i) => <Cell key={i} fill={e.color} opacity={hov === null ? 0.35 : hov === i ? 1 : 0.2} style={{ transition: "opacity 0.2s" }} />)}</Pie></PieChart></ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute text-center transition-all duration-300" style={{ opacity: hov === null ? 1 : 0, transform: hov === null ? "scale(1)" : "scale(0.85)" }}><div className="text-[28px] font-bold tracking-[-0.03em] leading-none text-black"><AnimatedNumber value={Math.round(rate)} /><span className="text-[18px] text-[#E5E5ED]">%</span></div><div className="text-[11px] font-medium mt-1 text-[#C0C0CC] uppercase tracking-wider">{isAr ? "حاضر" : "Present"}</div></div>
              {pieData.map((e, i) => <div key={e.key} className="absolute text-center transition-all duration-300" style={{ opacity: hov === i ? 1 : 0, transform: hov === i ? "scale(1)" : "scale(0.85)" }}><div className="text-[28px] font-bold tracking-[-0.03em] leading-none" style={{ color: e.color }}>{e.value}</div><div className="text-[11px] font-medium mt-1 uppercase tracking-wider" style={{ color: e.color }}>{e.name}</div></div>)}
            </div>
          </div>
          <div className="mt-6 space-y-3">{pieData.map(e => { const p = total > 0 ? Math.round((e.value/total)*100) : 0; return (<div key={e.key} className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg hover:bg-[#F8FAFC] transition-all duration-200 cursor-default group"><div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform" style={{ backgroundColor: e.color }} /><span className="text-[13px] text-[#475569] group-hover:text-[#1E1E2D] transition-colors">{e.name}</span></div><div className="flex items-baseline gap-2 group-hover:translate-x-[-2px] transition-transform"><span className="text-[13px] font-semibold text-[#1E1E2D] tabular-nums">{e.value}</span><span className="text-[11px] text-[#E5E5ED] tabular-nums group-hover:text-[#C0C0CC] transition-colors">{p}%</span></div></div>); })}</div>
        </>)}
      </div>
    </div>
  );
}

function PlatformTargetsCard({ platformData, targetByPlatform, loading, isAr }: { platformData: Record<string, number>; targetByPlatform: Record<string, number>; loading: boolean; isAr: boolean }) {
  const platforms = useMemo(() => {
    return Object.entries(PLATFORM_ORDER_TARGETS).map(([key, cfg]) => {
      const actual = platformData[key] ?? 0;
      const target = targetByPlatform[key] ?? 0;
      const pct = target > 0 ? Math.min(Math.round((actual / target) * 100), 999) : 0;
      const color = PLATFORM_COLOR_MAP[key] || "#8E8EA0";
      const status: "exceeding" | "on_track" | "behind" | "critical" =
        pct >= 100 ? "exceeding" : pct >= 70 ? "on_track" : pct >= 40 ? "behind" : "critical";
      return { key, label: isAr ? cfg.labelAr : cfg.labelEn, actual, target, pct, color, status };
    });
  }, [platformData, isAr]);

  const totalActual = platforms.reduce((s, p) => s + p.actual, 0);
  const totalTarget = platforms.reduce((s, p) => s + p.target, 0);
  const overallPct = totalTarget > 0 ? Math.min(Math.round((totalActual / totalTarget) * 100), 999) : 0;
  const overallColor = overallPct >= 100 ? "#0F7B6C" : overallPct >= 70 ? "#6366F1" : overallPct >= 40 ? "#D9730D" : "#EF4444";

  if (loading) return (
    <div className={`${CARD_BASE} animate-in-view h-full`} style={{ animationDelay: "350ms" }}>
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex justify-center"><Skeleton className="w-20 h-20 rounded-full" /></div>
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i}><Skeleton className="h-3 w-20 mb-1.5" /><Skeleton className="h-2.5 w-full rounded-full" /></div>)}</div>
      </div>
    </div>
  );

  return (
    <div className={`${CARD_BASE} animate-in-view h-full flex flex-col`} style={{ animationDelay: "350ms" }}>
      <div className="flex items-center justify-between px-6 pt-6 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#6366F1]/[0.08] flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-[#6366F1]" strokeWidth={2.5} />
          </div>
          <h3 className="text-[15px] font-semibold text-[#1E1E2D]">{isAr ? "أهداف المنصات" : "Platform Targets"}</h3>
        </div>
        <Link href="/orders" className="text-[12px] font-medium text-[#C0C0CC] hover:text-[#8E8EA0] transition-colors">{isAr ? "عرض الكل" : "View all"}</Link>
      </div>

      {/* Overall ring */}
      <div className="flex items-center justify-center py-4">
        <div className="relative">
          <MiniRing percent={Math.min(overallPct, 100)} size={72} stroke={5} color={overallColor} />
        </div>
        <div className="ms-4">
          <div className="text-[22px] font-bold text-[#1E1E2D] tabular-nums tracking-tight leading-none">{totalActual}<span className="text-[14px] font-medium text-[#E5E5ED]"> / {totalTarget}</span></div>
          <div className="text-[11px] text-[#8E8EA0] mt-1">{isAr ? "إجمالي الطلبات اليوم" : "Total orders today"}</div>
        </div>
      </div>

      <div className="mx-5 border-t border-[#F1F0FB]" />

      {/* Per-platform progress */}
      <div className="px-5 pt-4 pb-5 flex-1 space-y-4">
        {platforms.map(p => {
          const statusIcon = p.status === "exceeding" ? <CheckCircle2 className="w-3 h-3 text-[#0F7B6C]" strokeWidth={2.5} /> :
            p.status === "on_track" ? <TrendingUp className="w-3 h-3 text-[#6366F1]" strokeWidth={2.5} /> :
            p.status === "behind" ? <Clock className="w-3 h-3 text-[#D9730D]" strokeWidth={2.5} /> :
            <AlertTriangle className="w-3 h-3 text-[#EF4444]" strokeWidth={2.5} />;
          const barColor = p.status === "exceeding" ? "#0F7B6C" : p.color;
          return (
            <div key={p.key} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform" style={{ backgroundColor: p.color }} />
                  <span className="text-[12px] font-semibold text-[#1E1E2D] capitalize group-hover:text-[#1E1E2D] transition-colors">{p.label}</span>
                  {statusIcon}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[13px] font-bold text-[#1E1E2D] tabular-nums">{p.actual}</span>
                  <span className="text-[11px] text-[#E5E5ED] tabular-nums">/ {p.target}</span>
                  <span className={`text-[10px] font-bold tabular-nums ms-1 ${p.pct >= 100 ? "text-[#0F7B6C]" : p.pct >= 70 ? "text-[#6366F1]" : p.pct >= 40 ? "text-[#D9730D]" : "text-[#EF4444]"}`}>{p.pct}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-[#F1F0FB]">
                <div className="h-full rounded-full transition-all duration-700 group-hover:opacity-80" style={{ width: `${Math.min(p.pct, 100)}%`, backgroundColor: barColor }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Leaderboard({ loading, isAr, entries, utrEntries }: { loading: boolean; isAr: boolean; entries: { driver_id: string; driver_name: string; platform: string | null; order_count: number }[]; utrEntries: { driver_id: string; driver_name: string; platform: string | null; order_count: number; total_hours: number; utr: number }[] }) {
  const [tab, setTab] = useState<"orders"|"utr">("orders");
  const [sortAsc, setSortAsc] = useState(false);
  const rc = ["#D9730D","#C0C0CC","#CD7F32"];
  const sortedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => sortAsc ? a.order_count - b.order_count : b.order_count - a.order_count);
    return sorted.slice(0, 10);
  }, [entries, sortAsc]);
  const sortedUtr = useMemo(() => {
    const sorted = [...utrEntries].filter(e => e.utr > 0).sort((a, b) => sortAsc ? a.utr - b.utr : b.utr - a.utr);
    return sorted.slice(0, 10);
  }, [utrEntries, sortAsc]);
  const top = sortedEntries, maxO = top.length > 0 ? Math.max(...top.map(e => e.order_count)) : 1;
  const utrTop = sortedUtr, maxU = utrTop.length > 0 ? Math.max(...utrTop.map(e => e.utr)) : 1;
  if (loading) return <div className={`${CARD_BASE} animate-in-view h-full flex flex-col`} style={{ animationDelay: "300ms" }}><SectionHeader icon={Trophy} title={isAr ? "أفضل السائقين" : "Top Drivers"} actionLabel={isAr ? "عرض الكل" : "View all"} actionHref="/drivers" /><div className="px-4 pb-4 space-y-3">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="flex items-center gap-3"><Skeleton className="w-6 h-6 rounded-full" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-10" /></div>)}</div></div>;
  return (
    <div className={`${CARD_BASE} animate-in-view h-full flex flex-col`} style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2"><div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-[#8E8EA0]" strokeWidth={2} /><h3 className="text-[13px] font-semibold text-[#1E1E2D]">{isAr ? "أفضل السائقين" : "Top Drivers"}</h3><span className="text-[9px] font-medium text-[#C0C0CC] bg-[#F8F8FC] px-1.5 py-0.5 rounded">{isAr ? "الكل" : "All Time"}</span><button onClick={() => setSortAsc(!sortAsc)} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#F8F8FC] hover:bg-[#E5E5ED] transition-colors text-[#8E8EA0] hover:text-[#1E1E2D]" title={sortAsc ? (isAr ? "ترتيب تنازلي" : "Sort descending") : (isAr ? "ترتيب تصاعدي" : "Sort ascending")}>{sortAsc ? <ChevronUp className="w-3 h-3" strokeWidth={2.5} /> : <ChevronDown className="w-3 h-3" strokeWidth={2.5} />}<span className="text-[9px] font-medium">{sortAsc ? (isAr ? "الأقل" : "Low") : (isAr ? "الأعلى" : "Top")}</span></button></div><Link href="/drivers" className="text-[12px] font-medium text-[#C0C0CC] hover:text-[#8E8EA0] transition-colors">{isAr ? "عرض الكل" : "View all"}</Link></div>
      <div className="px-4 pb-3"><div className="relative flex bg-[#F8F8FC] rounded-lg p-0.5"><div className="absolute top-0.5 bottom-0.5 rounded-md bg-white shadow-sm transition-all duration-300 ease-out" style={{ width: "calc(50% - 2px)", insetInlineStart: tab === "orders" ? "2px" : "calc(50% + 2px)" }} /><button onClick={() => setTab("orders")} className={`relative z-[1] flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-colors duration-200 ${tab === "orders" ? "text-[#1E1E2D]" : "text-[#8E8EA0] hover:text-[#1E1E2D]"}`}>{isAr ? "الطلبات" : "Orders"}</button><button onClick={() => setTab("utr")} className={`relative z-[1] flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-colors duration-200 ${tab === "utr" ? "text-[#1E1E2D]" : "text-[#8E8EA0] hover:text-[#1E1E2D]"}`}>{isAr ? "معدل الاستغلال" : "UTR"}</button></div></div>
      <div className="px-4 pb-4 flex-1 overflow-y-auto min-h-0">
        <div key={tab} className="animate-tab-content">
        {tab === "orders" && (top.length === 0 ? <div className="py-4 text-center text-[12px] text-[#8E8EA0]">{isAr ? "لا توجد بيانات" : "No data available"}</div> : <div className="space-y-0.5">{top.map((e, i) => { const bw = Math.round((e.order_count/maxO)*100), f = i === 0; return (<div key={e.driver_id} className="relative flex items-center gap-3 py-2 rounded-md px-1.5 -mx-1.5 hover:bg-[#F8F8FC]/60 transition-colors"><div className="absolute inset-y-0 start-0 rounded-md transition-all duration-700" style={{ width: `${bw}%`, backgroundColor: f ? "#6366F108" : "#F8F8FC" }} /><div className="relative flex items-center gap-3 w-full"><div className="flex items-center justify-center w-6 h-6 shrink-0">{i < 3 ? <Star className={f ? "w-5 h-5 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]" : "w-4 h-4"} style={{ color: rc[i] }} fill={rc[i]} strokeWidth={0} /> : <span className="text-[11px] font-bold text-[#C0C0CC]">{i+1}</span>}</div><div className={`${f ? "w-8 h-8 text-[10px]" : "w-6 h-6 text-[9px]"} rounded-full flex items-center justify-center font-bold text-white shrink-0`} style={{ background: PLATFORM_COLOR_MAP[e.platform ?? ""] || "#8E8EA0" }}>{e.driver_name.split(" ").map(w => w[0]).join("").slice(0,2)}</div><div className="flex-1 min-w-0"><div className={`${f ? "text-[13px]" : "text-[12px]"} font-medium text-[#1E1E2D] truncate`}>{e.driver_name}</div><div className="text-[10px] text-[#8E8EA0] capitalize">{e.platform ?? "—"}</div></div>{f ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#6366F1]/10 text-[12px] font-bold text-[#6366F1] tabular-nums">{e.order_count} <span className="font-medium text-[10px]">{isAr ? "طلب" : "orders"}</span></span> : <span className="text-[12px] font-bold text-[#6366F1] tabular-nums">{e.order_count} <span className="font-normal text-[10px] text-[#8E8EA0]">{isAr ? "طلب" : "orders"}</span></span>}</div></div>); })}</div>)}
        {tab === "utr" && (utrTop.length === 0 ? <div className="py-4 text-center text-[12px] text-[#8E8EA0]">{isAr ? "لا توجد بيانات" : "No UTR data"}</div> : <div className="space-y-0.5">{utrTop.map((e, i) => { const barW = Math.round((e.utr / maxU) * 100), f = i === 0; return (<div key={e.driver_id} className="relative flex items-center gap-3 py-2 rounded-md px-1.5 -mx-1.5 hover:bg-[#F8F8FC]/60 transition-colors"><div className="absolute inset-y-0 start-0 rounded-md transition-all duration-700" style={{ width: `${barW}%`, backgroundColor: f ? "#0D948808" : "#F8F8FC" }} /><div className="relative flex items-center gap-3 w-full"><div className="flex items-center justify-center w-6 h-6 shrink-0">{i < 3 ? <Star className={f ? "w-5 h-5 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]" : "w-4 h-4"} style={{ color: rc[i] }} fill={rc[i]} strokeWidth={0} /> : <span className="text-[11px] font-bold text-[#C0C0CC]">{i+1}</span>}</div><div className={`${f ? "w-8 h-8 text-[10px]" : "w-6 h-6 text-[9px]"} rounded-full flex items-center justify-center font-bold text-white shrink-0`} style={{ background: PLATFORM_COLOR_MAP[e.platform ?? ""] || "#8E8EA0" }}>{e.driver_name.split(" ").map(w => w[0]).join("").slice(0,2)}</div><div className="flex-1 min-w-0"><div className={`${f ? "text-[13px]" : "text-[12px]"} font-medium text-[#1E1E2D] truncate`}>{e.driver_name}</div><div className="text-[10px] text-[#8E8EA0] capitalize">{e.platform ?? "—"} &middot; {e.total_hours}h</div></div>{f ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0D9488]/10 text-[12px] font-bold text-[#0D9488] tabular-nums">{e.utr.toFixed(1)} <span className="font-medium text-[10px]">{isAr ? "طلب/س" : "ord/hr"}</span></span> : <span className="text-[12px] font-bold text-[#0D9488] tabular-nums">{e.utr.toFixed(1)} <span className="font-normal text-[10px] text-[#8E8EA0]">{isAr ? "طلب/س" : "ord/hr"}</span></span>}</div></div>); })}</div>)}
        </div>
      </div>
    </div>
  );
}

function CashOutstandingCard({ collected, deposited, verified, loading, isAr, outstandingDrivers, outstandingDriversLoading }: { collected: number; deposited: number; verified: number; loading: boolean; isAr: boolean; outstandingDrivers: { driver_id: string; driver_name: string; amount: number; oldest_date: string }[]; outstandingDriversLoading: boolean }) {
  const tot = collected || 1;
  const withDrivers = Math.max(0, collected - deposited);
  const depositPct = Math.min(100, Math.round((deposited / tot) * 100));
  const withDriversPct = 100 - depositPct;
  const isUrgent = withDrivers > 0 && withDriversPct > 30;
  const maxDriverAmount = outstandingDrivers[0]?.amount || 1;
  const daysOutstanding = useMemo(() => {
    if (outstandingDrivers.length === 0) return 0;
    const now = Date.now();
    const totalDays = outstandingDrivers.slice(0, 5).reduce((sum, d) => sum + Math.max(1, Math.ceil((now - new Date(d.oldest_date).getTime()) / 86400000)), 0);
    return Math.round(totalDays / Math.min(outstandingDrivers.length, 5));
  }, [outstandingDrivers]);

  if (loading) return (
    <div className={`${CARD_BASE} animate-in-view`} style={{ animationDelay: "320ms" }}>
      <SectionHeader icon={Banknote} title={isAr ? "ملخص النقدية" : "Cash Summary"} />
      <div className="px-4 pb-4 space-y-3">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="grid grid-cols-3 gap-2"><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-16 rounded-lg" /></div>
        <div className="space-y-2"><Skeleton className="h-8 rounded" /><Skeleton className="h-8 rounded" /><Skeleton className="h-8 rounded" /></div>
      </div>
    </div>
  );

  return (
    <div className={`${CARD_BASE} animate-in-view relative overflow-hidden h-full flex flex-col`} style={{ animationDelay: "320ms" }}>
      {isUrgent && <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#EF4444]/60 via-[#D9730D]/40 to-transparent" />}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-[#8E8EA0]" strokeWidth={2} />
          <h3 className="text-[13px] font-semibold text-[#1E1E2D]">{isAr ? "ملخص النقدية" : "Cash Summary"}</h3>
          {isUrgent && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EF4444]/10 text-[#EF4444]"><AlertTriangle className="w-2.5 h-2.5" strokeWidth={2.5} />{isAr ? "مرتفع" : "High"}</span>}
        </div>
        <Link href="/cash" className="text-[12px] font-medium text-[#C0C0CC] hover:text-[#8E8EA0] transition-colors">{isAr ? "التفاصيل" : "Details"}</Link>
      </div>

      <div className="px-4 pb-4 flex-1 flex flex-col">
        {/* Total Collected */}
        <div className="mb-3">
          <div className="text-[10px] font-medium text-[#8E8EA0] uppercase tracking-wider mb-0.5">{isAr ? "إجمالي التحصيل" : "Total Collected"}</div>
          <div className="text-[24px] font-bold text-[#1E1E2D] tabular-nums tracking-tight leading-tight">{formatKWD(collected)}</div>
        </div>

        {/* Deposit progress bar */}
        <div className="mb-1.5">
          <div className="relative flex h-3 rounded-full overflow-hidden bg-[#E5E5ED]">
            {depositPct > 0 && <div className="transition-all duration-700 rounded-s-full" style={{ width: `${depositPct}%`, backgroundColor: "#0F7B6C" }} />}
            {withDriversPct > 0 && <div className="transition-all duration-700 rounded-e-full" style={{ width: `${withDriversPct}%`, backgroundColor: isUrgent ? "#EF4444" : "#D9730D" }} />}
          </div>
        </div>
        <div className="flex justify-between mb-3">
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-[#0F7B6C]"><span className="w-1.5 h-1.5 rounded-full bg-[#0F7B6C]" />{isAr ? "مودع" : "Deposited"} {depositPct}%</span>
          <span className={`inline-flex items-center gap-1 text-[9px] font-medium ${isUrgent ? "text-[#EF4444]" : "text-[#D9730D]"}`}><span className={`w-1.5 h-1.5 rounded-full ${isUrgent ? "bg-[#EF4444]" : "bg-[#D9730D]"}`} />{isAr ? "لدى السائقين" : "With Drivers"} {withDriversPct}%</span>
        </div>

        {/* 3-stat row */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="p-2 rounded-lg bg-[#0F7B6C]/[0.06] text-center">
            <div className="text-[12px] font-bold text-[#0F7B6C] tabular-nums">{formatKWD(deposited)}</div>
            <div className="text-[9px] text-[#8E8EA0] mt-0.5">{isAr ? "مودع" : "Deposited"}</div>
          </div>
          <div className={`p-2 rounded-lg text-center ${isUrgent ? "bg-[#EF4444]/[0.06]" : "bg-[#D9730D]/[0.06]"}`}>
            <div className={`text-[12px] font-bold tabular-nums ${isUrgent ? "text-[#EF4444]" : "text-[#D9730D]"}`}>{formatKWD(withDrivers)}</div>
            <div className="text-[9px] text-[#8E8EA0] mt-0.5">{isAr ? "لدى السائقين" : "With Drivers"}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#6366F1]/[0.06] text-center">
            <div className="text-[12px] font-bold text-[#6366F1] tabular-nums">{formatKWD(verified)}</div>
            <div className="text-[9px] text-[#8E8EA0] mt-0.5">{isAr ? "تم التحقق" : "Verified"}</div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#F1F0FB] mb-3" />

        {/* Top Outstanding Drivers */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-[#8E8EA0] uppercase tracking-wider">{isAr ? "أعلى المبالغ المعلقة" : "Top Outstanding"}</span>
            {daysOutstanding > 0 && <span className="text-[9px] font-medium text-[#C0C0CC]">{isAr ? "متوسط" : "avg"} {daysOutstanding} {isAr ? "يوم" : daysOutstanding === 1 ? "day" : "days"}</span>}
          </div>
          {outstandingDriversLoading ? (
            <div className="space-y-2"><Skeleton className="h-9 rounded" /><Skeleton className="h-9 rounded" /><Skeleton className="h-9 rounded" /></div>
          ) : outstandingDrivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4">
              <CheckCircle2 className="w-5 h-5 text-[#0F7B6C] mb-1" />
              <p className="text-[11px] text-[#8E8EA0]">{isAr ? "لا توجد مبالغ معلقة" : "All cash deposited"}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {outstandingDrivers.slice(0, 5).map((d, i) => {
                const barW = Math.max(8, (d.amount / maxDriverAmount) * 100);
                const daysSince = Math.max(1, Math.ceil((Date.now() - new Date(d.oldest_date).getTime()) / 86400000));
                return (
                  <div key={d.driver_id} className="group flex items-center gap-2 py-1.5 px-1.5 -mx-1.5 rounded-md hover:bg-[#F8F8FC] transition-colors">
                    <div className="w-[18px] text-center">
                      <span className="text-[9px] font-bold text-[#C0C0CC]">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-medium text-[#1E1E2D] truncate">{d.driver_name}</span>
                        <span className="text-[11px] font-bold text-[#EF4444] tabular-nums ms-2">{formatKWD(d.amount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-[4px] bg-[#EF4444]/[0.08] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barW}%`, backgroundColor: daysSince > 5 ? "#EF4444" : daysSince > 2 ? "#D9730D" : "#C0C0CC" }} />
                        </div>
                        <span className="text-[8px] text-[#C0C0CC] font-medium shrink-0 tabular-nums">{daysSince}d</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AIDigestCard({ digest, loading, isAr }: { digest: DigestItem | null; loading: boolean; isAr: boolean }) {
  const [expanded, setExpanded] = useState(true);
  if (loading) return <div className={`${CARD_BASE} animate-in-view relative overflow-hidden border border-[#8B5CF6]/10`} style={{ animationDelay: "80ms" }}><div className="px-5 py-5 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div></div>;
  if (!digest) return null;
  const content = isAr && digest.content_ar ? digest.content_ar : digest.content;
  return (
    <div className={`${CARD_BASE} animate-in-view relative overflow-hidden border border-[#8B5CF6]/10`} style={{ animationDelay: "80ms" }}>
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#8B5CF6]/40 via-[#6366F1]/30 to-[#8B5CF6]/10" />
      <div className="px-5 py-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" strokeWidth={2} /></div><h3 className="text-[14px] font-semibold text-[#1E1E2D]">{isAr ? "ملخص اليوم الذكي" : "AI Daily Digest"}</h3><span className="text-[11px] text-[#C0C0CC] font-medium">{digest.date}</span></div>
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11px] font-medium text-[#8B5CF6] hover:text-[#7C3AED] transition-colors">{expanded ? (isAr ? "إخفاء" : "Collapse") : (isAr ? "المزيد" : "Expand")}{expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</button>
        </div>
        <p className="text-[13px] text-[#1E1E2D] leading-relaxed">{content.summary}</p>
        {expanded && <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          {content.highlights.length > 0 && <div><div className="flex items-center gap-1.5 mb-2.5"><Zap className="w-3.5 h-3.5 text-[#0F7B6C]" strokeWidth={2} /><span className="text-[12px] font-semibold text-[#1E1E2D]">{isAr ? "أبرز النقاط" : "Highlights"}</span></div><ul className="space-y-2">{content.highlights.map((h, i) => <li key={i} className="text-[12px] text-[#1E1E2D] leading-relaxed flex gap-2"><span className="text-[#0F7B6C] mt-0.5 shrink-0">&bull;</span>{h}</li>)}</ul></div>}
          {content.concerns.length > 0 && <div><div className="flex items-center gap-1.5 mb-2.5"><AlertTriangle className="w-3.5 h-3.5 text-[#D9730D]" strokeWidth={2} /><span className="text-[12px] font-semibold text-[#1E1E2D]">{isAr ? "مخاوف" : "Concerns"}</span></div><ul className="space-y-2">{content.concerns.map((c, i) => <li key={i} className="text-[12px] text-[#1E1E2D] leading-relaxed flex gap-2"><span className="text-[#D9730D] mt-0.5 shrink-0">&bull;</span>{c}</li>)}</ul></div>}
          {content.recommendations.length > 0 && <div><div className="flex items-center gap-1.5 mb-2.5"><Brain className="w-3.5 h-3.5 text-[#6366F1]" strokeWidth={2} /><span className="text-[12px] font-semibold text-[#1E1E2D]">{isAr ? "التوصيات" : "Recommendations"}</span></div><ul className="space-y-2">{content.recommendations.map((r, i) => <li key={i} className="text-[12px] text-[#1E1E2D] leading-relaxed flex gap-2"><span className="text-[#6366F1] mt-0.5 shrink-0">&bull;</span>{r}</li>)}</ul></div>}
        </div>}
      </div>
    </div>
  );
}

function DriverStatusCard({ statusCounts, platformCounts, total, loading, isAr }: { statusCounts: Record<string, number>; platformCounts: Record<string, number>; total: number; loading: boolean; isAr: boolean }) {
  const [hovStatus, setHovStatus] = useState<string | null>(null);
  const statuses = [
    { key: "active", label: isAr ? "نشط" : "Active", color: "#0F7B6C", icon: CheckCircle2 },
    { key: "inactive", label: isAr ? "غير نشط" : "Inactive", color: "#C0C0CC", icon: Clock },
    { key: "on_leave", label: isAr ? "إجازة" : "On Leave", color: "#D9730D", icon: CalendarDays },
    { key: "suspended", label: isAr ? "موقوف" : "Suspended", color: "#EF4444", icon: AlertTriangle },
  ];
  const platforms = useMemo(() => Object.entries(platformCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count), [platformCounts]);
  const activeCount = statusCounts["active"] || 0;
  const utilization = total > 0 ? Math.round((activeCount / total) * 100) : 0;
  const topPlatform = platforms[0];
  const pieData = statuses.filter(s => (statusCounts[s.key] || 0) > 0).map(s => ({ key: s.key, count: statusCounts[s.key] || 0, color: s.color, label: s.label }));

  if (loading) return <div className={`${CARD_BASE} animate-in-view h-full`} style={{ animationDelay: "250ms" }}><div className="p-6 space-y-4"><Skeleton className="h-4 w-32" /><div className="flex justify-center"><Skeleton className="w-[140px] h-[140px] rounded-full" /></div><div className="grid grid-cols-2 gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div></div></div>;
  return (
    <div className={`${CARD_BASE} animate-in-view h-full flex flex-col`} style={{ animationDelay: "250ms" }}>
      <div className="flex items-center justify-between px-6 pt-6 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#6366F1]/[0.08] flex items-center justify-center"><Users className="w-3.5 h-3.5 text-[#6366F1]" strokeWidth={2.5} /></div>
          <h3 className="text-[15px] font-semibold text-[#1E1E2D]">{isAr ? "حالة السائقين" : "Driver Status"}</h3>
        </div>
        <Link href="/drivers" className="text-[12px] font-medium text-[#C0C0CC] hover:text-[#8E8EA0] transition-colors">{isAr ? "التفاصيل" : "Details"}</Link>
      </div>

      <div className="relative flex justify-center mt-4 pb-2" dir="ltr">
        <ResponsiveContainer width="100%" height={190}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={62} outerRadius={85} paddingAngle={3} dataKey="count" animationDuration={900} stroke="none" cornerRadius={4} onMouseEnter={(_, i) => setHovStatus(pieData[i]?.key ?? null)} onMouseLeave={() => setHovStatus(null)}>{pieData.map((e, i) => <Cell key={i} fill={e.color} opacity={hovStatus === null ? 0.35 : hovStatus === e.key ? 1 : 0.2} style={{ transition: "opacity 0.2s" }} />)}</Pie></PieChart></ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute text-center transition-all duration-300" style={{ opacity: hovStatus === null ? 1 : 0, transform: hovStatus === null ? "scale(1)" : "scale(0.85)" }}><div className="text-[28px] font-bold tracking-[-0.03em] leading-none text-[#1E1E2D]"><AnimatedNumber value={utilization} /><span className="text-[18px] text-[#E5E5ED]">%</span></div><div className="text-[11px] font-medium mt-1 text-[#C0C0CC] uppercase tracking-wider">{isAr ? "نشط" : "Active"}</div></div>
          {pieData.map((s) => <div key={s.key} className="absolute text-center transition-all duration-300" style={{ opacity: hovStatus === s.key ? 1 : 0, transform: hovStatus === s.key ? "scale(1)" : "scale(0.85)" }}><div className="text-[28px] font-bold tracking-[-0.03em] leading-none" style={{ color: s.color }}>{s.count}</div><div className="text-[11px] font-medium mt-1 uppercase tracking-wider" style={{ color: s.color }}>{s.label}</div></div>)}
        </div>
      </div>

      <div className="mx-5 border-t border-[#F1F0FB]" />

      <div className="px-5 pt-4 pb-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-[#8E8EA0] uppercase tracking-wider">{isAr ? "توزيع المنصات" : "Platform Split"}</p>
          <span className="text-[11px] font-medium text-[#E5E5ED] tabular-nums">{total} {isAr ? "إجمالي" : "total"}</span>
        </div>
        <div className="space-y-3 flex-1">
          {platforms.map(p => {
            const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
            const color = PLATFORM_COLOR_MAP[p.name.toLowerCase()] || "#8E8EA0";
            return (
              <div key={p.name} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition-transform" style={{ backgroundColor: color }} />
                    <span className="text-[12px] font-medium text-[#1E1E2D] capitalize group-hover:text-[#1E1E2D] transition-colors">{p.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[13px] font-bold text-[#1E1E2D] tabular-nums">{p.count}</span>
                    <span className="text-[10px] text-[#E5E5ED] tabular-nums group-hover:text-[#C0C0CC] transition-colors">{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-[#F1F0FB]">
                  <div className="h-full rounded-full transition-all duration-700 group-hover:opacity-80" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
        {topPlatform && (
          <div className="mt-4 pt-3 border-t border-[#F1F5F9]">
            <div className="flex items-center gap-2 text-[11px] text-[#C0C0CC]">
              <TrendingUp className="w-3 h-3 shrink-0" strokeWidth={2} />
              <span><span className="font-semibold capitalize" style={{ color: PLATFORM_COLOR_MAP[topPlatform.name.toLowerCase()] || "#8E8EA0" }}>{topPlatform.name}</span> {isAr ? "الأكثر سائقين" : "has the most drivers"} ({Math.round((topPlatform.count / total) * 100)}%)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ text, time, type }: { text: string; time: string; type: "success"|"warning"|"info" }) {
  const Icon = type === "success" ? CheckCircle2 : type === "warning" ? AlertTriangle : Clock;
  const color = type === "success" ? "#0F7B6C" : type === "warning" ? "#D9730D" : "#6366F1";
  return (<div className="flex gap-3 py-2.5 hover:bg-[#F8F8FC] rounded-md px-1.5 -mx-1.5 transition-colors"><div className="mt-0.5"><div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${color}0D` }}><Icon className="w-3 h-3" style={{ color }} strokeWidth={2} /></div></div><div className="flex-1 min-w-0"><p className="text-[12px] text-[#1E1E2D] leading-relaxed">{text}</p><p className="text-[10px] text-[#C0C0CC] mt-0.5">{time}</p></div></div>);
}

export default function HomePage() {
  const { language } = useUIStore();
  const isAr = language === "ar";
  const user = useAuthStore(s => s.user);
  const [period, setPeriod] = useState<Period>("day");
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const { data: companiesList } = useCompanies();
  const companyParam = companyFilter.length > 0 ? companyFilter.join(",") : undefined;
  const platformParam = platformFilter.length > 0 ? platformFilter.join(",") : undefined;
  const firstName = useMemo(() => { if (!user) return ""; const n = isAr && user.name_ar ? user.name_ar : user.name; return n.split(" ")[0]; }, [user, isAr]);
  const formattedDate = useMemo(() => new Date().toLocaleDateString(isAr ? "ar-KW" : "en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }), [isAr]);
  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const lastWeekDate = useMemo(() => { const d = new Date(); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); }, []);
  const { dateFrom, dateTo } = useDateRange(period, customDate);

  const { data: driversData, isLoading: driversLoading } = useDrivers({ per_page: 100, company: companyParam, platform: platformParam });
  const { data: activeDriverData, isLoading: activeDriversLoading } = useDrivers({ status: "active", per_page: 1, company: companyParam, platform: platformParam });
  const { data: orderSummary, isLoading: ordersLoading } = useOrderSummary(undefined, dateFrom, dateTo, companyParam, platformParam);
  const { data: hourlyData, isLoading: hourlyLoading } = useHourlyDistribution();
  const { data: yesterdayHourly } = useHourlyDistribution(lastWeekDate);
  const { data: todayShiftsData } = useShifts({ date_from: todayDate, date_to: todayDate, per_page: 500 });
  const { data: attendanceSummary, isLoading: attendanceLoading } = useAttendanceSummary(undefined, dateFrom, dateTo, companyParam, platformParam);
  const { data: cashSummaryToday, isLoading: cashTodayLoading } = useCashSummary(dateFrom, dateTo);
  const { data: cashSummaryAll, isLoading: cashAllLoading } = useCashSummary();
  const { data: alertsData } = useAlerts({ status: "active", per_page: 5 });
  const { data: leaderboardData, isLoading: leaderboardLoading } = useDriverLeaderboard({ limit: 10, date_from: dateFrom, date_to: dateTo, company: companyParam, platform: platformParam });
  const { data: utrLeaderboardData, isLoading: utrLoading } = useDriverLeaderboard({ limit: 10, sort_by: "utr", date_from: dateFrom, date_to: dateTo, company: companyParam, platform: platformParam });
  const { data: digestData, isLoading: digestLoading } = useDigest();
  const { data: outstandingDriversData, isLoading: outstandingDriversLoading } = useOutstandingDrivers();
  const { data: driverSummary, isLoading: driverSummaryLoading } = useDriverSummary(companyParam, platformParam);
  const { data: missingScreenshotsData } = useMissingScreenshots();
  const activeAlerts = alertsData?.items ?? [];
  const missingScreenshots = missingScreenshotsData?.items ?? [];
  const { data: yesterdayOrders } = useOrderSummary(lastWeekDate);
  const { data: yesterdayAttendance } = useAttendanceSummary(lastWeekDate);
  const { data: yesterdayCash } = useCashSummary(lastWeekDate, lastWeekDate);

  const drivers = useMemo(() => driversData?.items ?? [], [driversData]);
  const totalDriverCount = driversData?.total ?? 0;
  const activeDriverCount = activeDriverData?.total ?? 0;
  const ordersTotal = orderSummary?.total ?? 0;
  const attendanceRate = attendanceSummary?.attendance_rate ?? 0;
  const todaysRevenue = cashSummaryToday?.collected ?? 0;
  const ordersChange = useMemo(() => computeChange(ordersTotal, yesterdayOrders?.total), [ordersTotal, yesterdayOrders]);
  const attendanceChange = useMemo(() => computeChange(attendanceRate, yesterdayAttendance?.attendance_rate), [attendanceRate, yesterdayAttendance]);
  const revenueChange = useMemo(() => computeChange(todaysRevenue, yesterdayCash?.collected), [todaysRevenue, yesterdayCash]);
  const outstandingDrivers = useMemo(() => outstandingDriversData ?? [], [outstandingDriversData]);
  const getGreeting = useCallback(() => { const h = new Date().getHours(); return h < 12 ? (isAr ? "صباح الخير" : "Good morning") : h < 17 ? (isAr ? "مساء الخير" : "Good afternoon") : (isAr ? "مساء الخير" : "Good evening"); }, [isAr]);
  const t = { greeting: getGreeting(), activeDrivers: isAr ? "سائقين نشطين" : "Active Drivers", ordersToday: isAr ? "طلبات اليوم" : "Orders Today", attendance: isAr ? "نسبة الحضور" : "Attendance", cashCollected: isAr ? "التحصيل اليوم" : "Cash Collected" };

  return (
    <div className="w-full space-y-6">
      <div className="animate-in-view flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#1E1E2D] tracking-tight leading-tight">{isAr ? <>{t.greeting} <span className="text-[#6366F1]">{firstName}</span></> : <>{t.greeting}, <span className="text-[#6366F1]">{firstName}</span></>}</h1>
          <span className="flex items-center gap-1.5 text-[13px] text-[#8E8EA0] mt-1.5"><CalendarDays className="w-3.5 h-3.5 text-[#C0C0CC]" strokeWidth={2} />{formattedDate}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {companiesList && companiesList.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button className={`inline-flex items-center justify-between h-8 w-[160px] px-2.5 text-[12px] rounded-md transition-colors ${
                  companyFilter.length > 0
                    ? "bg-[#F1F0FB] text-[#6366F1] border border-[#6366F1]/20"
                    : "bg-white text-[#1E1E2D] border border-[#E5E5ED] hover:border-[#C0C0CC]"
                }`}>
                  <span className="truncate">
                    {companyFilter.length === 0
                      ? (isAr ? "كل الشركات" : "All Companies")
                      : companyFilter.length === 1
                        ? (isAr ? companiesList.find((c: CompanyConfig) => c.key === companyFilter[0])?.labelAr : companiesList.find((c: CompanyConfig) => c.key === companyFilter[0])?.labelEn) ?? companyFilter[0]
                        : `${companyFilter.length} ${isAr ? "شركات" : "companies"}`}
                  </span>
                  {companyFilter.length > 0 ? (
                    <X className="w-3 h-3 ml-1 shrink-0 hover:text-[#4F46E5]" onClick={(e) => { e.stopPropagation(); setCompanyFilter([]); }} />
                  ) : (
                    <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-50" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[180px] p-1.5" align="start">
                <div className="space-y-0.5">
                  {companiesList.filter((c: CompanyConfig) => c.is_active).map((c: CompanyConfig) => (
                    <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-[#F8F8FC] transition-colors">
                      <Checkbox
                        checked={companyFilter.includes(c.key)}
                        onCheckedChange={() => setCompanyFilter(prev => prev.includes(c.key) ? prev.filter(v => v !== c.key) : [...prev, c.key])}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-[13px] text-[#1E1E2D]">{isAr ? c.labelAr : c.labelEn}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <button className={`inline-flex items-center justify-between h-8 w-[160px] px-2.5 text-[12px] rounded-md transition-colors ${
                platformFilter.length > 0
                  ? "bg-[#F1F0FB] text-[#6366F1] border border-[#6366F1]/20"
                  : "bg-white text-[#1E1E2D] border border-[#E5E5ED] hover:border-[#C0C0CC]"
              }`}>
                <span className="truncate">
                  {platformFilter.length === 0
                    ? (isAr ? "كل المنصات" : "All Platforms")
                    : platformFilter.length === 1
                      ? (isAr ? PLATFORM_ORDER_TARGETS[platformFilter[0]]?.labelAr : PLATFORM_ORDER_TARGETS[platformFilter[0]]?.labelEn) ?? platformFilter[0]
                      : `${platformFilter.length} ${isAr ? "منصات" : "platforms"}`}
                </span>
                {platformFilter.length > 0 ? (
                  <X className="w-3 h-3 ml-1 shrink-0 hover:text-[#4F46E5]" onClick={(e) => { e.stopPropagation(); setPlatformFilter([]); }} />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-50" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-1.5" align="start">
              <div className="space-y-0.5">
                {Object.entries(PLATFORM_ORDER_TARGETS).map(([key, cfg]) => (
                  <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-[#F8F8FC] transition-colors">
                    <Checkbox
                      checked={platformFilter.includes(key)}
                      onCheckedChange={() => setPlatformFilter(prev => prev.includes(key) ? prev.filter(v => v !== key) : [...prev, key])}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-[13px] text-[#1E1E2D]">{isAr ? cfg.labelAr : cfg.labelEn}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <PeriodSelector period={period} setPeriod={setPeriod} isAr={isAr} customDate={customDate} setCustomDate={setCustomDate} />
        </div>
      </div>

      <AIDigestCard digest={digestData?.digest ?? null} loading={digestLoading} isAr={isAr} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={Banknote} iconColor="#1E1E2D" label={t.cashCollected} value={Math.round(todaysRevenue)} numericValue={Math.round(todaysRevenue)} suffix="KD" change={revenueChange} loading={cashTodayLoading} delay={50} href="/cash" />
        <MetricCard icon={Package} iconColor="#0F7B6C" label={t.ordersToday} value={ordersTotal} numericValue={ordersTotal} change={ordersChange} loading={ordersLoading} delay={100} href="/orders" />
        <MetricCard icon={Users} iconColor="#6366F1" label={t.activeDrivers} value={activeDriverCount} numericValue={activeDriverCount} suffix={`/ ${totalDriverCount}`} loading={driversLoading || activeDriversLoading} delay={150} href="/drivers" />
        <MetricCard icon={Clock} iconColor="#D9730D" label={t.attendance} value={`${Math.round(attendanceRate)}%`} numericValue={Math.round(attendanceRate)} suffix="%" change={attendanceChange} loading={attendanceLoading} delay={200} href="/attendance" />
      </div>

      <OperationalPulseCard hourlyData={hourlyData ?? []} yesterdayHourly={yesterdayHourly ?? []} orderSummary={orderSummary} yesterdayOrders={yesterdayOrders} driverSummary={driverSummary} attendanceSummary={attendanceSummary} todayShifts={todayShiftsData?.items ?? []} loading={hourlyLoading || ordersLoading} isAr={isAr} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <DriverStatusCard statusCounts={driverSummary?.by_status ?? {}} platformCounts={driverSummary?.by_platform ?? {}} total={driverSummary?.total ?? 0} loading={driverSummaryLoading} isAr={isAr} />
        <Leaderboard entries={leaderboardData ?? []} loading={leaderboardLoading || utrLoading} isAr={isAr} utrEntries={utrLeaderboardData ?? []} />
        <AttendanceDonut summary={attendanceSummary?.summary ?? {}} rate={attendanceRate} loading={attendanceLoading} isAr={isAr} />
        <CashOutstandingCard collected={cashSummaryAll?.collected ?? 0} deposited={cashSummaryAll?.deposited ?? 0} verified={cashSummaryAll?.verified ?? 0} loading={cashAllLoading} isAr={isAr} outstandingDrivers={outstandingDrivers} outstandingDriversLoading={outstandingDriversLoading} />
        <PlatformTargetsCard platformData={orderSummary?.by_platform ?? {}} targetByPlatform={orderSummary?.target_by_platform ?? {}} loading={ordersLoading} isAr={isAr} />
        <div className={`${CARD_BASE} animate-in-view h-full flex flex-col`} style={{ animationDelay: "380ms" }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#8E8EA0]" strokeWidth={2} />
              <h3 className="text-[13px] font-semibold text-[#1E1E2D]">{isAr ? "التنبيهات النشطة" : "Active Alerts"}</h3>
              {(activeAlerts.length + missingScreenshots.length) > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444]/10 text-[9px] font-bold text-[#EF4444]">
                  {activeAlerts.length + missingScreenshots.length}
                </span>
              )}
            </div>
            <Link href="/ai" className="text-[12px] font-medium text-[#C0C0CC] hover:text-[#8E8EA0] transition-colors">{isAr ? "عرض الكل" : "View all"}</Link>
          </div>
          <div className="px-4 pb-4 flex-1 overflow-y-auto min-h-0">
            {activeAlerts.length === 0 && missingScreenshots.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-4">
                <CheckCircle2 className="w-5 h-5 text-[#0F7B6C] mx-auto mb-1" />
                <p className="text-[11px] text-[#8E8EA0]">{isAr ? "لا توجد تنبيهات" : "No active alerts"}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Missing screenshot alerts */}
                {missingScreenshots.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      <Camera className="w-3 h-3 text-[#D9730D]" strokeWidth={2.5} />
                      <span className="text-[10px] font-semibold text-[#D9730D] uppercase tracking-wider">
                        {isAr ? "لقطات شاشة مفقودة" : "Missing Screenshots"}
                      </span>
                      <span className="text-[9px] font-bold text-[#D9730D] bg-[#D9730D]/10 px-1.5 py-0.5 rounded">
                        {missingScreenshots.length}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {missingScreenshots.slice(0, 5).map(ms => {
                        const shiftTime = new Date(ms.scheduled_start).toLocaleTimeString(isAr ? "ar-KW" : "en-GB", { hour: "2-digit", minute: "2-digit" });
                        const isLate = new Date() > new Date(ms.scheduled_start);
                        return (
                          <Link key={`${ms.shift_id}-${ms.driver_id}`} href={`/drivers/${ms.driver_id}`} className="flex items-center gap-2.5 py-2 px-2 -mx-1 rounded-lg hover:bg-[#F8F8FC] transition-colors group">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0`} style={{ background: PLATFORM_COLOR_MAP[ms.platform ?? ""] || "#8E8EA0" }}>
                              {ms.driver_name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-medium text-[#1E1E2D] truncate group-hover:text-[#6366F1] transition-colors">{ms.driver_name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-[#8E8EA0] capitalize">{ms.platform ?? "—"}</span>
                                <span className="text-[10px] text-[#C0C0CC]">&middot;</span>
                                <span className="text-[10px] text-[#8E8EA0]">{shiftTime}</span>
                              </div>
                            </div>
                            {isLate && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EF4444]/10 text-[#EF4444] shrink-0">
                                <Clock className="w-2.5 h-2.5" strokeWidth={2.5} />
                                {isAr ? "متأخر" : "Late"}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                      {missingScreenshots.length > 5 && (
                        <div className="text-[10px] text-[#C0C0CC] font-medium text-center py-1">
                          +{missingScreenshots.length - 5} {isAr ? "آخرين" : "more"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Separator between missing screenshots and AI alerts */}
                {missingScreenshots.length > 0 && activeAlerts.length > 0 && (
                  <div className="border-t border-[#F1F0FB] my-2" />
                )}
                {/* AI alerts */}
                {activeAlerts.length > 0 && (
                  <div className="divide-y divide-[#F1F0FB]">
                    {activeAlerts.map(a => (
                      <ActivityItem key={a.id} type={a.severity === "critical" || a.severity === "high" ? "warning" : a.severity === "medium" ? "info" : "success"} text={isAr ? (a.title_ar || a.title) : a.title} time={formatRelativeTime(a.created_at)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Missing Screenshots Table */}
      {missingScreenshots.length > 0 && (
        <MissingScreenshotsTable items={missingScreenshots} isAr={isAr} />
      )}
    </div>
  );
}

function MissingScreenshotsTable({ items, isAr }: { items: MissingScreenshotItem[]; isAr: boolean }) {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const platforms = useMemo(() => {
    const set = new Set(items.map(i => i.platform ?? "unknown"));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.driver_name.toLowerCase().includes(q));
    }
    if (platformFilter !== "all") {
      list = list.filter(i => (i.platform ?? "unknown") === platformFilter);
    }
    if (typeFilter !== "all") {
      list = list.filter(i =>
        typeFilter === "schedule" ? i.missing_schedule :
        typeFilter === "clock_in" ? i.missing_clock_in :
        typeFilter === "clock_out" ? i.missing_clock_out :
        typeFilter === "orders" ? i.missing_orders : true
      );
    }
    return list;
  }, [items, search, platformFilter, typeFilter]);

  const scheduleCount = items.filter(i => i.missing_schedule).length;
  const clockInCount = items.filter(i => i.missing_clock_in).length;
  const clockOutCount = items.filter(i => i.missing_clock_out).length;
  const ordersCount = items.filter(i => i.missing_orders).length;

  const now = new Date();

  return (
    <div className={`${CARD_BASE} animate-in-view`} style={{ animationDelay: "420ms" }}>
      <div className="px-5 pt-5 pb-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D9730D]/10 flex items-center justify-center">
              <ImageOff className="w-4 h-4 text-[#D9730D]" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-[#1E1E2D]">
                {isAr ? "الصور المفقودة" : "Missing Uploads"}
              </h3>
              <p className="text-[11px] text-[#8E8EA0]">
                {isAr
                  ? `${filtered.length} سائق لم يرفع الصور المطلوبة`
                  : `${filtered.length} driver${filtered.length !== 1 ? "s" : ""} with missing uploads today`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={isAr ? "بحث بالاسم..." : "Search driver..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-[180px] px-2.5 text-[12px] rounded-md border border-[#E5E5ED] bg-white text-[#1E1E2D] placeholder:text-[#C0C0CC] focus:outline-none focus:border-[#6366F1] transition-colors"
            />
            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className="h-8 px-2 text-[12px] rounded-md border border-[#E5E5ED] bg-white text-[#1E1E2D] focus:outline-none focus:border-[#6366F1] transition-colors"
            >
              <option value="all">{isAr ? "كل المنصات" : "All Platforms"}</option>
              {platforms.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="h-8 px-2 text-[12px] rounded-md border border-[#E5E5ED] bg-white text-[#1E1E2D] focus:outline-none focus:border-[#6366F1] transition-colors"
            >
              <option value="all">{isAr ? "كل الأنواع" : "All Types"}</option>
              <option value="schedule">{isAr ? "الجدول" : "Schedule"}</option>
              <option value="clock_in">{isAr ? "تسجيل الدخول" : "Clock In"}</option>
              <option value="clock_out">{isAr ? "تسجيل الخروج" : "Clock Out"}</option>
              <option value="orders">{isAr ? "الطلبات والتحصيل" : "Orders + Cash"}</option>
            </select>
          </div>
        </div>
        {/* Summary chips */}
        <div className="flex items-center gap-2">
          <button onClick={() => setTypeFilter(typeFilter === "schedule" ? "all" : "schedule")} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${typeFilter === "schedule" ? "bg-[#D9730D]/15 text-[#D9730D]" : "bg-[#F8F8FC] text-[#8E8EA0] hover:bg-[#F1F0FB]"}`}>
            <Camera className="w-3 h-3" strokeWidth={2} />
            {isAr ? "الجدول" : "Schedule"} <span className="font-bold">{scheduleCount}</span>
          </button>
          <button onClick={() => setTypeFilter(typeFilter === "clock_in" ? "all" : "clock_in")} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${typeFilter === "clock_in" ? "bg-[#6366F1]/15 text-[#6366F1]" : "bg-[#F8F8FC] text-[#8E8EA0] hover:bg-[#F1F0FB]"}`}>
            <LogIn className="w-3 h-3" strokeWidth={2} />
            {isAr ? "تسجيل الدخول" : "Clock In"} <span className="font-bold">{clockInCount}</span>
          </button>
          <button onClick={() => setTypeFilter(typeFilter === "clock_out" ? "all" : "clock_out")} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${typeFilter === "clock_out" ? "bg-[#EF4444]/15 text-[#EF4444]" : "bg-[#F8F8FC] text-[#8E8EA0] hover:bg-[#F1F0FB]"}`}>
            <LogOut className="w-3 h-3" strokeWidth={2} />
            {isAr ? "تسجيل الخروج" : "Clock Out"} <span className="font-bold">{clockOutCount}</span>
          </button>
          <button onClick={() => setTypeFilter(typeFilter === "orders" ? "all" : "orders")} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${typeFilter === "orders" ? "bg-[#0F7B6C]/15 text-[#0F7B6C]" : "bg-[#F8F8FC] text-[#8E8EA0] hover:bg-[#F1F0FB]"}`}>
            <Receipt className="w-3 h-3" strokeWidth={2} />
            {isAr ? "الطلبات والتحصيل" : "Orders + Cash"} <span className="font-bold">{ordersCount}</span>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-t border-[#F1F0FB]">
              <th className="text-start text-[11px] font-semibold text-[#8E8EA0] uppercase tracking-wider px-5 py-2.5">
                {isAr ? "السائق" : "Driver"}
              </th>
              <th className="text-start text-[11px] font-semibold text-[#8E8EA0] uppercase tracking-wider px-3 py-2.5">
                {isAr ? "المنصة" : "Platform"}
              </th>
              <th className="text-start text-[11px] font-semibold text-[#8E8EA0] uppercase tracking-wider px-3 py-2.5">
                {isAr ? "الوردية" : "Shift"}
              </th>
              <th className="text-start text-[11px] font-semibold text-[#8E8EA0] uppercase tracking-wider px-3 py-2.5">
                {isAr ? "المفقود" : "Missing"}
              </th>
              <th className="text-start text-[11px] font-semibold text-[#8E8EA0] uppercase tracking-wider px-3 py-2.5">
                {isAr ? "الحالة" : "Status"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F0FB]">
            {filtered.map(item => {
              const startTime = new Date(item.scheduled_start).toLocaleTimeString(isAr ? "ar-KW" : "en-GB", { hour: "2-digit", minute: "2-digit" });
              const endTime = new Date(item.scheduled_end).toLocaleTimeString(isAr ? "ar-KW" : "en-GB", { hour: "2-digit", minute: "2-digit" });
              const isLate = now > new Date(item.scheduled_start);
              const platformColor = PLATFORM_COLOR_MAP[item.platform ?? ""] || "#8E8EA0";

              return (
                <tr key={`${item.shift_id}-${item.driver_id}`} className="hover:bg-[#F8F8FC] transition-colors">
                  <td className="px-5 py-2.5">
                    <Link href={`/drivers/${item.driver_id}`} className="flex items-center gap-2.5 group">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ background: platformColor }}
                      >
                        {item.driver_name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-[13px] font-medium text-[#1E1E2D] group-hover:text-[#6366F1] transition-colors">
                        {item.driver_name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize"
                      style={{ color: platformColor, backgroundColor: platformColor + "15" }}
                    >
                      {item.platform ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[13px] text-[#1E1E2D] tabular-nums">{startTime} – {endTime}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {item.missing_schedule && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#D9730D]/10 text-[#D9730D]" title={isAr ? "لقطة الجدول" : "Schedule screenshot"}>
                          <Camera className="w-3 h-3" strokeWidth={2.5} />
                          {isAr ? "الجدول" : "Schedule"}
                        </span>
                      )}
                      {item.missing_clock_in && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#6366F1]/10 text-[#6366F1]" title={isAr ? "صورة تسجيل الدخول" : "Clock-in selfie"}>
                          <LogIn className="w-3 h-3" strokeWidth={2.5} />
                          {isAr ? "الدخول" : "Clock In"}
                        </span>
                      )}
                      {item.missing_clock_out && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EF4444]/10 text-[#EF4444]" title={isAr ? "لقطة تسجيل الخروج" : "Clock-out screenshot"}>
                          <LogOut className="w-3 h-3" strokeWidth={2.5} />
                          {isAr ? "الخروج" : "Clock Out"}
                        </span>
                      )}
                      {item.missing_orders && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0F7B6C]/10 text-[#0F7B6C]" title={isAr ? "لقطة الطلبات والتحصيل" : "Orders + Cash screenshot"}>
                          <Receipt className="w-3 h-3" strokeWidth={2.5} />
                          {isAr ? "الطلبات" : "Orders"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {item.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#8E8EA0]/10 text-[#8E8EA0]">
                        {isAr ? "مكتمل" : "Completed"}
                      </span>
                    ) : isLate ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EF4444]/10 text-[#EF4444]">
                        <Clock className="w-3 h-3" strokeWidth={2.5} />
                        {isAr ? "متأخر" : "Overdue"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#D9730D]/10 text-[#D9730D]">
                        <Clock className="w-3 h-3" strokeWidth={2.5} />
                        {isAr ? "بانتظار الرفع" : "Pending"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-[12px] text-[#C0C0CC]">{isAr ? "لا توجد نتائج" : "No results found"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
