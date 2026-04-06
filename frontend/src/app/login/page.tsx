"use client";
import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login, demoLogin } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="overflow-hidden" style={{ maxWidth: 210 }}>
            <Image src="/logo.png" alt="Darb — Fleet Operating System" width={220} height={80} className="object-contain" priority />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode("email")}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
                mode === "email" ? "bg-primary/8 text-primary" : "text-secondary hover:bg-gray-50"
              }`}
            >
              Email
            </button>
            <button
              onClick={() => setMode("phone")}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
                mode === "phone" ? "bg-primary/8 text-primary" : "text-secondary hover:bg-gray-50"
              }`}
            >
              Phone
            </button>
          </div>

          {mode === "email" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="osama@fleet.kw"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Enter password"
                  required
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="+965 XXXX XXXX"
                />
              </div>
              <button className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors">
                Send OTP
              </button>
            </div>
          )}

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-secondary">or</span>
            </div>
          </div>

          <button
            onClick={async () => {
              setError("");
              setLoading(true);
              try {
                await demoLogin();
                router.push("/");
              } catch (err: any) {
                setError(err?.response?.data?.error || err?.message || "Demo login failed");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-medium rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 shadow-sm"
          >
            Enter Demo
          </button>
        </div>
      </div>
    </div>
  );
}
