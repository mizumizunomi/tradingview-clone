"use client";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
  MouseEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Lock,
} from "lucide-react";
import { useTradingStore } from "@/store/trading.store";
import { Asset, Toast } from "@/types";
import { cn } from "@/lib/utils";
import { getPlanConfig } from "@/lib/planConfig";
import { useRouter } from "next/navigation";

// ─── Types ─────────────────────────────────────────────────────────────────

interface WatchlistSection {
  id: string;
  name: string;
  symbols: string[];
  collapsed: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  symbol: string;
  sectionId: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const LS_KEY = "tv_watchlist_sections";

const DEFAULT_SECTIONS: WatchlistSection[] = [
  {
    id: "crypto",
    name: "Crypto",
    symbols: ["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "BNBUSD", "ADAUSD", "DOGEUSD"],
    collapsed: false,
  },
  {
    id: "forex",
    name: "Forex",
    symbols: ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD"],
    collapsed: false,
  },
  {
    id: "commodities",
    name: "Commodities",
    symbols: ["XAUUSD", "USOIL", "XAGUSD"],
    collapsed: false,
  },
  {
    id: "stocks",
    name: "Stocks",
    symbols: ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "META"],
    collapsed: false,
  },
  {
    id: "indices",
    name: "Indices",
    symbols: ["SPX500", "NAS100", "DJI"],
    collapsed: false,
  },
];

const TAG_COLORS: { color: string; label: string }[] = [
  { color: "#ef5350", label: "Red" },
  { color: "#2962ff", label: "Blue" },
  { color: "#f59e0b", label: "Yellow" },
  { color: "#26a69a", label: "Green" },
  { color: "#ff9800", label: "Orange" },
  { color: "#00bcd4", label: "Cyan" },
  { color: "#ffffff", label: "White" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatWatchPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(3);
  return price.toFixed(5);
}

function loadSections(): WatchlistSection[] {
  if (typeof window === "undefined") return DEFAULT_SECTIONS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as WatchlistSection[];
  } catch {
    // ignore
  }
  return DEFAULT_SECTIONS;
}

function saveSections(sections: WatchlistSection[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(sections));
}

// ─── Symbol Add Dropdown ─────────────────────────────────────────────────────

interface AddSymbolDropdownProps {
  assets: Asset[];
  existingSymbols: string[];
  onAdd: (symbol: string) => void;
  onClose: () => void;
  /** If true, renders a compact popover variant (used in context menu) */
  compact?: boolean;
}

function AddSymbolDropdown({
  assets,
  existingSymbols,
  onAdd,
  onClose,
  compact = false,
}: AddSymbolDropdownProps) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = assets
    .filter(
      (a) =>
        !existingSymbols.includes(a.symbol) &&
        (q === "" ||
          a.symbol.toLowerCase().includes(q.toLowerCase()) ||
          a.name.toLowerCase().includes(q.toLowerCase()))
    )
    .slice(0, 40);

