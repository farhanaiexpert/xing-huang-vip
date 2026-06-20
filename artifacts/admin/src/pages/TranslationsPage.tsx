import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api, TranslationOverride, TranslationOverridesResponse, BulkTranslationResult,
  TranslationQueueRow, TranslationQueueResponse, BulkResolveResult,
} from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Languages, Plus, Search, Save, Trash2, Pencil, X, Check,
  ClipboardPaste, FileUp, ListChecks, AlertTriangle, CopyCheck, Eraser,
  Inbox, EyeOff, Flame, Clock, CheckCheck, MapPin,
} from "lucide-react";

const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] transition-colors";
const PAGE_SIZE = 50;

type Mode = "single" | "bulk";

type RowStatus = "ready" | "duplicate" | "invalid";
interface ParsedRow {
  line: number;
  source: string;
  target: string;
  status: RowStatus;
  reason?: string;
}

const MAX_BULK = 2000;
const MAX_LEN = 500;

// Parse pasted bulk text into rows. Supports tab, "=", or comma separators
// (first match wins). Blank lines and #/// comment lines are ignored.
// De-dupes by English source keeping the LAST occurrence (matches the server).
function parseBulk(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lastIndexBySource = new Map<string, number>();
  const lines = text.split(/\r?\n/);

  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) return;
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) return;

    let source = "";
    let target = "";
    let separated = false;
    const tab = rawLine.indexOf("\t");
    if (tab >= 0) {
      source = rawLine.slice(0, tab);
      target = rawLine.slice(tab + 1);
      separated = true;
    } else {
      const eq = trimmed.indexOf("=");
      const comma = trimmed.indexOf(",");
      const at = eq >= 0 && (comma < 0 || eq < comma) ? eq : comma;
      if (at >= 0) {
        source = trimmed.slice(0, at);
        target = trimmed.slice(at + 1);
        separated = true;
      }
    }
    source = source.trim();
    target = target.trim();

    let status: RowStatus = "ready";
    let reason: string | undefined;
    if (!separated || !source || !target) {
      status = "invalid";
      reason = !separated ? "No separator (use Tab, = or ,)" : !source ? "Missing English" : "Missing Chinese";
    } else if (source.length > MAX_LEN || target.length > MAX_LEN) {
      status = "invalid";
      reason = "Too long (max 500 chars)";
    }

    const idx = rows.length;
    rows.push({ line: lineNo, source, target, status, reason });

    if (status === "ready") {
      const prev = lastIndexBySource.get(source);
      if (prev !== undefined) {
        rows[prev].status = "duplicate";
        rows[prev].reason = "Overridden by a later line";
      }
      lastIndexBySource.set(source, idx);
    }
  });

  return rows;
}

export default function TranslationsPage() {
  const [view, setView] = useState<"overrides" | "queue">("overrides");

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Languages className="w-5 h-5 text-[#94A3B8]" /> Translations
        </h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">
          Manage the Chinese names shown on the live site. Add or edit translations directly, or work
          through the queue of new team / league / country names picked up from the live feeds.
        </p>
      </div>

      {/* View toggle */}
      <div className="inline-flex p-1 bg-[#0B0F14] border border-white/8 rounded-xl">
        <button
          onClick={() => setView("overrides")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            view === "overrides" ? "bg-[#00DFA9] text-[#0B0F14]" : "text-[#94A3B8] hover:text-white",
          )}
        >
          <Languages className="w-4 h-4" /> Translations
        </button>
        <button
          onClick={() => setView("queue")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            view === "queue" ? "bg-[#00DFA9] text-[#0B0F14]" : "text-[#94A3B8] hover:text-white",
          )}
        >
          <Inbox className="w-4 h-4" /> Needs translation
        </button>
      </div>

      {view === "overrides" ? <OverridesPanel /> : <TranslationQueuePanel />}
    </div>
  );
}

