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
import {
  Plus, Eye, Pencil, Trash2, Upload, History, Search,
  Loader2, X, Download, FileText, File as FileIcon
} from "lucide-react";

interface Drawing {
  id: number; drawing_number: string; serial_number: string | null; shaft: string | null; joint: string | null;
  part_number: string | null; customer: string | null; modification_number: string | null;
  modification_date: string | null; bom: string | null; file_path: string | null;
  version: number; is_latest: number; remarks: string | null; created_by: string; created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_URL || "";
const getFileUrl = (p: string) => p?.startsWith("http") ? p : `${API_BASE}/${p?.replace(/\\/g, "/")}`;
const fmtDate = (d: string | null) => !d ? "—" : new Date(d).toLocaleDateString("en-IN");

const getCustomerPrefix = (customer: string | null) => {
  if (!customer) return "";
  const c = customer.toUpperCase().trim();
  const words = c.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 1);
  } else {
    return words.map(w => w[0]).join("");
  }
};

const TAB_COLORS = [
  { active: "bg-blue-600 text-white border-blue-600", inactive: "text-blue-700 border-blue-200 hover:bg-blue-50" },
  { active: "bg-emerald-600 text-white border-emerald-600", inactive: "text-emerald-700 border-emerald-200 hover:bg-emerald-50" },
  { active: "bg-violet-600 text-white border-violet-600", inactive: "text-violet-700 border-violet-200 hover:bg-violet-50" },
  { active: "bg-orange-600 text-white border-orange-600", inactive: "text-orange-700 border-orange-200 hover:bg-orange-50" },
  { active: "bg-rose-600 text-white border-rose-600", inactive: "text-rose-700 border-rose-200 hover:bg-rose-50" },
  { active: "bg-teal-600 text-white border-teal-600", inactive: "text-teal-700 border-teal-200 hover:bg-teal-50" },
];

