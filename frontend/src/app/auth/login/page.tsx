"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart2, Eye, EyeOff, Loader2 } from "lucide-react";
import { api, endpoints } from "@/lib/api";
import { useTradingStore } from "@/store/trading.store";

function validate(email: string, password: string) {
  const errs: { email?: string; password?: string } = {};
  if (!email.trim()) errs.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Invalid email format";
  if (!password) errs.password = "Password is required";
  return errs;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setToken } = useTradingStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [showPw, setShowPw] = useState(false);
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") setRegistered(true);
  }, [searchParams]);

  const fieldErrs = validate(form.email, form.password);
  const isValid = Object.keys(fieldErrs).length === 0;

  const handleBlur = (field: keyof typeof touched) =>
    setTouched((p) => ({ ...p, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid) return;
    setLoading(true);
    setApiError("");
    try {
      const res = await api.post(endpoints.login, form);
      setToken(res.data.token);
      setUser(res.data.user);
      router.push("/trade");
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setApiError(apiErr.response?.data?.message || "Invalid credentials. Please try again.");
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
          <div className="mb-3 flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2962ff] shadow-lg shadow-[#2962ff44]">
              <BarChart2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-[#5d6673]">Sign in to your trading account</p>
        </div>

        {/* Success banner after registration */}
        {registered && (
          <div className="mb-4 rounded-lg border border-[#26a69a40] bg-[#26a69a15] px-3 py-2.5 text-xs text-[#26a69a]">
            Account created successfully — please sign in.
          </div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-[#363a45] bg-[#1e222d] p-6 shadow-2xl">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#b2b5be]">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setApiError(""); }}
                onBlur={() => handleBlur("email")}
                placeholder="you@example.com"
                className="w-full rounded-lg border bg-[#2a2e39] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#5d6673]"
                style={{ borderColor: touched.email && fieldErrs.email ? "#ef5350" : "#363a45" }}
                autoComplete="email"
              />
              {touched.email && fieldErrs.email && (
                <p className="mt-1 text-xs text-[#ef5350]">{fieldErrs.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#b2b5be]">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setApiError(""); }}
                  onBlur={() => handleBlur("password")}
                  placeholder="••••••••"
                  className="w-full rounded-lg border bg-[#2a2e39] px-3 py-2.5 pr-10 text-sm text-white outline-none transition-colors placeholder:text-[#5d6673]"
                  style={{ borderColor: touched.password && fieldErrs.password ? "#ef5350" : "#363a45" }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5d6673] hover:text-[#b2b5be]"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {touched.password && fieldErrs.password && (
                <p className="mt-1 text-xs text-[#ef5350]">{fieldErrs.password}</p>
              )}
            </div>

            {/* API error */}
            {apiError && (
              <div className="rounded-lg border border-[#ef535040] bg-[#ef535015] px-3 py-2 text-xs text-[#ef5350]">
                {apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2962ff] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2962ff33] transition-all hover:bg-[#3d6fff] active:bg-[#1e4dd8] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push("/auth/register")}
            className="text-xs text-[#5d6673] hover:text-[#2962ff] transition-colors"
          >
            Don&apos;t have an account? <span className="text-[#2962ff]">Create one</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
