"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { Plus, Pencil, Trash2, Upload, History, Search, Loader2, Download, File } from "lucide-react";

interface Standard {
  id: number; standard_no: string; description: string | null;
  rev_number: string | null; rev_date: string | null; comment: string | null;
  file_path: string | null; category: string;
  version: number; is_latest: number; created_by: string; created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_URL || "";
const getFileUrl = (p: string) => p?.startsWith("http") ? p : `${API_BASE}/${p?.replace(/\\/g, "/")}`;
const fmtDate = (d: string | null) => !d ? "—" : new Date(d).toLocaleDateString("en-IN");

const TAB_COLORS = [
  { active: "bg-orange-600 text-white", badge: "bg-white/30" },
  { active: "bg-blue-600 text-white",   badge: "bg-white/30" },
  { active: "bg-emerald-600 text-white",badge: "bg-white/30" },
  { active: "bg-purple-600 text-white", badge: "bg-white/30" },
  { active: "bg-rose-600 text-white",   badge: "bg-white/30" },
];

function FileLink({ path }: { path: string | null }) {
  if (!path) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <a href={getFileUrl(path)} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors">
      <File className="w-3.5 h-3.5" />View
    </a>
  );
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────
function StandardModal({ open, onClose, editStandard, onSaved, categories }: {
  open: boolean; onClose: () => void; editStandard: Standard | null; onSaved: () => void; categories: string[];
}) {
  const [form, setForm] = useState({ standard_no: "", description: "", rev_number: "", rev_date: "", comment: "", category: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const isEdit = !!editStandard;

  useEffect(() => {
    const defaultCat = categories[0] || "MANUAL";
    if (editStandard) {
      setForm({ standard_no: editStandard.standard_no, description: editStandard.description || "", rev_number: editStandard.rev_number || "", rev_date: editStandard.rev_date || "", comment: editStandard.comment || "", category: editStandard.category });
    } else {
      setForm({ standard_no: "", description: "", rev_number: "", rev_date: "", comment: "", category: defaultCat });
    }
    setFile(null);
  }, [editStandard, open, categories]);

  const handleSave = async () => {
    if (!form.standard_no.trim()) return toast.error("Standard No is required");
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/standards/${editStandard!.id}`, form);
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        if (file) fd.append("file", file);
        await api.post("/standards", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success(isEdit ? "Updated" : "Standard added"); onSaved(); onClose();
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-xl">
        <DialogTitle>{isEdit ? "Edit Standard" : "Add Standard"}</DialogTitle>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Standard No *</label>
            <Input value={form.standard_no} onChange={e => setForm(f => ({ ...f, standard_no: e.target.value }))} className="mt-1" disabled={isEdit} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-background">
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-muted-foreground">Description</label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Rev Number</label>
            <Input value={form.rev_number} onChange={e => setForm(f => ({ ...f, rev_number: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Rev Date</label>
            <Input type="date" value={form.rev_date} onChange={e => setForm(f => ({ ...f, rev_date: e.target.value }))} className="mt-1" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-muted-foreground">Comment</label>
            <Input value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} className="mt-1" />
          </div>
          {!isEdit && (
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">File (optional)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 block text-sm" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{isEdit ? "Save" : "Add"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewVersionModal({ standard, onClose, onSaved }: { standard: Standard | null; onClose: () => void; onSaved: () => void; }) {
  const [revNo, setRevNo] = useState(""); const [revDate, setRevDate] = useState(new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState(""); const [file, setFile] = useState<File | null>(null); const [saving, setSaving] = useState(false);
  useEffect(() => { if (standard) { setRevNo(standard.rev_number || ""); setComment(standard.comment || ""); } setFile(null); }, [standard]);
  const handleSave = async () => {
    if (!file) return toast.error("Please select a file");
    setSaving(true);
    try { const fd = new FormData(); fd.append("rev_number", revNo); fd.append("rev_date", revDate); fd.append("comment", comment); fd.append("file", file); await api.post(`/standards/${standard!.id}/new-version`, fd, { headers: { "Content-Type": "multipart/form-data" } }); toast.success("New version uploaded"); onSaved(); onClose(); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); }
  };
  return (
    <Dialog open={!!standard} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-md">
        <DialogTitle>Upload New Version — {standard?.standard_no}</DialogTitle>
        <div className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-muted-foreground">Rev Number</label><Input value={revNo} onChange={e => setRevNo(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground">Rev Date</label><Input type="date" value={revDate} onChange={e => setRevDate(e.target.value)} className="mt-1" /></div>
          </div>
          <div><label className="text-xs font-semibold text-muted-foreground">Comment</label><Input value={comment} onChange={e => setComment(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">File *</label><input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 block text-sm" /></div>
          <div className="flex justify-end gap-2 pt-1"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Upload</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VersionsModal({ standardId, onClose }: { standardId: number | null; onClose: () => void; }) {
  const [versions, setVersions] = useState<Standard[]>([]); const [loading, setLoading] = useState(false);
  useEffect(() => { if (!standardId) return; setLoading(true); api.get(`/standards/${standardId}/versions`).then(r => setVersions(r.data.data || [])).catch(() => toast.error("Failed")).finally(() => setLoading(false)); }, [standardId]);
  return (
    <Dialog open={!!standardId} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-xl max-h-[80vh] flex flex-col">
        <DialogTitle>Version History</DialogTitle>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
          <div className="flex-1 overflow-y-auto space-y-2 mt-2">
            {versions.map(v => (
              <div key={v.id} className={`flex items-center justify-between p-3 rounded-xl border ${v.is_latest ? "bg-emerald-50 border-emerald-200" : "bg-muted/30"}`}>
                <div><p className="text-sm font-semibold">v{v.version} — Rev: {v.rev_number || "#"}</p><p className="text-xs text-muted-foreground">{fmtDate(v.rev_date)} · Added {fmtDate(v.created_at)}</p></div>
                <div className="flex gap-2 items-center">
                  {v.is_latest && <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Latest</Badge>}
                  <FileLink path={v.file_path} />
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function exportCSV(data: Standard[], category: string) {
  const headers = ["SR No.", "Standard No.", "Description", "Category", "Rev Number", "Rev Date", "Comment", "Document", "Version"];
  const rows = data.map((s, i) => [i + 1, s.standard_no, s.description || "", s.category, s.rev_number || "", fmtDate(s.rev_date), s.comment || "", s.file_path ? getFileUrl(s.file_path) : "", s.version]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `standards_${category.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
}

export default function StandardsPage() {
  const { user } = useUser();
  const isAdmin = ["admin", "super admin"].includes(user?.role || "");
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [categories, setCategories] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editStandard, setEditStandard] = useState<Standard | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newVerStandard, setNewVerStandard] = useState<Standard | null>(null);
  const [versionsId, setVersionsId] = useState<number | null>(null);

  const fetchStandards = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get("/standards"); setStandards(res.data.data || []); }
    catch { toast.error("Failed to load standards"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStandards(); }, [fetchStandards]);

  useEffect(() => {
    api.get("/dynamic-fields").then(r => {
      const names: string[] = r.data.data?.standard_names || [];
      setCategories(names);
    }).catch(() => {});
  }, []);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return toast.error("Category name is required");
    try {
      await api.post("/dynamic-fields/standard-names", { names: [newCategoryName.trim()] });
      toast.success("Category added");
      setCategories([...categories, newCategoryName.trim()]);
      setIsAddCategoryOpen(false);
      setNewCategoryName("");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to add category");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this standard?")) return;
    try { await api.delete(`/standards/${id}`); toast.success("Deleted"); fetchStandards(); }
    catch { toast.error("Delete failed"); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return standards.filter(s => {
      const matchSearch = !q || (s.standard_no || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
      const matchTab = activeTab === "ALL" || s.category === activeTab;
      return matchSearch && matchTab;
    });
  }, [standards, search, activeTab]);

  const tabs = useMemo(() => {
    const fromData = Array.from(new Set(standards.map(s => s.category)));
    const ordered = categories.length > 0
      ? [...categories.filter(n => fromData.includes(n)), ...fromData.filter(n => !categories.includes(n))]
      : fromData;
    return ["ALL", ...ordered];
  }, [standards, categories]);

  const tabCount = useMemo(() => {
    const map: Record<string, number> = { ALL: standards.length };
    standards.forEach(s => { map[s.category] = (map[s.category] || 0) + 1; });
    return map;
  }, [standards]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Standards</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Grouped by category · Always shows latest revision</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search standard no. or description..." className="pl-9 h-9 w-64 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => exportCSV(filtered, activeTab)}>
              <Download className="w-3.5 h-3.5" />Export CSV
            </Button>
            {isAdmin && <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={() => setIsAddCategoryOpen(true)}><Plus className="w-3.5 h-3.5" />Add Category</Button>}
            {isAdmin && <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5" />Add Standard</Button>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap border-b">
          {tabs.map((tab, idx) => {
            const colorIdx = idx === 0 ? 0 : (idx - 1) % TAB_COLORS.length;
            const color = TAB_COLORS[colorIdx];
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all -mb-px ${isActive ? color.active + " border border-b-0 shadow-sm" : "bg-background border-transparent text-muted-foreground hover:text-foreground border"}`}>
                {tab} <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? color.badge : "bg-muted"}`}>{tabCount[tab] || 0}</span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" />Loading standards...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground text-sm">No standards found. {isAdmin && <button className="text-primary underline ml-1" onClick={() => setAddOpen(true)}>Add the first one.</button>}</div>
        ) : (
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-10">SR</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Standard No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Rev No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Rev Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Comment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Document</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Ver.</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id} className={`border-b transition-colors ${i % 2 === 0 ? "bg-white" : "bg-muted/20"} hover:bg-orange-50/40`}>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{s.standard_no}</td>
                      <td className="px-4 py-3 text-xs max-w-[200px] truncate">{s.description || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="bg-orange-50 text-orange-700 border border-orange-100 rounded px-2 py-0.5 font-medium">{s.category}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">{s.rev_number || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(s.rev_date)}</td>
                      <td className="px-4 py-3 text-xs max-w-[160px] truncate text-muted-foreground">{s.comment || "—"}</td>
                      <td className="px-4 py-3"><FileLink path={s.file_path} /></td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">v{s.version}</Badge></td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditStandard(s)} className="w-7 h-7 flex items-center justify-center rounded bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setNewVerStandard(s)} className="w-7 h-7 flex items-center justify-center rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors" title="New version"><Upload className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setVersionsId(s.id)} className="w-7 h-7 flex items-center justify-center rounded bg-violet-50 hover:bg-violet-100 text-violet-600 transition-colors" title="History"><History className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDelete(s.id)} className="w-7 h-7 flex items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
              Showing {filtered.length} of {standards.length} standards
            </div>
          </div>
        )}
      </div>

      <StandardModal open={addOpen} onClose={() => setAddOpen(false)} editStandard={null} onSaved={fetchStandards} categories={categories} />
      <StandardModal open={!!editStandard} onClose={() => setEditStandard(null)} editStandard={editStandard} onSaved={fetchStandards} categories={categories} />
      <NewVersionModal standard={newVerStandard} onClose={() => setNewVerStandard(null)} onSaved={fetchStandards} />
      <VersionsModal standardId={versionsId} onClose={() => setVersionsId(null)} />
      
      <Dialog open={isAddCategoryOpen} onOpenChange={o => !o && setIsAddCategoryOpen(false)}>
        <DialogContent className="!max-w-md">
          <DialogTitle>Add New Category</DialogTitle>
          <div className="space-y-3 mt-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Category Name</label>
              <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
              <Button onClick={handleAddCategory}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
