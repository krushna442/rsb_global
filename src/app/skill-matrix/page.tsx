"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { Plus, Pencil, Trash2, Loader2, User, ChevronDown, ChevronUp, X, Award, Calendar, Settings, Star, Download, BarChart2 } from "lucide-react";

interface Person {
  id: number; machine_id: number; name: string; department: string | null;
  date_of_joining: string | null; skill_level: number; last_skill_update_date: string | null;
  authorised_for: string | null; photo_path: string | null;
}
interface Machine {
  id: number; machine_name: string; machine_no: string | null;
  person_count: number; persons: Person[];
}

const API_BASE = process.env.NEXT_PUBLIC_URL || "";
const photoUrl = (p: string | null) => !p ? null : (p.startsWith("http") ? p : `${API_BASE}/${p}`);
const fmtDate = (d: string | null) => !d ? "—" : new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const SKILL_CONFIG: Record<number, { label: string; desc: string; short: string; color: string; bg: string; ring: string; icon: string }> = {
  0: { label: "Level 0", desc: "No Knowledge — Has not been trained on the machine.", short: "I DON'T KNOW", color: "#6b7280", bg: "bg-gray-500", ring: "ring-gray-400", icon: "○" },
  1: { label: "Level 1", desc: "Basic Operator — Knows the process and can perform the operation.", short: "I KNOW & I DO", color: "#ef4444", bg: "bg-red-500", ring: "ring-red-400", icon: "▲" },
  2: { label: "Level 2", desc: "Setup Capable — Can operate and also setup/adjust the machine.", short: "I KNOW, I DO, I SET", color: "#ec4899", bg: "bg-pink-500", ring: "ring-pink-400", icon: "◆" },
  3: { label: "Level 3", desc: "Repair Capable — Can operate, setup, and perform minor repairs.", short: "KNOW · DO · SET · REPAIR", color: "#f59e0b", bg: "bg-yellow-400", ring: "ring-yellow-400", icon: "★" },
  4: { label: "Level 4", desc: "Expert/Trainer — Fully qualified to operate, repair, and train others.", short: "KNOW · DO · SET · REPAIR · TEACH", color: "#10b981", bg: "bg-emerald-500", ring: "ring-emerald-400", icon: "✦" },
};

function SkillDot({ level, size = "md" }: { level: number; size?: "sm" | "md" | "lg" }) {
  const c = SKILL_CONFIG[level] ?? SKILL_CONFIG[0];
  const sz = size === "sm" ? "w-6 h-6 text-xs" : size === "lg" ? "w-12 h-12 text-xl" : "w-9 h-9 text-base";
  return (
    <div className={`${sz} rounded-full ${c.bg} flex items-center justify-center font-bold text-white shadow-md ring-2 ${c.ring}`}>
      {level}
    </div>
  );
}

