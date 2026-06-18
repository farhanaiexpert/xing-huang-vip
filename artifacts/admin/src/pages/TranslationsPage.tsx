import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, TranslationOverride, TranslationOverridesResponse } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Languages, Plus, Search, Save, Trash2, Pencil, X, Check } from "lucide-react";

const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] transition-colors";
const PAGE_SIZE = 50;

export default function TranslationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const [newSource, setNewSource] = useState("");
  const [newTarget, setNewTarget] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSource, setEditSource] = useState("");
  const [editTarget, setEditTarget] = useState("");

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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Languages className="w-5 h-5 text-[#94A3B8]" /> Translations
        </h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">
          Add an exact English word or phrase and its Chinese translation. Saved entries override the
          built-in dictionary and appear on the live site within seconds — no redeploy needed.
        </p>
      </div>

      {/* Add form */}
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
