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
    <div className="flex h-screen items-center justify-center route-fade" style={{ background: "var(--tv-bg)" }}>
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(600px circle at 50% 0%, rgba(41,98,255,0.10), transparent 60%)",
        }}
      />
      {/* Background grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(#b2b5be 1px, transparent 1px), linear-gradient(90deg, #b2b5be 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative w-full max-w-sm px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <button onClick={() => router.push("/")} className="mb-3 inline-flex items-center justify-center" aria-label="NovaTrade home">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl glow-blue" style={{ background: "var(--tv-blue)" }}>
              <BarChart2 className="h-6 w-6 text-white" />
            </div>
          </button>
          <h1 className="text-xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tv-muted)" }}>Sign in to your trading account</p>
        </div>

        {/* Success banner after registration */}
        {registered && (
          <div className="mb-4 rounded-lg border border-[#2ebd8540] bg-[#2ebd8515] px-3 py-2.5 text-xs text-[#2ebd85]">
            Account created successfully — please sign in.
          </div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-[#23262f] bg-[#111318] p-6 shadow-2xl">
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
                className="w-full rounded-lg border bg-[#181b22] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#5d6673]"
                style={{ borderColor: touched.email && fieldErrs.email ? "#f6465d" : "#23262f" }}
                autoComplete="email"
              />
              {touched.email && fieldErrs.email && (
                <p className="mt-1 text-xs text-[#f6465d]">{fieldErrs.email}</p>
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
                  className="w-full rounded-lg border bg-[#181b22] px-3 py-2.5 pr-10 text-sm text-white outline-none transition-colors placeholder:text-[#5d6673]"
                  style={{ borderColor: touched.password && fieldErrs.password ? "#f6465d" : "#23262f" }}
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
                <p className="mt-1 text-xs text-[#f6465d]">{fieldErrs.password}</p>
              )}
            </div>

            {/* API error */}
            {apiError && (
              <div className="rounded-lg border border-[#f6465d40] bg-[#f6465d15] px-3 py-2 text-xs text-[#f6465d]">
                {apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-all glow-blue hover:brightness-110 active:brightness-95 disabled:opacity-60"
              style={{ background: "var(--tv-blue)" }}
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