// ── File Icon Link ────────────────────────────────────────────────────────────
function FileLink({ path, label }: { path: string | null; label: string }) {
  if (!path) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <a href={getFileUrl(path)} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors text-xs font-medium">
      <FileIcon className="w-3.5 h-3.5" />
      {label}
    </a>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function DrawingModal({ open, onClose, editDrawing, onSaved, customerNames }: {
  open: boolean; onClose: () => void; editDrawing: Drawing | null; onSaved: () => void; customerNames: string[];
}) {
  const [form, setForm] = useState({ drawing_number: "", shaft: "", joint: "", customer: "", modification_number: "", remarks: "" });
  const [partNumbers, setPartNumbers] = useState<string[]>([""]);
  const [file, setFile] = useState<File | null>(null);
  const [bomFile, setBomFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const isEdit = !!editDrawing;
  const isRSB = form.customer?.toUpperCase() === "RSB";

  useEffect(() => {
    if (editDrawing) {
      setForm({ drawing_number: editDrawing.drawing_number, shaft: editDrawing.shaft || "", joint: editDrawing.joint || "", customer: editDrawing.customer || "", modification_number: editDrawing.modification_number || "", remarks: editDrawing.remarks || "" });
      // Split existing comma-separated part numbers into individual fields
      const parts = editDrawing.part_number ? editDrawing.part_number.split(",").map(p => p.trim()) : [""];
      setPartNumbers(parts.length > 0 ? parts : [""]);
    } else {
      setForm({ drawing_number: "", shaft: "", joint: "", customer: customerNames[0] || "", modification_number: "", remarks: "" });
      setPartNumbers([""]);
    }
    setFile(null); setBomFile(null);
  }, [editDrawing, open, customerNames]);

  const handlePartNumberChange = (index: number, value: string) => {
    setPartNumbers(prev => prev.map((p, i) => i === index ? value : p));
  };

  const addPartNumber = () => {
    setPartNumbers(prev => [...prev, ""]);
  };

  const removePartNumber = (index: number) => {
    if (partNumbers.length === 1) return; // Keep at least one
    setPartNumbers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!form.drawing_number.trim()) return toast.error("Drawing number is required");
    setSaving(true);
    setProgress(0);

    try {
      let finalFilePath = null;
      let finalBomPath = null;

      // Chunked Upload for main Drawing file
      if (file) {
        const chunkSize = 5 * 1024 * 1024; // 5MB
        const totalChunks = Math.ceil(file.size / chunkSize);
        const uploadId = Date.now().toString() + Math.random().toString(36).substring(2);

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          // Wrap Blob slice as a proper File so multer sees it as a file field
          const chunkFile = new File([file.slice(start, end)], file.name, { type: file.type });
          const fd = new FormData();
          fd.append("uploadId", uploadId);
          fd.append("chunkIndex", i.toString());
          fd.append("totalChunks", totalChunks.toString());
          fd.append("fileName", file.name);
          fd.append("chunk", chunkFile);

          const res = await api.post(
            `/drawings/upload-chunk?uploadId=${uploadId}&chunkIndex=${i}`,
            fd,
            { headers: { "Content-Type": undefined } }  // let axios set multipart boundary
          );
          if (res.data.file_path) finalFilePath = res.data.file_path;
          setProgress(Math.round(((i + 1) / totalChunks) * 100));
        }
      }

      // Regular upload for BOM (usually small, so keep it simple or implement same if needed)
      // For now, if it's small, we can send it in the final request.
      // But let's use the standard way.

      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const partNumberValue = partNumbers.filter(p => p.trim()).join(", ");
      fd.append("part_number", partNumberValue);
      
      if (finalFilePath) fd.append("file_path_from_chunks", finalFilePath);
      else if (file) fd.append("file", file); // fallback if small

      if (bomFile) fd.append("bom_file", bomFile);

      if (isEdit) {
        await api.put(`/drawings/${editDrawing!.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.post("/drawings", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success(isEdit ? "Updated" : "Drawing added"); onSaved(); onClose();
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setSaving(false); setProgress(0); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>{isEdit ? "Edit Drawing" : "Add Drawing"}</DialogTitle>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Drawing Number *</label>
            <Input value={form.drawing_number} onChange={e => setForm(f => ({ ...f, drawing_number: e.target.value }))} className="mt-1" disabled={isEdit} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Customer</label>
            <select value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-background">
              {customerNames.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Description (Shaft)</label>
            <Input value={form.shaft} onChange={e => setForm(f => ({ ...f, shaft: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Joint</label>
            <Input value={form.joint} onChange={e => setForm(f => ({ ...f, joint: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Modification Number</label>
            <Input value={form.modification_number} onChange={e => setForm(f => ({ ...f, modification_number: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Remarks</label>
            <Input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className="mt-1" />
          </div>

          {/* Part Numbers Section */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-muted-foreground">Part Number(s)</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPartNumber}
                className="h-6 px-2 text-xs gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {partNumbers.map((part, index) => (
                <div key={index} className="flex items-center gap-1">
                  <Input
                    value={part}
                    onChange={e => handlePartNumberChange(index, e.target.value)}
                    placeholder={`Part #${index + 1}`}
                    className="flex-1"
                  />
                  {partNumbers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePartNumber(index)}
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">{isRSB ? "Drawing File" : "Drawing File"}</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 block text-sm w-full" />
            {saving && progress > 0 && <div className="h-1 bg-muted mt-1 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>}
          </div>
          {!isRSB && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">BOM File</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={e => setBomFile(e.target.files?.[0] || null)} className="mt-1 block text-sm w-full" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{saving && progress > 0 ? `${progress}%` : (isEdit ? "Save" : "Add")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── New Version Modal ─────────────────────────────────────────────────────────
function NewVersionModal({ drawing, onClose, onSaved }: { drawing: Drawing | null; onClose: () => void; onSaved: () => void; }) {
  const [modNo, setModNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [bomFile, setBomFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const isRSB = drawing?.customer?.toUpperCase() === "RSB";

  useEffect(() => { if (drawing) { setModNo(drawing.modification_number || ""); setRemarks(""); } setFile(null); setBomFile(null); }, [drawing]);

  const handleSave = async () => {
    if (!file) return toast.error("Please select a drawing file");
    setSaving(true);
    setProgress(0);
    try {
      let finalFilePath = null;
      if (file) {
        const chunkSize = 5 * 1024 * 1024;
        const totalChunks = Math.ceil(file.size / chunkSize);
        const uploadId = Date.now().toString() + Math.random().toString(36).substring(2);

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunkFile = new File([file.slice(start, end)], file.name, { type: file.type });
          const fd = new FormData();
          fd.append("uploadId", uploadId);
          fd.append("chunkIndex", i.toString());
          fd.append("totalChunks", totalChunks.toString());
          fd.append("fileName", file.name);
          fd.append("chunk", chunkFile);

          const res = await api.post(
            `/drawings/upload-chunk?uploadId=${uploadId}&chunkIndex=${i}`,
            fd,
            { headers: { "Content-Type": undefined } }
          );
          if (res.data.file_path) finalFilePath = res.data.file_path;
          setProgress(Math.round(((i + 1) / totalChunks) * 100));
        }
      }

      const fd = new FormData();
      fd.append("modification_number", modNo);
      fd.append("remarks", remarks);
      if (finalFilePath) fd.append("file_path_from_chunks", finalFilePath);
      else fd.append("file", file);
      if (bomFile) fd.append("bom_file", bomFile);

      await api.post(`/drawings/${drawing!.id}/new-version`, fd, { headers: { "Content-Type": undefined } });
      toast.success("New version uploaded"); onSaved(); onClose();
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setSaving(false); setProgress(0); }
  };

  return (
    <Dialog open={!!drawing} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-md">
        <DialogTitle>Upload New Drawing Version</DialogTitle>
        <p className="text-xs text-muted-foreground mt-1">{drawing?.drawing_number} · Current: v{drawing?.version}</p>
        <div className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-muted-foreground">Mod Number</label><Input value={modNo} onChange={e => setModNo(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground">Remarks</label><Input value={remarks} onChange={e => setRemarks(e.target.value)} className="mt-1" /></div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{isRSB ? "Drawing File *" : "Drawing File *"}</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 block text-sm" />
            {saving && progress > 0 && <div className="h-1 bg-muted mt-1 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>}
          </div>
          {!isRSB && (
            <div><label className="text-xs font-semibold text-muted-foreground">BOM File (optional)</label><input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={e => setBomFile(e.target.files?.[0] || null)} className="mt-1 block text-sm" /></div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{saving && progress > 0 ? `${progress}%` : "Upload"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Versions Modal ────────────────────────────────────────────────────────────
function VersionsModal({ drawingId, onClose }: { drawingId: number | null; onClose: () => void; }) {
  const [versions, setVersions] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!drawingId) return;
    setLoading(true);
    api.get(`/drawings/${drawingId}/versions`).then(r => setVersions(r.data.data || [])).catch(() => toast.error("Failed")).finally(() => setLoading(false));
  }, [drawingId]);

  return (
    <Dialog open={!!drawingId} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-xl max-h-[80vh] flex flex-col">
        <DialogTitle>Version History</DialogTitle>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
          <div className="flex-1 overflow-y-auto space-y-2 mt-2">
            {versions.map(v => (
              <div key={v.id} className={`flex items-center justify-between p-3 rounded-xl border ${v.is_latest ? "bg-emerald-50 border-emerald-200" : "bg-muted/30"}`}>
                <div>
                  <p className="text-sm font-semibold">v{v.version} — Mod: {v.modification_number || "#"}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(v.modification_date)} · Added {fmtDate(v.created_at)}</p>
                </div>
                <div className="flex gap-2 items-center">
                  {v.is_latest && <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Latest</Badge>}
                  {v.file_path && <FileLink path={v.file_path} label="Drawing" />}
                  {v.bom && <FileLink path={v.bom} label="BOM" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Export to CSV ─────────────────────────────────────────────────────────────
function exportCSV(data: Drawing[], customer: string) {
  const headers = ["Sl No.", "Drawing Number", "Description", "Joint", "Part Number(s)", "Customer", "Mod Number", "Mod Date", "Remarks", "Drawing", "BOM"];
  const rows = data.map((d, i) => [
    d.serial_number || (i + 1).toString(),
    d.drawing_number,
    d.shaft || "",
    d.joint || "",
    d.part_number || "",
    d.customer || "",
    d.modification_number || "",
    fmtDate(d.modification_date),
    d.remarks || "",
    d.file_path ? "Yes" : "No",
    d.bom ? "Yes" : "No"
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `drawings_${customer.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DrawingsPage() {
  const { user } = useUser();
  const isAdmin = ["admin", "super admin"].includes(user?.role || "");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("");
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editDrawing, setEditDrawing] = useState<Drawing | null>(null);
  const [newVerDrawing, setNewVerDrawing] = useState<Drawing | null>(null);
  const [versionsId, setVersionsId] = useState<number | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");

  const fetchDrawings = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get("/drawings"); setDrawings(res.data.data || []); }
    catch { toast.error("Failed to load drawings"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDrawings(); }, [fetchDrawings]);

  useEffect(() => {
    api.get("/dynamic-fields").then(r => {
      const names: string[] = r.data.data?.customer_names || [];
      setCustomerNames(names);
    }).catch(() => {});
  }, []);

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return toast.error("Customer name is required");
    try {
      await api.post("/dynamic-fields/customer-names", { names: [newCustomerName.trim()] });
      toast.success("Customer added");
      setCustomerNames([...customerNames, newCustomerName.trim()]);
      setIsAddCustomerOpen(false);
      setNewCustomerName("");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to add customer");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this drawing?")) return;
    try { await api.delete(`/drawings/${id}`); toast.success("Deleted"); fetchDrawings(); }
    catch { toast.error("Delete failed"); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const result = drawings.filter(d => {
      const matchSearch = !q ||
        (d.drawing_number || "").toLowerCase().includes(q) ||
        (d.shaft || "").toLowerCase().includes(q) ||
        (d.part_number || "").toLowerCase().includes(q) ||
        (d.modification_number || "").toLowerCase().includes(q);
      const matchTab = !activeTab || (d.customer || "Unknown") === activeTab;
      return matchSearch && matchTab;
    });

    // Natural sort by serial_number
    return result.sort((a, b) => {
      const snA = a.serial_number || "";
      const snB = b.serial_number || "";
      return snA.localeCompare(snB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [drawings, search, activeTab]);

  const filteredWithSlNo = filtered;

  const tabs = useMemo(() => {
    const fromData = Array.from(new Set(drawings.map(d => d.customer || "Unknown")));
    const ordered = customerNames.length > 0
      ? [...customerNames.filter(n => fromData.includes(n)), ...fromData.filter(n => !customerNames.includes(n))]
      : fromData;
    return ordered;
  }, [drawings, customerNames]);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.includes(activeTab)) {
      setActiveTab(tabs[0]);
    }
  }, [tabs, activeTab]);

  const tabCount = useMemo(() => {
    const map: Record<string, number> = { ALL: drawings.length };
    drawings.forEach(d => { const c = d.customer || "Unknown"; map[c] = (map[c] || 0) + 1; });
    return map;
  }, [drawings]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Drawing Details</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Always shows latest revision · Grouped by customer</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search part no. or description..." className="pl-9 h-9 w-64 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => exportCSV(filtered, activeTab)}>
              <Download className="w-3.5 h-3.5" />Export CSV
            </Button>
            {isAdmin && <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={() => setIsAddCustomerOpen(true)}><Plus className="w-3.5 h-3.5" />Add Customer</Button>}
            {isAdmin && <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5" />Add Drawing</Button>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap border-b pb-0">
          {tabs.map((tab, idx) => {
            const colorIdx = idx === 0 ? 0 : (idx - 1) % TAB_COLORS.length;
            const color = TAB_COLORS[colorIdx];
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${isActive ? color.active + " -mb-px border-b-0 shadow-sm" : "bg-background border-transparent text-muted-foreground hover:text-foreground"}`}>
                {tab} <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? "bg-white/30" : "bg-muted"}`}>{tabCount[tab] || 0}</span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" />Loading drawings...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground text-sm">
            No drawings found.{isAdmin && <button className="text-primary underline ml-1" onClick={() => setAddOpen(true)}>Add the first one.</button>}
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-10">SR</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Drawing No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Joint</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Part Number(s)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Mod No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Mod Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Remarks</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{activeTab?.toUpperCase() === "RSB" ? "Drawing" : "Document"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">BOM</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Ver.</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredWithSlNo.map((d, i) => (
                    <tr key={d.id} className={`border-b transition-colors ${i % 2 === 0 ? "bg-white" : "bg-muted/20"} hover:bg-blue-50/40`}>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{d.serial_number || (i + 1)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{d.drawing_number}</td>
                      <td className="px-4 py-3 text-xs max-w-[140px] truncate">{d.shaft || "—"}</td>
                      <td className="px-4 py-3 text-xs">{d.joint || "—"}</td>
                      <td className="px-4 py-3 text-xs max-w-[160px]">
                        {d.part_number ? (
                          <div className="flex flex-wrap gap-1">
                            {d.part_number.split(",").map(p => p.trim()).filter(Boolean).map(p => (
                              <span key={p} className="bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5 text-[10px] font-mono">{p}</span>
                            ))}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="bg-slate-100 text-slate-700 rounded px-2 py-0.5 font-medium">{d.customer || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">{d.modification_number || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(d.modification_date)}</td>
                      <td className="px-4 py-3 text-xs max-w-[150px] truncate text-muted-foreground">{d.remarks || "—"}</td>
                      <td className="px-4 py-3"><FileLink path={d.file_path} label={d.customer?.toUpperCase() === "RSB" ? "Drawing" : "View"} /></td>
                      <td className="px-4 py-3"><FileLink path={d.bom} label="BOM" /></td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">v{d.version}</Badge></td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditDrawing(d)} className="w-7 h-7 flex items-center justify-center rounded bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setNewVerDrawing(d)} className="w-7 h-7 flex items-center justify-center rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors" title="New version"><Upload className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setVersionsId(d.id)} className="w-7 h-7 flex items-center justify-center rounded bg-violet-50 hover:bg-violet-100 text-violet-600 transition-colors" title="History"><History className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDelete(d.id)} className="w-7 h-7 flex items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
              Showing {filtered.length} of {drawings.length} drawings
            </div>
          </div>
        )}
      </div>

      <DrawingModal open={addOpen} onClose={() => setAddOpen(false)} editDrawing={null} onSaved={fetchDrawings} customerNames={customerNames} />
      <DrawingModal open={!!editDrawing} onClose={() => setEditDrawing(null)} editDrawing={editDrawing} onSaved={fetchDrawings} customerNames={customerNames} />
      <NewVersionModal drawing={newVerDrawing} onClose={() => setNewVerDrawing(null)} onSaved={fetchDrawings} />
      <VersionsModal drawingId={versionsId} onClose={() => setVersionsId(null)} />
      
      <Dialog open={isAddCustomerOpen} onOpenChange={o => !o && setIsAddCustomerOpen(false)}>
        <DialogContent className="!max-w-md">
          <DialogTitle>Add New Customer</DialogTitle>
          <div className="space-y-3 mt-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Customer Name</label>
              <Input value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsAddCustomerOpen(false)}>Cancel</Button>
              <Button onClick={handleAddCustomer}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
