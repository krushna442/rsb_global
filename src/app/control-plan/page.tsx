"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { Plus, Pencil, Trash2, Upload, History, Search, Loader2, Download, File, Power, Video, X, Play } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const SOP_VIDEO_TAB = "SOP Video";
const API_BASE_URL = process.env.NEXT_PUBLIC_URL || "";

// ── SOP Video Tab ─────────────────────────────────────────────────────────────
function SopVideoTab({ isAdmin, search, langFilter }: { isAdmin: boolean; search: string; langFilter: LangFilter; }) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState<any | null>(null);
  const [videoLang, setVideoLang] = useState("English");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/sop-videos"); setVideos(r.data.data || []); }
    catch { toast.error("Failed to load videos"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!title.trim() || !file) return toast.error("Title and video file are required");
    setUploading(true);
    setProgress(0);

    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = Date.now().toString() + Math.random().toString(36).substring(2);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const fd = new FormData();
        fd.append("uploadId", uploadId);
        fd.append("chunkIndex", i.toString());
        fd.append("totalChunks", totalChunks.toString());
        fd.append("title", title.trim());
        fd.append("fileName", file.name);
        fd.append("mimeType", file.type);
        fd.append("language", videoLang);
        fd.append("chunk", chunk);

        await api.post(`/sop-videos/chunk?uploadId=${uploadId}&chunkIndex=${i}`, fd, { 
          headers: { "Content-Type": "multipart/form-data" }
        });

        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      toast.success("Video uploaded"); 
      setTitle(""); 
      setFile(null);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) { 
      toast.error(e.response?.data?.message || "Upload failed"); 
      setProgress(0);
    }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this video?")) return;
    try { await api.delete(`/sop-videos/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Delete failed"); }
  };

  const filteredVideos = useMemo(() => {
    const q = search.toLowerCase().trim();
    return videos.filter(v => {
      const matchSearch = !q || v.title.toLowerCase().includes(q);
      const matchLang = langFilter === "ALL" || (v.language || "English") === langFilter;
      return matchSearch && matchLang;
    });
  }, [videos, search, langFilter]);

  const streamUrl = (id: number) => `${API_BASE_URL}/api/sop-videos/stream/${id}`;

  return (
    <div className="space-y-5">
      {/* Upload form */}
      {isAdmin && (
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Video className="w-4 h-4 text-rose-600" /> Upload SOP Video</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Video title..." className="flex-1 h-9" />
            <select value={videoLang} onChange={e => setVideoLang(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
            </select>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            <Button variant="outline" size="sm" className="h-9" onClick={() => fileRef.current?.click()}>
              {file ? file.name.slice(0, 20) + "..." : "Choose Video"}
            </Button>
            <Button size="sm" className="h-9 gap-1.5 min-w-[100px] relative overflow-hidden" onClick={handleUpload} disabled={uploading}>
              {uploading && (
                <div className="absolute left-0 top-0 bottom-0 bg-black/20 transition-all duration-300" style={{ width: `${progress}%` }} />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? `${progress}%` : "Upload"}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Video Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /> Loading videos...</div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">No SOP videos found.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredVideos.map(v => (
            <div key={v.id} className="group relative bg-slate-900 rounded-xl overflow-hidden aspect-video shadow-md cursor-pointer hover:ring-2 hover:ring-rose-500 transition-all"
              onClick={() => setPlaying(v)}>
              <video src={streamUrl(v.id)} className="w-full h-full object-cover opacity-70" muted preload="metadata" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-white/30 transition">
                  <Play className="w-6 h-6 text-white ml-0.5" />
                </div>
                <p className="text-white text-xs font-semibold text-center px-2 drop-shadow">{v.title}</p>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold text-white drop-shadow ${v.language === "Hindi" ? "bg-orange-500/80" : "bg-sky-600/80"}`}>{v.language || "English"}</span>
              </div>
              {isAdmin && (
                <button onClick={e => { e.stopPropagation(); handleDelete(v.id); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Player */}
      {playing && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setPlaying(null)}>
          <button onClick={() => setPlaying(null)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition">
            <X className="w-5 h-5" />
          </button>
          <p className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm font-semibold">{playing.title}</p>
          <video
            src={streamUrl(playing.id)}
            className="max-w-full max-h-full"
            autoPlay loop controls
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

interface ControlPlan {
  id: number; name: string; line: string; rev_no: string | null;
  rev_date: string | null; file_path: string | null; is_active: number;
  language: string; version: number; parent_id: number | null;
  is_latest: number; sequence_number: number; remarks: any; created_by: string; created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_URL || "";
const getFileUrl = (p: string) => p?.startsWith("http") ? p : `${API_BASE}/${p?.replace(/\\/g, "/")}`;
const fmtDate = (d: string | null) => !d ? "—" : new Date(d).toLocaleDateString("en-IN");

const TAB_COLORS = [
  { active: "bg-orange-600 text-white", badge: "bg-white/30" },
  { active: "bg-blue-600 text-white",   badge: "bg-white/30" },
  { active: "bg-green-600 text-white",  badge: "bg-white/30" },
  { active: "bg-purple-600 text-white", badge: "bg-white/30" },
  { active: "bg-rose-600 text-white",   badge: "bg-white/30" },
];

type LangFilter = "ALL" | "English" | "Hindi";

function LangToggle({ value, onChange }: { value: LangFilter; onChange: (v: LangFilter) => void }) {
  return (
    <div className="flex items-center rounded-lg border overflow-hidden h-9 divide-x text-xs font-semibold">
      {([["ALL", "All"], ["English", "English"], ["Hindi", "हिंदी"]] as [LangFilter, string][]).map(([val, label]) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`px-3 h-full transition-colors ${
            value === val
              ? val === "Hindi"
                ? "bg-orange-500 text-white"
                : val === "English"
                ? "bg-sky-600 text-white"
                : "bg-muted text-foreground font-bold"
              : "bg-background text-muted-foreground hover:bg-muted/60"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

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
function PlanModal({ open, onClose, editPlan, onSaved, lines, onRefreshOptions }: {
  open: boolean; onClose: () => void; editPlan: ControlPlan | null; onSaved: () => void; lines: string[]; onRefreshOptions: () => void;
}) {
  const [name, setName] = useState(""); const [line, setLine] = useState(lines[0] || "");
  const [sequenceNo, setSequenceNo] = useState<number | "">("");
  const [revNo, setRevNo] = useState(""); const [revDate, setRevDate] = useState("");
  const [language, setLanguage] = useState("English"); const [file, setFile] = useState<File | null>(null);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const isEdit = !!editPlan;

  useEffect(() => {
    if (editPlan) { name ? null : setName(editPlan.name); setLine(editPlan.line); setSequenceNo(editPlan.sequence_number || 0); setRevNo(editPlan.rev_no || ""); setRevDate(editPlan.rev_date || ""); setLanguage(editPlan.language); setRemarks(Array.isArray((editPlan as any).remarks) ? (editPlan as any).remarks.join("\n") : ((editPlan as any).remarks || "")); }
    else { setName(""); setLine(lines[0] || ""); setSequenceNo(""); setRevNo(""); setRevDate(""); setLanguage("English"); setRemarks(""); }
    setFile(null);
    setProgress(0);
  }, [editPlan, open, lines]);

  const handleDeleteLineOption = async () => {
    if (!line) return;
    if (!confirm(`Are you sure you want to remove the line option "${line}" from the dropdown list? This will not delete any existing control plans for this line.`)) return;
    try {
      await api.delete("/dynamic-fields/control-plan-names", { data: { names: [line] } });
      toast.success("Option removed");
      onRefreshOptions();
      setLine(lines.filter(l => l !== line)[0] || "");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to remove option");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    setProgress(0);
    try {
      if (isEdit) {
        await api.put(`/control-plans/${editPlan!.id}`, { name, line, rev_no: revNo, rev_date: revDate, language, sequence_number: Number(sequenceNo) || 0, remarks });
      } else {
        if (!file) {
          const fd = new FormData();
          fd.append("name", name.trim()); fd.append("line", line); fd.append("rev_no", revNo);
          fd.append("rev_date", revDate); fd.append("language", language);
          fd.append("sequence_number", (Number(sequenceNo) || 0).toString());
          fd.append("remarks", remarks);
          await api.post("/control-plans", fd, { headers: { "Content-Type": "multipart/form-data" } });
        } else {
          const chunkSize = 5 * 1024 * 1024;
          const totalChunks = Math.ceil(file.size / chunkSize);
          const uploadId = Date.now().toString() + Math.random().toString(36).substring(2);
          for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);
            const fd = new FormData();
            fd.append("uploadId", uploadId);
            fd.append("chunkIndex", i.toString());
            fd.append("totalChunks", totalChunks.toString());
            fd.append("fileName", file.name);
            fd.append("name", name.trim());
            fd.append("line", line);
            fd.append("rev_no", revNo);
            fd.append("rev_date", revDate);
            fd.append("language", language);
            fd.append("sequence_number", (Number(sequenceNo) || 0).toString());
            fd.append("remarks", remarks);
            fd.append("chunk", chunk);
            await api.post(`/control-plans/chunk?uploadId=${uploadId}&chunkIndex=${i}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
            setProgress(Math.round(((i + 1) / totalChunks) * 100));
          }
        }
      }
      toast.success(isEdit ? "Updated" : "Control plan added"); onSaved(); onClose();
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); setProgress(0); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-lg">
        <DialogTitle>{isEdit ? "Edit Control Plan" : "Add Control Plan"}</DialogTitle>
        <div className="space-y-3 mt-2">
          <div><label className="text-xs font-semibold text-muted-foreground">Plan Name *</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. JOINT INTER AXLE" className="mt-1" disabled={isEdit} /></div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Line</label>
            <div className="flex gap-1.5 items-center mt-1">
              <select value={line} onChange={e => setLine(e.target.value)} className="flex-1 border rounded-md px-3 py-2 text-sm bg-background h-9">
                {lines.map(l => <option key={l}>{l}</option>)}
              </select>
              {line && (
                <Button type="button" variant="outline" size="sm" className="h-9 w-9 px-0 border-red-200 hover:bg-red-50 text-red-500" onClick={handleDeleteLineOption}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          <div><label className="text-xs font-semibold text-muted-foreground">Sequence Number</label><Input type="number" value={sequenceNo} onChange={e => setSequenceNo(e.target.value === "" ? "" : Number(e.target.value))} className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-muted-foreground">Rev No</label><Input value={revNo} onChange={e => setRevNo(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground">Rev Date</label><Input type="date" value={revDate} onChange={e => setRevDate(e.target.value)} className="mt-1" /></div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-background">
              <option>English</option><option>Hindi</option>
            </select>
          </div>
          {isEdit && <div><label className="text-xs font-semibold text-muted-foreground">Remarks</label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Enter remarks for this version (one per line)..." className="mt-1 text-xs" /></div>}
          {!isEdit && <div><label className="text-xs font-semibold text-muted-foreground">File (optional)</label><input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 block text-sm" /></div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? (progress > 0 && progress < 100 ? `${progress}%` : <Loader2 className="w-4 h-4 animate-spin mr-1" />) : null}{isEdit ? "Save" : "Add"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewVersionModal({ plan, onClose, onSaved }: { plan: ControlPlan | null; onClose: () => void; onSaved: () => void; }) {
  const [revNo, setRevNo] = useState(""); const [revDate, setRevDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null); const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => { if (plan) { setRevNo(plan.rev_no || ""); setRemarks(""); } setFile(null); setProgress(0); }, [plan]);
  const handleSave = async () => {
    if (!file) return toast.error("Please select a file");
    if (!remarks.trim()) return toast.error("Remarks are required for new versions");
    setSaving(true);
    setProgress(0);
    try {
      const chunkSize = 5 * 1024 * 1024;
      const totalChunks = Math.ceil(file.size / chunkSize);
      const uploadId = Date.now().toString() + Math.random().toString(36).substring(2);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        const fd = new FormData();
        fd.append("uploadId", uploadId);
        fd.append("chunkIndex", i.toString());
        fd.append("totalChunks", totalChunks.toString());
        fd.append("fileName", file.name);
        fd.append("rev_no", revNo);
        fd.append("rev_date", revDate);
        fd.append("remarks", remarks);
        fd.append("chunk", chunk);
        await api.post(`/control-plans/${plan!.id}/new-version/chunk?uploadId=${uploadId}&chunkIndex=${i}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      toast.success("New version uploaded"); onSaved(); onClose();
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); setProgress(0); }
  };
  return (
    <Dialog open={!!plan} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-md">
        <DialogTitle>Upload New Version — {plan?.name}</DialogTitle>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-muted-foreground">Rev No</label><Input value={revNo} onChange={e => setRevNo(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground">Rev Date</label><Input type="date" value={revDate} onChange={e => setRevDate(e.target.value)} className="mt-1" /></div>
          </div>
          <div><label className="text-xs font-semibold text-muted-foreground">Remarks <span className="text-amber-600">(required)</span></label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Describe changes in this new version (one per line)..." className="mt-1 text-xs border-amber-300 focus:border-amber-500" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">File *</label><input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 block text-sm" /></div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? (progress > 0 && progress < 100 ? `${progress}%` : <Loader2 className="w-4 h-4 animate-spin mr-1" />) : null}Upload</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VersionsModal({ planId, onClose }: { planId: number | null; onClose: () => void; }) {
  const [versions, setVersions] = useState<ControlPlan[]>([]); const [loading, setLoading] = useState(false);
  const [editingRemarkId, setEditingRemarkId] = useState<number | null>(null);
  const [editingRemarkVal, setEditingRemarkVal] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  useEffect(() => { if (!planId) return; setLoading(true); api.get(`/control-plans/${planId}/versions`).then(r => setVersions(r.data.data || [])).catch(() => toast.error("Failed")).finally(() => setLoading(false)); }, [planId]);

  const handleSaveRemark = async (id: number) => {
    setSavingRemark(true);
    try {
      const response = await api.put(`/control-plans/${id}`, { remarks: editingRemarkVal });
      const updated = response.data.data;
      setVersions(prev => prev.map(v => v.id === id ? { ...v, remarks: updated.remarks } : v));
      setEditingRemarkId(null);
      toast.success("Remark updated");
    } catch(e) { toast.error("Failed to update remark"); }
    finally { setSavingRemark(false); }
  }

  return (
    <Dialog open={!!planId} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-xl max-h-[80vh] flex flex-col">
        <DialogTitle>Version History</DialogTitle>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
          <div className="flex-1 overflow-y-auto space-y-2 mt-2">
            {versions.map(v => (
              <div key={v.id} className={`flex flex-col p-3 rounded-xl border ${v.is_latest ? "bg-emerald-50 border-emerald-200" : "bg-muted/30"}`}>
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-semibold">v{v.version} — Rev {v.rev_no || "#"}</p><p className="text-xs text-muted-foreground">{fmtDate(v.rev_date)} · Added {fmtDate(v.created_at)}</p></div>
                  <div className="flex gap-2 items-center">
                    {v.is_latest && <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Latest</Badge>}
                    <FileLink path={v.file_path} />
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t flex flex-col gap-1">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-muted-foreground min-w-[60px]">Remarks:</span>
                    {editingRemarkId === v.id ? (
                      <div className="flex-1 flex gap-2 items-start">
                        <Textarea value={editingRemarkVal} onChange={e => setEditingRemarkVal(e.target.value)} className="h-16 text-xs flex-1" placeholder="Enter remarks (one per line)..." />
                        <div className="flex flex-col gap-1">
                          <Button size="sm" className="h-7 px-2" onClick={() => handleSaveRemark(v.id)} disabled={savingRemark}>Save</Button>
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setEditingRemarkId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          {Array.isArray(v.remarks) && v.remarks.length > 0 ? (
                            <ul className="list-disc pl-4 text-xs text-slate-700 space-y-0.5">
                              {v.remarks.map((r: string, idx: number) => (
                                <li key={idx}>{r}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-xs text-slate-700">—</span>
                          )}
                        </div>
                        <button onClick={() => { setEditingRemarkId(v.id); setEditingRemarkVal(Array.isArray(v.remarks) ? v.remarks.join("\n") : (v.remarks || "")); }} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit Remarks"><Pencil className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function exportCSV(data: ControlPlan[], line: string) {
  const headers = ["SR No.", "Plan Name", "Line", "Rev No.", "Rev Date", "Language", "Status", "Document", "Version"];
  const rows = data.map((p, i) => [i + 1, p.name, p.line, p.rev_no || "", fmtDate(p.rev_date), p.language, p.is_active ? "Active" : "Inactive", p.file_path ? getFileUrl(p.file_path) : "", p.version]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  const fileName = line === "ALL" ? `control_plan_ALL_${new Date().toISOString().slice(0, 10)}.csv` : `control_plan_${line.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url);
}

export default function ControlPlanPage() {
  const { user } = useUser();
  const isAdmin = ["admin", "super admin"].includes(user?.role || "");
  const [plans, setPlans] = useState<ControlPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [langFilter, setLangFilter] = useState<LangFilter>("ALL");
  const [lines, setLines] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [isAddLineOpen, setIsAddLineOpen] = useState(false);
  const [newLineName, setNewLineName] = useState("");
  const [editPlan, setEditPlan] = useState<ControlPlan | null>(null);
  const [newVerPlan, setNewVerPlan] = useState<ControlPlan | null>(null);
  const [versionsPlanId, setVersionsPlanId] = useState<number | null>(null);
  const isSopTab = activeTab === SOP_VIDEO_TAB;

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get("/control-plans"); setPlans(res.data.data || []); }
    catch { toast.error("Failed to load control plans"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const fetchLines = useCallback(async () => {
    try {
      const r = await api.get("/dynamic-fields");
      setLines(r.data.data?.control_plan_names || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  const handleAddLine = async () => {
    if (!newLineName.trim()) return toast.error("Line name is required");
    try {
      await api.post("/dynamic-fields/control-plan-names", { names: [newLineName.trim()] });
      toast.success("Line added");
      setLines([...lines, newLineName.trim()]);
      setIsAddLineOpen(false);
      setNewLineName("");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to add line");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this control plan?")) return;
    try { await api.delete(`/control-plans/${id}`); toast.success("Deleted"); fetchPlans(); }
    catch { toast.error("Delete failed"); }
  };

  const handleDeleteTab = async (lineName: string) => {
    if (!confirm(`Warning: This will delete ALL control plans for line "${lineName}" from the database. This action cannot be undone.\n\nAre you sure you want to proceed?`)) return;
    try {
      await api.delete(`/control-plans/line/${encodeURIComponent(lineName)}`);
      await api.delete("/dynamic-fields/control-plan-names", { data: { names: [lineName] } });
      toast.success(`Deleted all records and option for ${lineName}`);
      fetchLines();
      fetchPlans();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete control plans");
    }
  };

  const handleToggleActive = async (plan: ControlPlan) => {
    try { await api.patch(`/control-plans/${plan.id}/toggle-active`); fetchPlans(); }
    catch { toast.error("Failed to toggle status"); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return plans
      .filter(p => {
        if (!showInactive && !p.is_active) return false;
        if (langFilter !== "ALL" && p.language !== langFilter) return false;
        const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.rev_no || "").toLowerCase().includes(q);
        const matchTab = !activeTab || activeTab === "ALL" || p.line === activeTab;
        return matchSearch && matchTab;
      })
      .sort((a, b) => {
        if (activeTab === "ALL") {
          if (a.line !== b.line) return a.line.localeCompare(b.line);
        }
        return (a.sequence_number || 0) - (b.sequence_number || 0);
      });
  }, [plans, search, activeTab, showInactive, langFilter]);

  const tabs = useMemo(() => {
    const fromData = Array.from(new Set(plans.map(p => p.line)));
    const ordered = lines.length > 0
      ? [...lines.filter(n => fromData.includes(n)), ...fromData.filter(n => !lines.includes(n))]
      : fromData;
    return ["ALL", ...ordered, SOP_VIDEO_TAB];
  }, [plans, lines]);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.includes(activeTab)) {
      setActiveTab(tabs[0]);
    }
  }, [tabs, activeTab]);

  const tabCount = useMemo(() => {
    const visible = (p: ControlPlan) =>
      (showInactive || p.is_active) && (langFilter === "ALL" || p.language === langFilter);
    const map: Record<string, number> = { ALL: plans.filter(visible).length };
    plans.filter(visible).forEach(p => { map[p.line] = (map[p.line] || 0) + 1; });
    return map;
  }, [plans, showInactive, langFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Control Plan</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manufacturing control plans · Grouped by line</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name, rev no..." className="pl-9 h-9 w-56 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            )}

            {/* Language Toggle */}
            {<LangToggle value={langFilter} onChange={setLangFilter} />}

            {isAdmin && (
              <Button size="sm" variant={showInactive ? "default" : "outline"} className="h-9 text-xs gap-1.5" onClick={() => setShowInactive(!showInactive)}>
                <Power className="w-3.5 h-3.5" />{showInactive ? "Hide" : "Show"} Inactive
              </Button>
            )}
            {(
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => exportCSV(filtered, activeTab)}>
                <Download className="w-3.5 h-3.5" />Export CSV
              </Button>
            )}
            {isAdmin && <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={() => setIsAddLineOpen(true)}><Plus className="w-3.5 h-3.5" />Add Line</Button>}
            {isAdmin && <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5" />Add Plan</Button>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap border-b">
          {tabs.map((tab, idx) => {
            const isSop = tab === SOP_VIDEO_TAB;
            const isAll = tab === "ALL";
            const colorIdx = isAll ? -1 : (isSop ? -1 : (idx - 1) % TAB_COLORS.length);
            const color = isSop
              ? { active: "bg-rose-600 text-white", badge: "bg-white/30" }
              : isAll
              ? { active: "bg-slate-700 text-white", badge: "bg-white/30" }
              : TAB_COLORS[colorIdx < 0 ? 0 : colorIdx];
            const isActive = activeTab === tab;
            return (
              <div key={tab} className="relative group/tab flex">
                <button onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all -mb-px flex items-center gap-1.5 ${isActive ? color.active + " border border-b-0 shadow-sm" : "bg-background border-transparent text-muted-foreground hover:text-foreground border"}`}>
                  {isSop && <Video className="w-3 h-3" />}
                  {tab}
                  {!isSop && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? color.badge : "bg-muted"}`}>{tabCount[tab] || 0}</span>}
                
                </button>
              </div>
            );
          })}
        </div>

        {/* SOP Video Tab */}
        {isSopTab ? (
          <SopVideoTab isAdmin={isAdmin} search={search} langFilter={langFilter} />
        ) : loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" />Loading control plans...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground text-sm">No control plans found. {isAdmin && <button className="text-primary underline ml-1" onClick={() => setAddOpen(true)}>Add the first one.</button>}</div>
        ) : (
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-10">Seq</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Plan Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Line</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Rev No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Rev Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Language</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Document</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Remarks</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Ver.</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} className={`border-b transition-colors ${i % 2 === 0 ? "bg-white" : "bg-muted/20"} hover:bg-green-50/40 ${!p.is_active ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.sequence_number}</td>
                      <td className="px-4 py-3 text-xs font-semibold">{p.name}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="bg-green-50 text-green-700 border border-green-100 rounded px-2 py-0.5 font-medium text-[11px]">{p.line}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">{p.rev_no || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(p.rev_date)}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.language === "Hindi" ? "bg-orange-100 text-orange-700" : "bg-sky-100 text-sky-700"
                        }`}>
                          {p.language === "Hindi" ? "हिंदी" : "English"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3"><FileLink path={p.file_path} /></td>
                      <td className="px-4 py-3 text-xs max-w-[180px] truncate text-muted-foreground">
                        {Array.isArray(p.remarks) ? p.remarks.join(", ") : (p.remarks || "—")}
                      </td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">v{p.version}</Badge></td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditPlan(p)} className="w-7 h-7 flex items-center justify-center rounded bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setNewVerPlan(p)} className="w-7 h-7 flex items-center justify-center rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors" title="New version"><Upload className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setVersionsPlanId(p.id)} className="w-7 h-7 flex items-center justify-center rounded bg-violet-50 hover:bg-violet-100 text-violet-600 transition-colors" title="History"><History className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleToggleActive(p)} className="w-7 h-7 flex items-center justify-center rounded bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors" title="Toggle active"><Power className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDelete(p.id)} className="w-7 h-7 flex items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
              Showing {filtered.length} of {plans.length} plans
              {langFilter !== "ALL" && (
                <span className="ml-2 font-medium text-foreground">
                  · {langFilter === "Hindi" ? "हिंदी" : "English"} only
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <PlanModal open={addOpen} onClose={() => setAddOpen(false)} editPlan={null} onSaved={fetchPlans} lines={lines} onRefreshOptions={fetchLines} />
      <PlanModal open={!!editPlan} onClose={() => setEditPlan(null)} editPlan={editPlan} onSaved={fetchPlans} lines={lines} onRefreshOptions={fetchLines} />
      <NewVersionModal plan={newVerPlan} onClose={() => setNewVerPlan(null)} onSaved={fetchPlans} />
      <VersionsModal planId={versionsPlanId} onClose={() => setVersionsPlanId(null)} />

      <Dialog open={isAddLineOpen} onOpenChange={o => !o && setIsAddLineOpen(false)}>
        <DialogContent className="!max-w-md">
          <DialogTitle>Add New Line</DialogTitle>
          <div className="space-y-3 mt-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Line Name</label>
              <Input value={newLineName} onChange={e => setNewLineName(e.target.value)} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsAddLineOpen(false)}>Cancel</Button>
              <Button onClick={handleAddLine}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}