  return (
    <div
      className={cn(
        "flex flex-col bg-[var(--tv-bg2)] border border-[var(--tv-border)] rounded shadow-lg z-50",
        compact ? "w-44" : "w-full"
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 border-b border-[var(--tv-border)] px-2 py-1">
        <Search className="h-3 w-3 shrink-0 text-[var(--tv-muted)]" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search symbol..."
          className="flex-1 bg-transparent text-[11px] text-[var(--tv-text-light)] outline-none placeholder:text-[var(--tv-muted)] min-w-0"
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Escape") onClose();
          }}
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-[10px] text-[var(--tv-muted)]">No results</div>
        )}
        {filtered.map((a) => (
          <button
            key={a.symbol}
            onClick={() => {
              onAdd(a.symbol);
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-1 text-left hover:bg-[var(--tv-bg3)] transition-colors"
          >
            <span className="text-[11px] font-bold text-[var(--tv-text-light)]">{a.symbol}</span>
            <span className="truncate text-[10px] text-[var(--tv-muted)]">{a.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface ContextMenuProps {
  menu: ContextMenuState;
  assets: Asset[];
  sections: WatchlistSection[];
  tagColors: Record<string, string>;
  onSetTag: (symbol: string, color: string | null) => void;
  onRemove: (sectionId: string, symbol: string) => void;
  onAddSection: () => void;
  onAddToSection: (sectionId: string, symbol: string) => void;
  onClose: () => void;
  addToast: (t: Omit<Toast, "id">) => void;
}

function ContextMenu({
  menu,
  assets,
  sections,
  tagColors,
  onSetTag,
  onRemove,
  onAddSection,
  onAddToSection,
  onClose,
  addToast,
}: ContextMenuProps) {
  const [showAddSymbol, setShowAddSymbol] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentSection = sections.find((s) => s.id === menu.sectionId);
  const existingSymbols = currentSection?.symbols ?? [];

  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ top: menu.y, left: menu.x, position: "fixed" }}
      className="z-[200] min-w-[160px] rounded border border-[var(--tv-border)] bg-[var(--tv-bg2)] shadow-xl py-1 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Color tag dots */}
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        {TAG_COLORS.map(({ color, label }) => (
          <button
            key={color}
            title={label}
            onClick={() => {
              onSetTag(menu.symbol, color);
              onClose();
            }}
            className="h-3.5 w-3.5 rounded-full border border-[var(--tv-border2)] hover:scale-110 transition-transform"
            style={{ background: color }}
          />
        ))}
      </div>
      <button
        onClick={() => {
          onSetTag(menu.symbol, null);
          onClose();
        }}
        className="flex w-full items-center px-3 py-1 text-[11px] text-[var(--tv-text)] hover:bg-[var(--tv-bg3)] transition-colors"
      >
        Clear tag
      </button>

      <div className="my-1 border-t border-[var(--tv-border)]" />

      <button
        onClick={() => {
          addToast({ type: "info", message: "Compare feature coming soon" });
          onClose();
        }}
        className="flex w-full items-center px-3 py-1 text-[11px] text-[var(--tv-text)] hover:bg-[var(--tv-bg3)] transition-colors"
      >
        Add to compare
      </button>
      <button
        onClick={() => {
          onRemove(menu.sectionId, menu.symbol);
          onClose();
        }}
        className="flex w-full items-center px-3 py-1 text-[11px] text-[var(--tv-red)] hover:bg-[var(--tv-bg3)] transition-colors"
      >
        Remove from watchlist
      </button>
      <button
        onClick={() => setShowAddSymbol((v) => !v)}
        className="flex w-full items-center px-3 py-1 text-[11px] text-[var(--tv-text)] hover:bg-[var(--tv-bg3)] transition-colors"
      >
        Add symbol
      </button>

      {showAddSymbol && (
        <div className="px-1 pb-1">
          <AddSymbolDropdown
            assets={assets}
            existingSymbols={existingSymbols}
            onAdd={(sym) => onAddToSection(menu.sectionId, sym)}
            onClose={() => setShowAddSymbol(false)}
            compact
          />
        </div>
      )}

      <div className="my-1 border-t border-[var(--tv-border)]" />

      <button
        onClick={() => {
          onAddSection();
          onClose();
        }}
        className="flex w-full items-center px-3 py-1 text-[11px] text-[var(--tv-text)] hover:bg-[var(--tv-bg3)] transition-colors"
      >
        Add section
      </button>
    </div>
  );
}

// ─── Symbol Row ───────────────────────────────────────────────────────────────

interface SymbolRowProps {
  symbol: string;
  asset: Asset | undefined;
  price: { price: number; changePercent: number; bid: number; ask: number } | undefined;
  isSelected: boolean;
  tagColor: string | undefined;
  locked?: boolean;
  onSelect: () => void;
  onContextMenu: (e: MouseEvent<HTMLDivElement>) => void;
}

function SymbolRow({
  symbol,
  asset,
  price,
  isSelected,
  tagColor,
  locked = false,
  onSelect,
  onContextMenu,
}: SymbolRowProps) {
  const prevPriceRef = useRef<number | undefined>(undefined);
  const [flashClass, setFlashClass] = useState<"flash-green" | "flash-red" | "">("");
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (price?.price == null) return;
    const prev = prevPriceRef.current;
    if (prev !== undefined && prev !== price.price) {
      const cls = price.price > prev ? "flash-green" : "flash-red";
      setFlashClass(cls);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashClass(""), 500);
    }
    prevPriceRef.current = price.price;
  }, [price?.price]);

  const isPositive = (price?.changePercent ?? 0) >= 0;

  return (
    <div
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={cn(
        "flex items-center select-none transition-colors",
        locked ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        flashClass,
        isSelected
          ? "border-l-2 border-[#2962ff] bg-[#2962ff0f]"
          : "border-l-2 border-transparent hover:bg-[var(--tv-bg3)]"
      )}
      style={{ height: 24, paddingLeft: 4, paddingRight: 6 }}
    >
      {/* Color tag dot */}
      <div
        className="mr-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: tagColor ?? "transparent", border: tagColor ? "none" : "1px solid transparent" }}
      />

      {/* Symbol + name */}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-[11px] font-bold leading-none",
            isSelected ? "text-white" : "text-[var(--tv-text-light)]"
          )}
        >
          {symbol}
        </span>
      </div>

      {/* Price + change / Lock */}
      {locked ? (
        <Lock className="h-3 w-3 ml-1 shrink-0 text-[#f59e0b]" />
      ) : price ? (
        <div className="ml-1 flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[10px] text-[var(--tv-text-light)] leading-none tabular-nums">
            {formatWatchPrice(price.price)}
          </span>
          <span
            className="text-[10px] font-medium leading-none tabular-nums"
            style={{ color: isPositive ? "var(--tv-green)" : "var(--tv-red)" }}
          >
            {isPositive ? "+" : ""}
            {price.changePercent.toFixed(2)}%
          </span>
        </div>
      ) : (
        <span className="text-[10px] text-[var(--tv-muted)]">—</span>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  section: WatchlistSection;
  assets: Asset[];
  onToggle: () => void;
  onRename: (name: string) => void;
  onAddSymbol: (symbol: string) => void;
}

function SectionHeader({ section, assets, onToggle, onRename, onAddSymbol }: SectionHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.name);
  const [showAdd, setShowAdd] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showAdd) return;
    const handler = (e: globalThis.MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowAdd(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAdd]);

  const commitRename = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed) onRename(trimmed);
    else setDraft(section.name);
    setEditing(false);
  }, [draft, onRename, section.name]);

  return (
    <div className="relative">
      <div
        className="flex items-center justify-between px-2 cursor-pointer select-none"
        style={{
          height: 22,
          background: "var(--tv-bg)",
          borderBottom: "1px solid var(--tv-border)",
        }}
      >
        {/* Chevron */}
        <button
          onClick={onToggle}
          className="shrink-0 text-[var(--tv-muted)] hover:text-[var(--tv-text)] mr-1"
        >
          {section.collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>

        {/* Name — click to rename */}
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(section.name);
                setEditing(false);
              }
            }}
            className="flex-1 min-w-0 bg-[var(--tv-bg3)] text-[11px] text-[var(--tv-text-light)] outline-none px-1 rounded"
            style={{ height: 16 }}
          />
        ) : (
          <span
            className="flex-1 min-w-0 text-[10px] font-bold uppercase tracking-wider text-[var(--tv-muted)] truncate"
            onClick={() => {
              setDraft(section.name);
              setEditing(true);
            }}
          >
            {section.name}
          </span>
        )}

        {/* Add symbol button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAdd((v) => !v);
          }}
          className="ml-1 shrink-0 rounded text-[var(--tv-muted)] hover:text-[var(--tv-text)] hover:bg-[var(--tv-bg3)] transition-colors"
          style={{ padding: "1px" }}
          title="Add symbol"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Add symbol dropdown */}
      {showAdd && (
        <div
          ref={dropRef}
          className="absolute left-0 right-0 z-50"
          style={{ top: 22 }}
        >
          <AddSymbolDropdown
            assets={assets}
            existingSymbols={section.symbols}
            onAdd={(sym) => {
              onAddSymbol(sym);
              setShowAdd(false);
            }}
            onClose={() => setShowAdd(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Symbol Info Panel ────────────────────────────────────────────────────────

interface InfoPanelProps {
  asset: Asset;
  price:
    | { price: number; changePercent: number; bid: number; ask: number; change: number }
    | undefined;
}

function InfoPanel({ asset, price }: InfoPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const isPositive = (price?.changePercent ?? 0) >= 0;

  return (
    <div
      className="border-t border-[var(--tv-border)] shrink-0"
      style={{ background: "var(--tv-bg)" }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-2 cursor-pointer select-none hover:bg-[var(--tv-bg3)] transition-colors"
        style={{ height: 22 }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-[11px] font-bold text-[var(--tv-text-light)]">{asset.symbol}</span>
        {price && (
          <span
            className="text-[10px] font-medium"
            style={{ color: isPositive ? "var(--tv-green)" : "var(--tv-red)" }}
          >
            {isPositive ? "+" : ""}
            {price.changePercent.toFixed(2)}%
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-[var(--tv-muted)]" />
        ) : (
          <ChevronUp className="h-3 w-3 text-[var(--tv-muted)]" />
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          className="px-2 pb-2 flex flex-col gap-1"
          style={{ height: 100, overflow: "hidden" }}
        >
          {/* Category badge */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{ background: "var(--tv-bg3)", color: "var(--tv-muted)" }}
            >
              {asset.category}
            </span>
          </div>
          {price ? (
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between">
                <span className="text-[10px] text-[var(--tv-muted)]">Price</span>
                <span className="font-mono text-[10px] text-[var(--tv-text-light)] tabular-nums">
                  {formatWatchPrice(price.price)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-[var(--tv-muted)]">Change</span>
                <span
                  className="font-mono text-[10px] tabular-nums"
                  style={{ color: isPositive ? "var(--tv-green)" : "var(--tv-red)" }}
                >
                  {isPositive ? "+" : ""}
                  {price.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-[var(--tv-muted)]">Bid</span>
                <span className="font-mono text-[10px] text-[var(--tv-text-light)] tabular-nums">
                  {formatWatchPrice(price.bid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-[var(--tv-muted)]">Ask</span>
                <span className="font-mono text-[10px] text-[var(--tv-text-light)] tabular-nums">
                  {formatWatchPrice(price.ask)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-[var(--tv-muted)]">Spread</span>
                <span className="font-mono text-[10px] text-[var(--tv-text-light)] tabular-nums">
                  {asset.spread}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-[10px] text-[var(--tv-muted)]">No price data</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Watchlist ───────────────────────────────────────────────────────────

export function Watchlist() {
  const [collapsed, setCollapsed] = useState(false);
  const [sections, setSections] = useState<WatchlistSection[]>(loadSections);
  const [tagColors, setTagColors] = useState<Record<string, string>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const router = useRouter();

  const { assets, prices, setSelectedAsset, selectedAsset, addToast, user } = useTradingStore();

  const planConfig = getPlanConfig(user?.plan);
  const maxAssets = planConfig.maxAssets;
  // Build a global index map from the ordered assets array
  const globalIndexMap = new Map<string, number>(assets.map((a, i) => [a.symbol, i]));

  // Persist sections to localStorage whenever they change
  useEffect(() => {
    saveSections(sections);
  }, [sections]);

  // ── Section mutations ─────────────────────────────────────────────────────

  const toggleSection = useCallback((id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, collapsed: !s.collapsed } : s))
    );
  }, []);

  const renameSection = useCallback((id: string, name: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }, []);

  const addSymbolToSection = useCallback((sectionId: string, symbol: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId && !s.symbols.includes(symbol)
          ? { ...s, symbols: [...s.symbols, symbol] }
          : s
      )
    );
  }, []);

  const removeSymbolFromSection = useCallback((sectionId: string, symbol: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, symbols: s.symbols.filter((sym) => sym !== symbol) } : s
      )
    );
  }, []);

  const addNewSection = useCallback(() => {
    const id = `section_${Date.now()}`;
    setSections((prev) => [
      ...prev,
      { id, name: "New Section", symbols: [], collapsed: false },
    ]);
  }, []);

  // ── Tag colors ────────────────────────────────────────────────────────────

  const setTagColor = useCallback((symbol: string, color: string | null) => {
    setTagColors((prev) => {
      const next = { ...prev };
      if (color === null) delete next[symbol];
      else next[symbol] = color;
      return next;
    });
  }, []);

  // ── Context menu ──────────────────────────────────────────────────────────

  const handleContextMenu = useCallback(
    (e: MouseEvent<HTMLDivElement>, symbol: string, sectionId: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, symbol, sectionId });
    },
    []
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // ─── Collapsed sidebar ────────────────────────────────────────────────────

  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center gap-2 border-r border-[var(--tv-border)] py-2"
        style={{ width: 28, background: "var(--tv-bg2)" }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="rounded p-1 text-[var(--tv-muted)] hover:text-white hover:bg-[var(--tv-bg3)] transition-colors"
          title="Expand watchlist"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <div
          className="text-[9px] font-bold uppercase tracking-widest text-[var(--tv-muted)]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Watchlist
        </div>
      </div>
    );
  }

  // Build asset lookup map
  const assetMap = new Map<string, Asset>(assets.map((a) => [a.symbol, a]));

  return (
    <div
      className="flex flex-col border-r border-[var(--tv-border)]"
      style={{ width: 200, minWidth: 200, background: "var(--tv-bg2)" }}
    >
      {/* ── Top header ── */}
      <div
        className="flex items-center justify-between border-b border-[var(--tv-border)] px-2 shrink-0"
        style={{ height: 30, background: "var(--tv-bg2)" }}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--tv-text)]">
          Watchlist
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-[var(--tv-muted)] hover:text-[var(--tv-text)] transition-colors"
          title="Collapse watchlist"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Scrollable section list ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {sections.map((section) => (
          <div key={section.id}>
            <SectionHeader
              section={section}
              assets={assets}
              onToggle={() => toggleSection(section.id)}
              onRename={(name) => renameSection(section.id, name)}
              onAddSymbol={(sym) => addSymbolToSection(section.id, sym)}
            />

            {!section.collapsed &&
              section.symbols.map((symbol) => {
                const asset = assetMap.get(symbol);
                const priceData = prices[symbol];
                const isSelected = selectedAsset?.symbol === symbol;

                const globalIdx = globalIndexMap.get(symbol) ?? 0;
                const locked = globalIdx >= maxAssets;

                return (
                  <SymbolRow
                    key={symbol}
                    symbol={symbol}
                    asset={asset}
                    price={priceData}
                    isSelected={isSelected}
                    tagColor={tagColors[symbol]}
                    locked={locked}
                    onSelect={() => {
                      if (locked) {
                        router.push("/plans");
                        return;
                      }
                      if (asset) setSelectedAsset(asset);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, symbol, section.id)}
                  />
                );
              })}
          </div>
        ))}

        {/* ── Add section button ── */}
        <button
          onClick={addNewSection}
          className="flex w-full items-center gap-1 px-3 py-2 text-[10px] text-[var(--tv-muted)] hover:text-[var(--tv-text)] hover:bg-[var(--tv-bg3)] transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add section
        </button>
      </div>

      {/* ── Symbol info panel ── */}
      {selectedAsset && (
        <InfoPanel
          asset={selectedAsset}
          price={prices[selectedAsset.symbol]}
        />
      )}

      {/* ── Context menu ── */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          assets={assets}
          sections={sections}
          tagColors={tagColors}
          onSetTag={setTagColor}
          onRemove={removeSymbolFromSection}
          onAddSection={addNewSection}
          onAddToSection={addSymbolToSection}
          onClose={closeContextMenu}
          addToast={addToast}
        />
      )}
    </div>
  );
}
