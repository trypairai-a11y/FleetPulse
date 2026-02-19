"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import api from "@/lib/api";

function PulseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="#2563EB" />
      <path
        d="M16 6L8 18h7l-1 8 9-12h-7l1-8z"
        fill="white"
        opacity="0.95"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function LoaderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

const STATS = [
  { value: "2,847", label: "Active Drivers" },
  { value: "99.2%", label: "Uptime" },
  { value: "1.2M", label: "Orders Tracked" },
  { value: "24/7", label: "Live Monitoring" },
];

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { language, setLanguage } = useUIStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isAr = language === "ar";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("access_token", data.access_token);
      setUser(data.user);
      router.push("/");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number }; request?: unknown };
      if (axiosErr.response?.status === 401 || axiosErr.response?.status === 403) {
        setError(
          isAr
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : "Invalid email or password"
        );
      } else if (axiosErr.request && !axiosErr.response) {
        // Network error (CORS block, server unreachable, etc.)
        setError(
          isAr
            ? "تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً"
            : "Unable to reach the server. Please try again later."
        );
      } else {
        setError(
          isAr
            ? "حدث خطأ غير متوقع. يرجى المحاولة لاحقاً"
            : "An unexpected error occurred. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", {
        email: "admin@fleetpulse.com",
        password: "admin123",
      });
      localStorage.setItem("access_token", data.access_token);
      setUser(data.user);
      router.push("/");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isAr
            ? "حساب تجريبي غير متاح حالياً"
            : "Demo account unavailable";
      setError(msg);
      console.error("Demo login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-[#0A1E33]">
        {/* Animated grid background */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(37, 99, 235, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37, 99, 235, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }} />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1E33] via-[#0F2B46]/90 to-[#0A1E33]" />

        {/* Accent glow */}
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-[#2563EB]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-[#2563EB]/8 rounded-full blur-[100px]" />

        {/* Content */}
        <div className={`relative z-10 flex flex-col justify-between w-full p-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <PulseIcon className="w-9 h-9" />
            <span className="text-white text-xl font-semibold tracking-tight">
              FleetPulse
            </span>
          </div>

          {/* Headline */}
          <div className="max-w-md -mt-8">
            <h1 className="text-[2.75rem] leading-[1.15] font-bold text-white tracking-tight">
              {isAr ? (
                <>
                  أدِر أسطولك
                  <br />
                  <span className="text-[#5B9BFF]">بذكاء</span>
                </>
              ) : (
                <>
                  Fleet ops,
                  <br />
                  <span className="text-[#5B9BFF]">simplified.</span>
                </>
              )}
            </h1>
            <p className="mt-5 text-[#7B95B5] text-[1.05rem] leading-relaxed max-w-sm">
              {isAr
                ? "منصة متكاملة لإدارة السائقين والمركبات والطلبات في الوقت الفعلي."
                : "Real-time driver tracking, vehicle management, and delivery operations — all in one platform."}
            </p>
          </div>

          {/* Stats row */}
          <div className="flex gap-6">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
                style={{ transitionDelay: `${400 + i * 100}ms` }}
              >
                <div className="text-white text-xl font-bold tracking-tight">
                  {stat.value}
                </div>
                <div className="text-[#5A7A9A] text-xs mt-0.5 font-medium uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center bg-white relative">
        {/* Language toggle */}
        <button
          onClick={() => setLanguage(isAr ? "en" : "ar")}
          className="absolute top-6 right-6 text-sm text-[#94a3b8] hover:text-[#0F2B46] transition-colors font-medium"
        >
          {isAr ? "English" : "العربية"}
        </button>

        <div
          className={`w-full max-w-[380px] px-6 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '150ms' }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <PulseIcon className="w-8 h-8" />
            <span className="text-[#0F2B46] text-lg font-semibold tracking-tight">
              FleetPulse
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-[1.65rem] font-bold text-[#0F2B46] tracking-tight">
              {isAr ? "تسجيل الدخول" : "Sign in"}
            </h2>
            <p className="text-[#94a3b8] text-sm mt-1.5">
              {isAr
                ? "أدخل بياناتك للوصول إلى لوحة التحكم"
                : "Enter your credentials to access the dashboard"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[13px] font-medium text-[#475569]"
              >
                {isAr ? "البريد الإلكتروني" : "Email address"}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="name@company.com"
                required
                dir="ltr"
                className="h-11 bg-[#f8fafc] border-[#e8edf2] focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/10 transition-all placeholder:text-[#c0c9d4] text-[#0F2B46]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-[#475569]"
              >
                {isAr ? "كلمة المرور" : "Password"}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  required
                  dir="ltr"
                  className="h-11 bg-[#f8fafc] border-[#e8edf2] focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/10 transition-all placeholder:text-[#c0c9d4] pr-11 text-[#0F2B46]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Sign In button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium text-sm rounded-lg shadow-sm shadow-[#2563EB]/25 hover:shadow-md hover:shadow-[#2563EB]/25 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoaderIcon />
                  {isAr ? "جاري الدخول..." : "Signing in..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isAr ? "تسجيل الدخول" : "Sign in"}
                  <ArrowRightIcon />
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center">
            <div className="flex-1 border-t border-[#eef1f5]" />
            <span className="px-4 text-xs text-[#b0bac6] uppercase tracking-wider font-medium">
              {isAr ? "أو" : "or"}
            </span>
            <div className="flex-1 border-t border-[#eef1f5]" />
          </div>

          {/* Demo button */}
          <button
            type="button"
            onClick={loginDemo}
            disabled={loading}
            className="w-full h-11 rounded-lg border border-dashed border-[#d4dce8] bg-[#f8fafc] hover:bg-[#f1f5f9] hover:border-[#2563EB]/30 text-sm font-medium text-[#475569] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#2563EB]">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            {isAr ? "الدخول بحساب تجريبي" : "Try with demo account"}
          </button>

          {/* Footer note */}
          <p className="mt-8 text-center text-xs text-[#b8c4d0]">
            {isAr
              ? "نظام محمي ومشفر بالكامل"
              : "Protected by enterprise-grade encryption"}
          </p>
        </div>
      </div>
    </>
  );
}
