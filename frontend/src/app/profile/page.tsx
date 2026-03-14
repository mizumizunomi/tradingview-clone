"use client";
import { useState } from "react";
import { SideNav } from "@/components/layout/SideNav";
import { useTradingStore } from "@/store/trading.store";
import { User, Settings, Shield, ChevronRight } from "lucide-react";

const SECTION_STYLE: React.CSSProperties = {
  background: "var(--tv-bg2)",
  border: "1px solid var(--tv-border)",
  borderRadius: 12,
  padding: "20px 24px",
  marginBottom: 20,
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--tv-muted)",
  marginBottom: 6,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--tv-border)",
  background: "var(--tv-bg3)",
  color: "var(--tv-text)",
  fontSize: 13,
  outline: "none",
};

const INPUT_READONLY_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  opacity: 0.6,
  cursor: "not-allowed",
};

export default function ProfilePage() {
  const { user, theme, setTheme, addToast } = useTradingStore();

  const [displayName, setDisplayName] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  });
  const [bio, setBio] = useState("");
  const [defaultTimeframe, setDefaultTimeframe] = useState("1h");
  const [defaultChartType, setDefaultChartType] = useState("Candlestick");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const avatarLetter = user?.username ? user.username[0].toUpperCase() : "U";

  const handleSave = () => {
    addToast({ type: "success", message: "Profile saved" });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast({ type: "error", message: "Please fill in all password fields" });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({ type: "error", message: "New passwords do not match" });
      return;
    }
    addToast({ type: "success", message: "Password changed successfully" });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--tv-bg)" }}>
      <SideNav />
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="border-b px-8 py-6" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
          <div className="max-w-2xl mx-auto flex items-center gap-5">
            {/* Large avatar */}
            <div
              className="flex shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ width: 64, height: 64, background: "#2962ff", fontSize: 26 }}
            >
              {avatarLetter}
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--tv-text)" }}>Profile Settings</h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--tv-muted)" }}>
                {user?.username} &middot; {user?.email}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-8 py-6">
          {/* Account Info */}
          <div style={SECTION_STYLE}>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4" style={{ color: "#2962ff" }} />
              <h2 className="text-sm font-bold" style={{ color: "var(--tv-text)" }}>Account Info</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label style={LABEL_STYLE}>Username</label>
                <input
                  type="text"
                  value={user?.username || ""}
                  readOnly
                  style={INPUT_READONLY_STYLE}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  style={INPUT_READONLY_STYLE}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label style={LABEL_STYLE}>First Name</label>
                <input
                  type="text"
                  value={displayName.firstName}
                  onChange={(e) => setDisplayName((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="First name"
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Last Name</label>
                <input
                  type="text"
                  value={displayName.lastName}
                  onChange={(e) => setDisplayName((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Last name"
                  style={INPUT_STYLE}
                />
              </div>
            </div>

            <div>
              <label style={LABEL_STYLE}>Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                style={{ ...INPUT_STYLE, resize: "vertical" }}
              />
            </div>
          </div>

          {/* Preferences */}
          <div style={SECTION_STYLE}>
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4" style={{ color: "#2962ff" }} />
              <h2 className="text-sm font-bold" style={{ color: "var(--tv-text)" }}>Preferences</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label style={LABEL_STYLE}>Default Timeframe</label>
                <select
                  value={defaultTimeframe}
                  onChange={(e) => setDefaultTimeframe(e.target.value)}
                  style={INPUT_STYLE}
                >
                  {["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W", "1M"].map((tf) => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Default Chart Type</label>
                <select
                  value={defaultChartType}
                  onChange={(e) => setDefaultChartType(e.target.value)}
                  style={INPUT_STYLE}
                >
                  {["Candlestick", "Line", "Bar", "Area"].map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={LABEL_STYLE}>Theme</label>
              <div className="flex items-center gap-4 mt-1">
                {(["dark", "light"] as const).map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-2 cursor-pointer"
                    style={{ color: "var(--tv-text-light)", fontSize: 13 }}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={t}
                      checked={theme === t}
                      onChange={() => setTheme(t)}
                      style={{ accentColor: "#2962ff" }}
                    />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Security */}
          <div style={SECTION_STYLE}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4" style={{ color: "#2962ff" }} />
              <h2 className="text-sm font-bold" style={{ color: "var(--tv-text)" }}>Security</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label style={LABEL_STYLE}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  style={INPUT_STYLE}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={LABEL_STYLE}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={INPUT_STYLE}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              className="mt-4 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all hover:opacity-90"
              style={{ background: "#2962ff22", color: "#2962ff", border: "1px solid #2962ff44" }}
            >
              <Shield className="h-3.5 w-3.5" />
              Change Password
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Save button */}
          <div className="flex justify-end pb-6">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "#2962ff" }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