function OverridesPanel() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("single");

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const [newSource, setNewSource] = useState("");
  const [newTarget, setNewTarget] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSource, setEditSource] = useState("");
  const [editTarget, setEditTarget] = useState("");

  // Bulk state
  const [bulkText, setBulkText] = useState("");
  const [overwrite, setOverwrite] = useState(false);

  const { data, isLoading } = useQuery<TranslationOverridesResponse>({
    queryKey: ["admin-translations", search, page],
    queryFn: () =>
      api.get(
        `/admin/translations?search=${encodeURIComponent(search)}&page=${page}&pageSize=${PAGE_SIZE}`,
      ),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const createMut = useMutation({
    mutationFn: (body: { source: string; target: string }) => api.post("/admin/translations", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-translations"] });
      toast.success("Translation added");
      setNewSource("");
      setNewTarget("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { source: string; target: string } }) =>
      api.patch(`/admin/translations/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-translations"] });
      toast.success("Translation updated");
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/translations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-translations"] });
      toast.success("Translation deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Bulk parsing + import ────────────────────────────────────────────────
  const parsed = useMemo(() => parseBulk(bulkText), [bulkText]);
  const readyRows = useMemo(() => parsed.filter(r => r.status === "ready"), [parsed]);
  const dupCount = parsed.filter(r => r.status === "duplicate").length;
  const invalidCount = parsed.filter(r => r.status === "invalid").length;
  const overLimit = readyRows.length > MAX_BULK;

  const bulkMut = useMutation({
    mutationFn: (body: { items: { source: string; target: string }[]; overwrite: boolean }) =>
      api.post<BulkTranslationResult>("/admin/translations/bulk", body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-translations"] });
      const parts: string[] = [];
      if (res.created) parts.push(`${res.created} added`);
      if (res.updated) parts.push(`${res.updated} updated`);
      if (res.skipped) parts.push(`${res.skipped} skipped`);
      if (res.invalid) parts.push(`${res.invalid} invalid`);
      toast.success(parts.length ? `Import complete — ${parts.join(", ")}` : "Nothing to import");
      setBulkText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleBulkImport() {
    if (readyRows.length === 0) {
      toast.error("Nothing valid to import");
      return;
    }
    if (overLimit) {
      toast.error(`Too many rows (max ${MAX_BULK} per import)`);
      return;
    }
    bulkMut.mutate({
      items: readyRows.map(({ source, target }) => ({ source, target })),
      overwrite,
    });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const source = newSource.trim();
    const target = newTarget.trim();
    if (!source || !target) {
      toast.error("Both fields are required");
      return;
    }
    createMut.mutate({ source, target });
  }

  function startEdit(row: TranslationOverride) {
    setEditingId(row.id);
    setEditSource(row.source);
    setEditTarget(row.target);
  }

  function saveEdit() {
    const source = editSource.trim();
    const target = editTarget.trim();
    if (!source || !target) {
      toast.error("Both fields are required");
      return;
    }
    updateMut.mutate({ id: editingId!, body: { source, target } });
  }

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-[#475569]">
        Add exact English words or phrases and their Chinese translations. Saved entries override the
        built-in dictionary and appear on the live site within seconds — no redeploy needed.
      </p>

      {/* Mode toggle */}
      <div className="inline-flex p-1 bg-[#0B0F14] border border-white/8 rounded-xl">
        <button
          onClick={() => setMode("single")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            mode === "single" ? "bg-[#00DFA9] text-[#0B0F14]" : "text-[#94A3B8] hover:text-white",
          )}
        >
          <Plus className="w-4 h-4" /> Add one
        </button>
        <button
          onClick={() => setMode("bulk")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            mode === "bulk" ? "bg-[#00DFA9] text-[#0B0F14]" : "text-[#94A3B8] hover:text-white",
          )}
        >
          <ClipboardPaste className="w-4 h-4" /> Bulk paste
        </button>
      </div>

      {/* Single add form */}
      {mode === "single" && (
        <form onSubmit={handleCreate} className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/8 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#00DFA9]" />
            <span className="text-sm font-semibold text-white">Add Translation</span>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">English (exact text)</label>
              <input
                className={inp}
                value={newSource}
                onChange={e => setNewSource(e.target.value)}
                placeholder="e.g. Cash Out"
                translate="no"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Chinese translation</label>
              <input
                className={inp}
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                placeholder="例如：提前结算"
                translate="no"
              />
            </div>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#00DFA9] text-[#0B0F14] hover:brightness-110 transition-all disabled:opacity-50 h-[38px]"
            >
              <Save className="w-4 h-4" /> Add
            </button>
          </div>
          <p className="px-5 pb-4 -mt-2 text-xs text-[#475569]">
            The English text must match exactly what appears on the site (case-sensitive).
          </p>
        </form>
      )}

      {/* Bulk paste */}
      {mode === "bulk" && (
        <div className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/8 flex items-center gap-2">
            <FileUp className="w-4 h-4 text-[#00DFA9]" />
            <span className="text-sm font-semibold text-white">Bulk Paste</span>
          </div>

          <div className="p-5 space-y-4">
            <div className="rounded-lg bg-[#00DFA9]/5 border border-[#00DFA9]/15 px-4 py-3 text-xs leading-relaxed text-[#C4D4E3]">
              <p>Add lots of translations at once instead of one by one.</p>
              <p>Put one per line: the English text, then its Chinese, like <span className="text-white font-medium" translate="no">Cash Out = 提前结算</span>.</p>
              <p>Check the preview below, then click Import — that’s it.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Paste one translation per line — English then Chinese, separated by a Tab, = or comma.
              </label>
              <textarea
                className={cn(inp, "font-mono text-xs leading-relaxed min-h-[180px] resize-y")}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={"Cash Out = 提前结算\nLive = 滚球\nSettled = 已结算\n# lines starting with # are ignored"}
                spellCheck={false}
              />
              <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-[#475569]">
                  You can paste two columns straight from a spreadsheet. English keys are case-sensitive.
                </p>
                {bulkText.trim() && (
                  <button
                    type="button"
                    onClick={() => setBulkText("")}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-white transition-colors"
                  >
                    <Eraser className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Summary + preview */}
            {parsed.length > 0 && (
              <>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00DFA9]/10 text-[#00DFA9] font-semibold">
                    <ListChecks className="w-3.5 h-3.5" /> {readyRows.length} ready
                  </span>
                  {dupCount > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FACC15]/10 text-[#FACC15] font-semibold">
                      <CopyCheck className="w-3.5 h-3.5" /> {dupCount} duplicate{dupCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EF4444]/10 text-[#EF4444] font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" /> {invalidCount} invalid
                    </span>
                  )}
                </div>

                <div className="border border-white/8 rounded-lg overflow-hidden max-h-[320px] overflow-y-auto" translate="no">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#0B0F14] text-[#475569]">
                      <tr className="text-left text-xs">
                        <th className="px-3 py-2 font-medium w-10">#</th>
                        <th className="px-3 py-2 font-medium">English</th>
                        <th className="px-3 py-2 font-medium">Chinese</th>
                        <th className="px-3 py-2 font-medium w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsed.map((r, i) => (
                        <tr
                          key={i}
                          className={cn(
                            r.status === "invalid" && "bg-[#EF4444]/5",
                            r.status === "duplicate" && "bg-[#FACC15]/5",
                          )}
                        >
                          <td className="px-3 py-2 text-[#475569] text-xs">{r.line}</td>
                          <td className="px-3 py-2 text-[#C4D4E3] truncate max-w-[180px]" title={r.source}>
                            {r.source || <span className="text-[#475569] italic">—</span>}
                          </td>
                          <td className="px-3 py-2 text-white truncate max-w-[180px]" title={r.target}>
                            {r.target || <span className="text-[#475569] italic">—</span>}
                          </td>
                          <td className="px-3 py-2">
                            {r.status === "ready" && (
                              <span className="text-xs font-medium text-[#00DFA9]">Ready</span>
                            )}
                            {r.status === "duplicate" && (
                              <span className="text-xs font-medium text-[#FACC15]" title={r.reason}>Duplicate</span>
                            )}
                            {r.status === "invalid" && (
                              <span className="text-xs font-medium text-[#EF4444]" title={r.reason}>{r.reason ?? "Invalid"}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {overLimit && (
                  <p className="text-xs text-[#EF4444]">
                    Too many rows ({readyRows.length}). Import at most {MAX_BULK} at a time.
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={overwrite}
                      onChange={e => setOverwrite(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 accent-[#00DFA9]"
                    />
                    <span className="text-sm text-[#C4D4E3]">Overwrite existing translations</span>
                    <span className="text-xs text-[#475569]">
                      {overwrite ? "(matching entries will be updated)" : "(matching entries are skipped)"}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    disabled={bulkMut.isPending || readyRows.length === 0 || overLimit}
                    className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-[#00DFA9] text-[#0B0F14] hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {bulkMut.isPending ? "Importing…" : `Import ${readyRows.length} translation${readyRows.length === 1 ? "" : "s"}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <form onSubmit={applySearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
          <input
            className={cn(inp, "pl-9")}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search translations…"
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-[#C4D4E3] hover:bg-white/10 transition-colors">
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
            className="px-3 py-2 rounded-lg text-sm font-medium text-[#475569] hover:text-white transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* List */}
      <div className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/8 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Existing Translations</span>
          <span className="text-xs text-[#475569]">{total} total</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[#475569] text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-[#475569] text-sm">
            {search ? "No translations match your search." : "No translations yet. Add one above."}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map(row => (
              <div key={row.id} className="px-5 py-3 flex items-center gap-3" translate="no">
                {editingId === row.id ? (
                  <>
                    <input
                      className={cn(inp, "flex-1")}
                      value={editSource}
                      onChange={e => setEditSource(e.target.value)}
                    />
                    <span className="text-[#475569]">→</span>
                    <input
                      className={cn(inp, "flex-1")}
                      value={editTarget}
                      onChange={e => setEditTarget(e.target.value)}
                    />
                    <button
                      onClick={saveEdit}
                      disabled={updateMut.isPending}
                      className="p-2 rounded-lg text-[#00DFA9] hover:bg-[#00DFA9]/10 transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 rounded-lg text-[#475569] hover:text-white hover:bg-white/5 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-[#C4D4E3] truncate" title={row.source}>{row.source}</span>
                    <span className="text-[#475569]">→</span>
                    <span className="flex-1 text-sm text-white truncate" title={row.target}>{row.target}</span>
                    <button
                      onClick={() => startEdit(row)}
                      className="p-2 rounded-lg text-[#64748B] hover:text-[#38BDF8] hover:bg-white/5 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete the translation for "${row.source}"?`)) deleteMut.mutate(row.id); }}
                      className="p-2 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/8 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-[#C4D4E3] hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-[#475569]">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-[#C4D4E3] hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── "Needs translation" queue ───────────────────────────────────────────────
// Names auto-collected from the live feeds that have no Chinese override yet.
// Translate a row to promote it into a live override; ignore the ones you don't
// want surfaced (e.g. already-Chinese or junk strings).

const QUEUE_PAGE_SIZE = 50;
type QueueStatus = "pending" | "translated" | "ignored";
type QueueSort = "frequency" | "recent";

const CATEGORY_LABEL: Record<string, string> = {
  team: "Team",
  league: "League",
  country: "Country",
  player: "Player",
};

function TranslationQueuePanel() {
  const qc = useQueryClient();

  const [status, setStatus] = useState<QueueStatus>("pending");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<QueueSort>("frequency");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  // Per-row Chinese drafts + selected rows for bulk ignore.
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // "Translate selected" focused panel.
  const [bulkTranslateOpen, setBulkTranslateOpen] = useState(false);

  // Selection is scoped to the page/filters currently in view, so the count in
  // the selection bar can never diverge from the rows the bulk actions operate
  // on. Reset it whenever the visible set changes.
  useEffect(() => {
    setSelected(new Set());
  }, [page, category, search, sort, status]);

  const { data, isLoading } = useQuery<TranslationQueueResponse>({
    queryKey: ["admin-translation-queue", status, category, sort, search, page],
    queryFn: () =>
      api.get(
        `/admin/translation-queue?status=${status}&category=${encodeURIComponent(category)}` +
          `&sort=${sort}&search=${encodeURIComponent(search)}&page=${page}&pageSize=${QUEUE_PAGE_SIZE}`,
      ),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const counts = data?.counts ?? { pending: 0, translated: 0, ignored: 0 };
  const totalPages = Math.max(1, Math.ceil(total / QUEUE_PAGE_SIZE));

  // Drop any selected ids that are no longer in the visible rows (e.g. after a
  // per-row resolve/ignore removes them) so the count and bulk actions never
  // reference rows that aren't on screen.
  const visibleIdsKey = rows.map(r => r.id).join(",");
  useEffect(() => {
    setSelected(prev => {
      if (prev.size === 0) return prev;
      const visible = new Set(rows.map(r => r.id));
      let changed = false;
      const next = new Set<number>();
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIdsKey]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-translation-queue"] });
    qc.invalidateQueries({ queryKey: ["admin-translations"] });
  }

  const resolveMut = useMutation({
    mutationFn: ({ id, target }: { id: number; target: string }) =>
      api.post(`/admin/translation-queue/${id}/resolve`, { target }),
    onSuccess: (_res, vars) => {
      invalidate();
      toast.success("Translation saved");
      setDrafts(d => { const n = { ...d }; delete n[vars.id]; return n; });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ignoreMut = useMutation({
    mutationFn: (id: number) => api.post(`/admin/translation-queue/${id}/ignore`, {}),
    onSuccess: () => { invalidate(); toast.success("Ignored"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkIgnoreMut = useMutation({
    mutationFn: (ids: number[]) => api.post<{ ignored: number }>("/admin/translation-queue/bulk-ignore", { ids }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.ignored} ignored`);
      setSelected(new Set());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkResolveMut = useMutation({
    mutationFn: (items: { id: number; target: string }[]) =>
      api.post<BulkResolveResult>("/admin/translation-queue/bulk-resolve", { items }),
    onSuccess: (res, items) => {
      invalidate();
      const parts: string[] = [];
      if (res.saved) parts.push(`${res.saved} saved`);
      if (res.existed) parts.push(`${res.existed} already existed`);
      if (res.notFound) parts.push(`${res.notFound} not found`);
      toast.success(parts.length ? parts.join(", ") : "Nothing saved");
      // Drop the drafts we just submitted.
      setDrafts(d => {
        const n = { ...d };
        for (const it of items) delete n[it.id];
        return n;
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Rows on this page that have a non-empty Chinese draft, ready to bulk-save.
  const filledItems = useMemo(
    () =>
      rows
        .map(r => ({ id: r.id, target: (drafts[r.id] ?? "").trim() }))
        .filter(it => it.target),
    [rows, drafts],
  );

  function handleSaveAllFilled() {
    if (filledItems.length === 0) {
      toast.error("Fill in at least one Chinese translation first");
      return;
    }
    bulkResolveMut.mutate(filledItems);
  }

  // Selected rows visible on the current page — the names shown in the
  // "Translate selected" panel.
  const selectedRows = useMemo(
    () => rows.filter(r => selected.has(r.id)),
    [rows, selected],
  );

  const selectedFilledCount = useMemo(
    () => selectedRows.reduce((n, r) => n + ((drafts[r.id] ?? "").trim() ? 1 : 0), 0),
    [selectedRows, drafts],
  );

  function handleBulkTranslateSave() {
    const items = selectedRows
      .map(r => ({ id: r.id, target: (drafts[r.id] ?? "").trim() }))
      .filter(it => it.target);
    if (items.length === 0) {
      toast.error("Fill in at least one Chinese translation first");
      return;
    }
    bulkResolveMut.mutate(items, {
      onSuccess: () => {
        setBulkTranslateOpen(false);
        // Deselect only the rows we actually submitted; leave any still-empty
        // ticked rows selected so they aren't silently dropped.
        setSelected(prev => {
          const n = new Set(prev);
          for (const it of items) n.delete(it.id);
          return n;
        });
      },
    });
  }

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function changeStatus(s: QueueStatus) {
    setStatus(s);
    setPage(1);
    setSelected(new Set());
  }

  function toggleSelect(id: number) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    setSelected(prev => {
      const allSelected = rows.length > 0 && rows.every(r => prev.has(r.id));
      return allSelected ? new Set() : new Set(rows.map(r => r.id));
    });
  }

  function handleResolve(row: TranslationQueueRow) {
    const target = (drafts[row.id] ?? "").trim();
    if (!target) { toast.error("Enter a Chinese translation first"); return; }
    resolveMut.mutate({ id: row.id, target });
  }

  const statusTabs: { key: QueueStatus; label: string; n: number }[] = [
    { key: "pending", label: "Pending", n: counts.pending },
    { key: "translated", label: "Translated", n: counts.translated },
    { key: "ignored", label: "Ignored", n: counts.ignored },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-[#00DFA9]/5 border border-[#00DFA9]/15 px-4 py-3 text-xs leading-relaxed text-[#C4D4E3]">
        These are new team, league and country names pulled from the live feeds that don’t have a Chinese
        translation yet — most-seen first. Type the Chinese and hit save to make it appear on the live site,
        or ignore the ones you don’t need. Fill in several rows and use “Save all” to publish them together.
      </div>

      {/* Status tabs */}
      <div className="inline-flex p-1 bg-[#0B0F14] border border-white/8 rounded-xl">
        {statusTabs.map(t => (
          <button
            key={t.key}
            onClick={() => changeStatus(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              status === t.key ? "bg-[#00DFA9] text-[#0B0F14]" : "text-[#94A3B8] hover:text-white",
            )}
          >
            {t.label}
            <span className={cn(
              "px-1.5 py-0.5 rounded-md text-[11px] font-bold",
              status === t.key ? "bg-[#0B0F14]/20 text-[#0B0F14]" : "bg-white/8 text-[#94A3B8]",
            )}>
              {t.n}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <form onSubmit={applySearch} className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
            <input
              className={cn(inp, "pl-9")}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search names…"
            />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-[#C4D4E3] hover:bg-white/10 transition-colors">
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#475569] hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </form>

        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1); }}
          className={cn(inp, "w-auto")}
        >
          <option value="">All types</option>
          <option value="team">Teams</option>
          <option value="league">Leagues</option>
          <option value="country">Countries</option>
          <option value="player">Players</option>
        </select>

        <button
          type="button"
          onClick={() => { setSort(s => (s === "frequency" ? "recent" : "frequency")); setPage(1); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 text-[#C4D4E3] hover:bg-white/10 transition-colors"
          title="Toggle sort order"
        >
          {sort === "frequency" ? <><Flame className="w-4 h-4 text-[#FACC15]" /> Most seen</> : <><Clock className="w-4 h-4 text-[#38BDF8]" /> Recent</>}
        </button>
      </div>

      {/* Bulk save bar (pending only) — save every row you've typed Chinese into. */}
      {status === "pending" && filledItems.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[#00DFA9]/5 border border-[#00DFA9]/15">
          <span className="text-sm text-[#C4D4E3]">
            {filledItems.length} ready to save
          </span>
          <button
            type="button"
            onClick={handleSaveAllFilled}
            disabled={bulkResolveMut.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#00DFA9] text-[#0B0F14] hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {bulkResolveMut.isPending ? "Saving…" : `Save all on page (${filledItems.length})`}
          </button>
        </div>
      )}

      {/* Selection bar (pending only) — translate or ignore the rows you ticked. */}
      {status === "pending" && selectedRows.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[#FACC15]/5 border border-[#FACC15]/15">
          <span className="text-sm text-[#C4D4E3]">{selectedRows.length} selected on this page</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkTranslateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#00DFA9] text-[#0B0F14] hover:brightness-110 transition-all"
            >
              <Languages className="w-4 h-4" /> Translate selected
            </button>
            <button
              type="button"
              onClick={() => bulkIgnoreMut.mutate(selectedRows.map(r => r.id))}
              disabled={bulkIgnoreMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-[#C4D4E3] hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <EyeOff className="w-4 h-4" /> Ignore selected
            </button>
          </div>
        </div>
      )}

      {/* "Translate selected" panel — translate every ticked name together. */}
      {bulkTranslateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => { if (!bulkResolveMut.isPending) setBulkTranslateOpen(false); }}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#111827] border border-white/10 rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
            translate="no"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-[#00DFA9]" />
                <h3 className="text-base font-semibold text-white">
                  Translate {selectedRows.length} {selectedRows.length === 1 ? "name" : "names"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBulkTranslateOpen(false)}
                disabled={bulkResolveMut.isPending}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            {selectedRows.length === 0 ? (
              <div className="p-8 text-center text-[#475569] text-sm">
                No selected names on this page. Tick some pending names first.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {selectedRows.map((row, idx) => (
                  <div key={row.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#C4D4E3] truncate" title={row.source}>{row.source}</span>
                        <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-white/5 text-[#94A3B8]">
                          {CATEGORY_LABEL[row.category] ?? row.category}
                        </span>
                      </div>
                      {row.context && (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#64748B] truncate" title={`Appears in ${row.context}`}>
                          <MapPin className="w-3 h-3 shrink-0 text-[#475569]" />
                          <span className="truncate">{row.context}</span>
                        </div>
                      )}
                    </div>
                    <input
                      className={cn(inp, "flex-1 max-w-[260px]")}
                      value={drafts[row.id] ?? ""}
                      onChange={e => setDrafts(d => ({ ...d, [row.id]: e.target.value }))}
                      placeholder="中文翻译"
                      autoFocus={idx === 0}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/8">
              <span className="text-xs text-[#475569]">
                {selectedFilledCount} of {selectedRows.length} filled in
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkTranslateOpen(false)}
                  disabled={bulkResolveMut.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-[#C4D4E3] hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkTranslateSave}
                  disabled={bulkResolveMut.isPending || selectedFilledCount === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#00DFA9] text-[#0B0F14] hover:brightness-110 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {bulkResolveMut.isPending ? "Saving…" : `Save all (${selectedFilledCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status === "pending" && rows.length > 0 && (
              <input
                type="checkbox"
                checked={rows.every(r => selected.has(r.id))}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-white/20 bg-white/5 accent-[#00DFA9]"
                title="Select all on this page"
              />
            )}
            <span className="text-sm font-semibold text-white">
              {status === "pending" ? "Pending names" : status === "translated" ? "Translated" : "Ignored"}
            </span>
          </div>
          <span className="text-xs text-[#475569]">{total} total</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[#475569] text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-[#475569] text-sm">
            {status === "pending"
              ? (search ? "No names match your search." : "Nothing to translate — the queue is empty. New names appear here automatically as matches are fetched.")
              : "Nothing here yet."}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map(row => (
              <div key={row.id} className="px-5 py-3 flex items-center gap-3" translate="no">
                {status === "pending" && (
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 accent-[#00DFA9] shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#C4D4E3] truncate" title={row.source}>{row.source}</span>
                    <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-white/5 text-[#94A3B8]">
                      {CATEGORY_LABEL[row.category] ?? row.category}
                    </span>
                    <span className="shrink-0 flex items-center gap-1 text-[10px] text-[#475569]" title={`Seen ${row.seenCount} time(s)`}>
                      <Flame className="w-3 h-3" /> {row.seenCount}
                    </span>
                  </div>
                  {row.context && (
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#64748B] truncate" title={`Appears in ${row.context}`}>
                      <MapPin className="w-3 h-3 shrink-0 text-[#475569]" />
                      <span className="truncate">{row.context}</span>
                    </div>
                  )}
                </div>

                {status === "pending" ? (
                  <>
                    <input
                      className={cn(inp, "flex-1 max-w-[220px]")}
                      value={drafts[row.id] ?? ""}
                      onChange={e => setDrafts(d => ({ ...d, [row.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") handleResolve(row); }}
                      placeholder="中文翻译"
                    />
                    <button
                      onClick={() => handleResolve(row)}
                      disabled={resolveMut.isPending}
                      className="p-2 rounded-lg text-[#00DFA9] hover:bg-[#00DFA9]/10 transition-colors disabled:opacity-50"
                      title="Save translation"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => ignoreMut.mutate(row.id)}
                      disabled={ignoreMut.isPending}
                      className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                      title="Ignore"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </>
                ) : status === "translated" ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[#00DFA9] shrink-0">
                    <CheckCheck className="w-4 h-4" /> Translated
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[#475569] shrink-0">
                    <EyeOff className="w-4 h-4" /> Ignored
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-[#C4D4E3] hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-[#475569]">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-[#C4D4E3] hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