function PersonDetailDialog({ person, machine, onClose, canEdit, onEdit, onDelete }: {
  person: Person | null; machine: Machine | null; onClose: () => void;
  canEdit: boolean; onEdit: () => void; onDelete: () => void;
}) {
  if (!person) return null;
  const url = photoUrl(person.photo_path);
  const cfg = SKILL_CONFIG[person.skill_level] ?? SKILL_CONFIG[0];
  return (
    <Dialog open={!!person} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-md p-0 overflow-hidden">
        {/* Header banner */}
        <div className="relative h-28" style={{ background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}44)` }}>
          <div className="absolute inset-0 flex items-end px-6 pb-0">
            <div className="relative w-20 h-20 translate-y-10 rounded-full overflow-hidden border-4 border-white shadow-xl bg-slate-100 flex items-center justify-center">
              {url ? <img src={url} alt={person.name} className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-slate-400" />}
            </div>
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-white/70 hover:bg-white text-slate-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="pt-12 px-6 pb-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{person.name}</h2>
            <p className="text-sm text-slate-500">{person.department || "—"} {machine ? `· ${machine.machine_name}` : ""}</p>
          </div>
          {/* Skill level */}
          <div className="flex items-center gap-4 p-4 rounded-xl border-2 shadow-sm" style={{ borderColor: cfg.color + "55", background: cfg.color + "0a" }}>
            <SkillDot level={person.skill_level} size="lg" />
            <div>
              <p className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</p>
              <p className="text-xs text-slate-600 mt-0.5">{cfg.short}</p>
              <p className="text-xs text-slate-500 mt-1">{cfg.desc}</p>
            </div>
          </div>
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border">
              <div className="flex items-center gap-1.5 mb-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /><span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Joined</span></div>
              <p className="text-sm font-semibold text-slate-700">{fmtDate(person.date_of_joining)}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border">
              <div className="flex items-center gap-1.5 mb-1"><Star className="w-3.5 h-3.5 text-slate-400" /><span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Last Updated</span></div>
              <p className="text-sm font-semibold text-slate-700">{fmtDate(person.last_skill_update_date)}</p>
            </div>
          </div>
          {person.authorised_for && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-1.5 mb-1.5"><Settings className="w-3.5 h-3.5 text-blue-400" /><span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Also Authorised For</span></div>
              <div className="flex flex-wrap gap-1.5">
                {person.authorised_for.split(",").map((s, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">{s.trim()}</span>
                ))}
              </div>
            </div>
          )}
          {canEdit && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs" onClick={() => { onClose(); onEdit(); }}><Pencil className="w-3.5 h-3.5" />Edit</Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => { onClose(); onDelete(); }}><Trash2 className="w-3.5 h-3.5" />Remove</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PersonCard({ person, onClick }: { person: Person; onClick: () => void }) {
  const url = photoUrl(person.photo_path);
  const cfg = SKILL_CONFIG[person.skill_level] ?? SKILL_CONFIG[0];
  return (
    <button onClick={onClick} className="group flex flex-col items-center bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left w-full">
      <div className="relative w-full h-28 bg-gradient-to-b from-slate-100 to-slate-50 flex items-center justify-center overflow-hidden">
        {url ? <img src={url} alt={person.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <User className="w-12 h-12 text-slate-300" />}
        <div className="absolute top-2 right-2">
          <SkillDot level={person.skill_level} size="sm" />
        </div>
      </div>
      <div className="p-3 w-full space-y-1">
        <p className="font-bold text-xs text-slate-800 truncate text-center">{person.name}</p>
        <p className="text-[10px] text-slate-500 truncate text-center">{person.department || "—"}</p>
        <div className="flex items-center justify-center mt-1.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: cfg.color }}>{cfg.short.split("·")[0].trim()}</span>
        </div>
      </div>
    </button>
  );
}

function PersonModal({ open, onClose, editPerson, machineId, onSaved }: {
  open: boolean; onClose: () => void; editPerson: Person | null; machineId: number | null; onSaved: () => void;
}) {
  const [name, setName] = useState(""); const [dept, setDept] = useState(""); const [doj, setDoj] = useState("");
  const [level, setLevel] = useState(0); const [lastUpd, setLastUpd] = useState(""); const [auth, setAuth] = useState("");
  const [photo, setPhoto] = useState<File | null>(null); const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (editPerson) { setName(editPerson.name); setDept(editPerson.department || ""); setDoj(editPerson.date_of_joining?.slice(0, 10) || ""); setLevel(editPerson.skill_level); setLastUpd(editPerson.last_skill_update_date?.slice(0, 10) || ""); setAuth(editPerson.authorised_for || ""); }
    else { setName(""); setDept("Production"); setDoj(""); setLevel(0); setLastUpd(new Date().toISOString().slice(0, 10)); setAuth(""); }
    setPhoto(null);
  }, [editPerson, open]);
  const save = async () => {
    if (!name.trim()) return toast.error("Name required");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name); fd.append("department", dept); fd.append("date_of_joining", doj);
      fd.append("skill_level", String(level)); fd.append("last_skill_update_date", lastUpd); fd.append("authorised_for", auth);
      if (editPerson) { if (photo) fd.append("photo", photo); await api.put(`/skill-matrix/persons/${editPerson.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } }); }
      else { fd.append("machine_id", String(machineId)); if (photo) fd.append("photo", photo); await api.post("/skill-matrix/persons", fd, { headers: { "Content-Type": "multipart/form-data" } }); }
      toast.success(editPerson ? "Updated" : "Added"); onSaved(); onClose();
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-lg">
        <DialogTitle>{editPerson ? "Edit Person" : "Add Person"}</DialogTitle>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-muted-foreground">Full Name *</label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground">Department</label><Input value={dept} onChange={e => setDept(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground">Date of Joining</label><Input type="date" value={doj} onChange={e => setDoj(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground">Last Skill Update</label><Input type="date" value={lastUpd} onChange={e => setLastUpd(e.target.value)} className="mt-1" /></div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Skill Level</label>
            <div className="grid grid-cols-1 gap-1.5 mt-2">
              {[0, 1, 2, 3, 4].map(l => {
                const c = SKILL_CONFIG[l];
                const sel = level === l;
                return (
                  <button key={l} onClick={() => setLevel(l)} className={`flex items-center gap-3 px-3 py-2 rounded-lg border-2 text-xs transition-all ${sel ? "border-current shadow-md" : "border-slate-200 hover:border-slate-300"}`} style={sel ? { borderColor: c.color, background: c.color + "12" } : {}}>
                    <SkillDot level={l} size="sm" />
                    <span className="font-bold" style={{ color: sel ? c.color : undefined }}>{c.label}</span>
                    <span className="text-slate-500 flex-1 text-left">{c.short}</span>
                    {sel && <span className="text-xs" style={{ color: c.color }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div><label className="text-xs font-semibold text-muted-foreground">Authorised for Other Machines</label><Input value={auth} onChange={e => setAuth(e.target.value)} placeholder="e.g. Painting, PDI, Phosphating" className="mt-1" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Photo</label><input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)} className="mt-1 block text-sm" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{editPerson ? "Save" : "Add"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MachineModal({ open, onClose, editMachine, onSaved }: { open: boolean; onClose: () => void; editMachine: Machine | null; onSaved: () => void }) {
  const [name, setName] = useState(""); const [no, setNo] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (editMachine) { setName(editMachine.machine_name); setNo(editMachine.machine_no || ""); } else { setName(""); setNo(""); } }, [editMachine, open]);
  const save = async () => {
    if (!name.trim()) return toast.error("Machine name required");
    setSaving(true);
    try { if (editMachine) await api.put(`/skill-matrix/${editMachine.id}`, { machine_name: name, machine_no: no }); else await api.post("/skill-matrix", { machine_name: name, machine_no: no }); toast.success(editMachine ? "Updated" : "Added"); onSaved(); onClose(); }
    catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-sm">
        <DialogTitle>{editMachine ? "Edit Machine" : "Add Machine"}</DialogTitle>
        <div className="space-y-3 mt-2">
          <div><label className="text-xs font-semibold text-muted-foreground">Machine Name *</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Robotic Welding" className="mt-1" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">M/C No.</label><Input value={no} onChange={e => setNo(e.target.value)} placeholder="08" className="mt-1" /></div>
          <div className="flex justify-end gap-2 pt-1"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{editMachine ? "Save" : "Add"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Skill Graph Component ─────────────────────────────────────────────────────
function SkillGraph({ machines }: { machines: Machine[] }) {
  const maxVal = Math.max(1, ...machines.map(m => m.persons.length));
  const colors = ["#6b7280","#ef4444","#ec4899","#f59e0b","#10b981"];
  return (
    <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-slate-300" />
        <h3 className="font-bold text-white text-sm">Skill Level Distribution by Machine</h3>
      </div>
      <div className="p-5 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {machines.map(m => {
            const levelDist = [0,1,2,3,4].map(l => m.persons.filter(p => p.skill_level === l).length);
            return (
              <div key={m.id} className="flex flex-col items-center gap-1 min-w-[80px]">
                <div className="flex items-end gap-0.5 h-28">
                  {levelDist.map((cnt, l) => (
                    <div key={l} title={`Level ${l}: ${cnt} persons`}
                      className="w-8 rounded-t transition-all hover:opacity-80"
                      style={{ height: `${maxVal > 0 ? (cnt / maxVal) * 100 : 0}%`, backgroundColor: colors[l], minHeight: cnt > 0 ? '4px' : '0' }}
                    />
                  ))}
                </div>
                <p className="text-[9px] font-semibold text-slate-600 text-center leading-tight max-w-[80px] truncate">{m.machine_name}</p>
                <p className="text-[9px] text-slate-400">{m.persons.length} persons</p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {[0,1,2,3,4].map(l => (
            <span key={l} className="flex items-center gap-1 text-xs text-slate-600">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: colors[l] }} />
              Level {l} — {SKILL_CONFIG[l].short.split("·")[0].trim()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SkillMatrixPage() {
  const { user } = useUser();
  const canEdit = ["admin", "super admin"].includes(user?.role || "");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [machineModal, setMachineModal] = useState(false);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [personModal, setPersonModal] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [activeMachineId, setActiveMachineId] = useState<number | null>(null);
  const [detailPerson, setDetailPerson] = useState<Person | null>(null);
  const [detailMachine, setDetailMachine] = useState<Machine | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get("/skill-matrix"); setMachines(r.data.data || []); }
    catch { toast.error("Failed to load"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleCollapse = (id: number) => setCollapsed(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const deleteMachine = async (id: number) => { if (!confirm("Delete machine and all its persons?")) return; try { await api.delete(`/skill-matrix/${id}`); toast.success("Deleted"); load(); } catch { toast.error("Failed"); } };
  const deletePerson = async (id: number) => { if (!confirm("Remove person?")) return; try { await api.delete(`/skill-matrix/persons/${id}`); toast.success("Removed"); load(); } catch { toast.error("Failed"); } };

  const handlePrintPDF = () => window.print();

  // Stats
  const totalPersons = machines.reduce((s, m) => s + m.person_count, 0);
  const levelCounts = [0, 1, 2, 3, 4].map(l => ({ level: l, count: machines.flatMap(m => m.persons).filter(p => p.skill_level === l).length }));

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Skill Matrix</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{machines.length} machines · {totalPersons} authorised persons</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 h-9 text-xs" onClick={() => setShowGraph(g => !g)}><BarChart2 className="w-3.5 h-3.5" />{showGraph ? "Hide" : "Show"} Graph</Button>
            <Button size="sm" variant="outline" className="gap-1.5 h-9 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={handlePrintPDF}><Download className="w-3.5 h-3.5" />Download PDF</Button>
            {canEdit && <Button size="sm" className="gap-1.5 h-9 text-xs" onClick={() => { setEditMachine(null); setMachineModal(true); }}><Plus className="w-3.5 h-3.5" />Add Machine</Button>}
          </div>
        </div>

        {/* Level Summary Bar */}
        <div className="grid grid-cols-5 gap-2">
          {levelCounts.map(({ level, count }) => {
            const c = SKILL_CONFIG[level];
            return (
              <div key={level} className="flex items-center gap-2 p-2.5 rounded-xl border bg-white shadow-sm">
                <SkillDot level={level} size="sm" />
                <div>
                  <p className="text-lg font-bold text-slate-800 leading-none">{count}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Level {level}</p>
                </div>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" />Loading...</div>
        ) : machines.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground text-sm border-2 border-dashed rounded-2xl">No machines yet. {canEdit && <button className="text-primary underline ml-1" onClick={() => setMachineModal(true)}>Add the first machine.</button>}</div>
        ) : (
          <div className="space-y-6">
            {machines.map(m => {
              const isCollapsed = collapsed.has(m.id);
              const avgLevel = m.persons.length ? (m.persons.reduce((s, p) => s + p.skill_level, 0) / m.persons.length).toFixed(1) : "—";
              return (
                <div key={m.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden">
                  {/* Machine Header */}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleCollapse(m.id)} className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white">
                        {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                      </button>
                      <div>
                        <h2 className="font-bold text-sm">{m.machine_name}{m.machine_no ? ` — M/C No. ${m.machine_no}` : ""}</h2>
                        <p className="text-xs text-slate-400">{m.person_count} person{m.person_count !== 1 ? "s" : ""} · Avg skill: {avgLevel}</p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-white border-white/30 bg-transparent hover:bg-white/10 gap-1"
                          onClick={() => { setActiveMachineId(m.id); setEditPerson(null); setPersonModal(true); }}>
                          <Plus className="w-3.5 h-3.5" />Person
                        </Button>
                        <button onClick={() => { setEditMachine(m); setMachineModal(true); }} className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteMachine(m.id)} className="p-1.5 rounded hover:bg-red-500/20 text-white/70 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    m.persons.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        No persons added. {canEdit && <button onClick={() => { setActiveMachineId(m.id); setEditPerson(null); setPersonModal(true); }} className="text-primary underline ml-1">Add first person.</button>}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 print:grid-cols-6 gap-4 p-5">
                        {m.persons.map(p => (
                          <PersonCard key={p.id} person={p} onClick={() => { setDetailPerson(p); setDetailMachine(m); }} />
                        ))}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Graph */}
        {showGraph && machines.length > 0 && <SkillGraph machines={machines} />}

        {/* Skill Level Guidelines */}
        <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="px-5 py-3.5 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center gap-2">
            <Award className="w-4 h-4 text-slate-300" />
            <h3 className="font-bold text-white text-sm">Skill Level Guidelines</h3>
          </div>
          <div className="divide-y">
            {[0, 1, 2, 3, 4].map(l => {
              const c = SKILL_CONFIG[l];
              return (
                <div key={l} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <SkillDot level={l} size="md" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm" style={{ color: c.color }}>{c.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white" style={{ backgroundColor: c.color }}>{c.short}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{c.desc}</p>
                  </div>
                  <div className="text-2xl">{c.icon}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <PersonDetailDialog
        person={detailPerson} machine={detailMachine}
        onClose={() => { setDetailPerson(null); setDetailMachine(null); }}
        canEdit={canEdit}
        onEdit={() => { setEditPerson(detailPerson); setActiveMachineId(detailPerson?.machine_id ?? null); setPersonModal(true); }}
        onDelete={() => { if (detailPerson) deletePerson(detailPerson.id); setDetailPerson(null); }}
      />
      <MachineModal open={machineModal} onClose={() => setMachineModal(false)} editMachine={editMachine} onSaved={load} />
      <PersonModal open={personModal} onClose={() => setPersonModal(false)} editPerson={editPerson} machineId={activeMachineId} onSaved={load} />
    </DashboardLayout>
  );
}
