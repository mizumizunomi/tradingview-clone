"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, Eye, EyeOff } from "lucide-react";
import { api, endpoints } from "@/lib/api";
import { useTradingStore } from "@/store/trading.store";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken } = useTradingStore();
  const [form, setForm] = useState({ email: "demo@trading.com", password: "password123" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post(endpoints.login, form);
      setToken(res.data.token);
      setUser(res.data.user);
      router.push("/trade");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#131722]">
      {/* Background grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#b2b5be 1px, transparent 1px), linear-gradient(90deg, #b2b5be 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-sm px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2962ff] shadow-lg shadow-[#2962ff44]">
              <BarChart2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-[#5d6673]">Sign in to your trading account</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[#363a45] bg-[#1e222d] p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#b2b5be]">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-[#363a45] bg-[#2a2e39] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#5d6673] hover:border-[#434651] focus:border-[#2962ff]"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#b2b5be]">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg border border-[#363a45] bg-[#2a2e39] px-3 py-2.5 pr-10 text-sm text-white outline-none transition-colors placeholder:text-[#5d6673] hover:border-[#434651] focus:border-[#2962ff]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5d6673] hover:text-[#b2b5be]"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-[#ef535040] bg-[#ef535015] px-3 py-2 text-xs text-[#ef5350]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#2962ff] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2962ff33] transition-all hover:bg-[#3d6fff] active:bg-[#1e4dd8] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-4 rounded-lg bg-[#131722] border border-[#363a45] px-3 py-2.5">
            <div className="text-[11px] text-[#5d6673] mb-1 font-medium uppercase tracking-wider">Demo Account</div>
            <div className="text-xs text-[#b2b5be]">demo@trading.com · password123</div>
            <div className="text-[11px] text-[#5d6673] mt-1">$10,000 simulated balance</div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push("/auth/register")}
            className="text-xs text-[#5d6673] hover:text-[#2962ff] transition-colors"
          >
            Don't have an account? <span className="text-[#2962ff]">Create one</span>
          </button>
        </div>
      </div>
    </div>
  );
}
