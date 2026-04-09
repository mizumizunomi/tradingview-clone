"use client";
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 p-6"
          style={{ color: "var(--tv-muted)" }}>
          <AlertTriangle className="h-8 w-8 text-[#ef5350] opacity-70" />
          <p className="text-sm font-medium" style={{ color: "var(--tv-text)" }}>Something went wrong</p>
          <p className="text-xs text-center max-w-xs" style={{ color: "var(--tv-muted)" }}>
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors"
            style={{ background: "var(--tv-bg3)", color: "var(--tv-text)", border: "1px solid var(--tv-border)" }}
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
