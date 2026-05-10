"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { Plus, Pencil, Trash2, Loader2, User, X, ChevronDown, ChevronUp } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
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
const fmtDate = (d: string | null) => !d ? "—" : new Date(d).toLocaleDateString("en-IN");

// ── Skill Level Config ─────────────────────────────────────────────────────────
const SKILL_CONFIG: Record<number, { label: string; desc: string; bg: string; text: string; border: string }> = {
  0: { label: "0", desc: "I DON'T KNOW",        bg: "bg-gray-400",   text: "text-white", border: "border-gray-400" },
  1: { label: "1", desc: "I KNOW AND I DO",      bg: "bg-red-500",    text: "text-white", border: "border-red-500" },
  2: { label: "2", desc: "I KNOW, I DO, I SET",  bg: "bg-pink-400",   text: "text-white", border: "border-pink-400" },
  3: { label: "3", desc: "I KNOW, I DO, I SET & I REPAIR", bg: "bg-yellow-400", text: "text-gray-900", border: "border-yellow-400" },
  4: { label: "4", desc: "I KNOW, I DO, I SET, I REPAIR & I TEACH", bg: "bg-green-500", text: "text-white", border: "border-green-500" },
};

function SkillBadge({ level }: { level: number }) {
  const c = SKILL_CONFIG[level] || SKILL_CONFIG[0];
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded font-bold text-sm ${c.bg} ${c.text} ${c.border} border-2`}>
      {c.label}
    </span>
  );
}

// ── Person Card (column style matching image) ─────────────────────────────────
function PersonCard({ person, canEdit, onEdit, onDelete }: {
  person: Person; canEdit: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const url = photoUrl(person.photo_path);
  return (
    <div className="flex flex-col items-center min-w-[140px] max-w-[160px] border rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Photo */}
      <div className="w-full h-32 bg-sky-100 flex items-center justify-center overflow-hidden">
        {url ? (
          <img src={url} alt={person.name} className="w-full h-full object-cover" />
        ) : (
          <User className="w-12 h-12 text-sky-400" />
        )}
      </div>
      {/* Details */}
      <div className="w-full divide-y text-xs grid grid-cols-2">
        <div className="px-2 py-1.5 text-center font-semibold text-slate-800">{person.name}</div>
        <div className="px-2 py-1 text-center text-muted-foreground">{person.department || "—"}</div>
        <div className="px-2 py-1 text-center text-muted-foreground">{fmtDate(person.date_of_joining)}</div>
        <div className="px-2 py-2 flex justify-center">
          <SkillBadge level={person.skill_level} />
        </div>
        <div className="px-2 py-1 text-center text-muted-foreground">{fmtDate(person.last_skill_update_date)}</div>
        <div className="px-2 py-1.5 text-center text-[11px] text-slate-600 min-h-[36px]">
          {person.authorised_for || "—"}
        </div>
      </div>
      {canEdit && (
        <div className="flex gap-1 p-1.5 border-t w-full justify-center">
          <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded bg-amber-50 hover:bg-amber-100 text-amber-600"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}

// ── Person Modal ───────────────────────────────────────────────────────────────
function PersonModal({ open, onClose, editPerson, machineId, onSaved }: {
  open: boolean; onClose: () => void; editPerson: Person | null; machineId: number | null; onSaved: () => void;
}) {
  const [name, setName] = useState(""); const [department, setDepartment] = useState("");
  const [doj, setDoj] = useState(""); const [skillLevel, setSkillLevel] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(""); const [authorised, setAuthorised] = useState("");
  const [photo, setPhoto] = useState<File | null>(null); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editPerson) { setName(editPerson.name); setDepartment(editPerson.department || ""); setDoj(editPerson.date_of_joining ? editPerson.date_of_joining.slice(0, 10) : ""); setSkillLevel(editPerson.skill_level); setLastUpdate(editPerson.last_skill_update_date ? editPerson.last_skill_update_date.slice(0, 10) : ""); setAuthorised(editPerson.authorised_for || ""); }
    else { setName(""); setDepartment("Production"); setDoj(""); setSkillLevel(3); setLastUpdate(new Date().toISOString().slice(0, 10)); setAuthorised(""); }
    setPhoto(null);
  }, [editPerson, open]);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name); fd.append("department", department); fd.append("date_of_joining", doj);
      fd.append("skill_level", String(skillLevel)); fd.append("last_skill_update_date", lastUpdate);
      fd.append("authorised_for", authorised);
      if (editPerson) {
        if (photo) fd.append("photo", photo);
        await api.put(`/skill-matrix/persons/${editPerson.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        fd.append("machine_id", String(machineId));
        if (photo) fd.append("photo", photo);
        await api.post("/skill-matrix/persons", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success(editPerson ? "Updated" : "Person added"); onSaved(); onClose();
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-lg">
        <DialogTitle>{editPerson ? "Edit Person" : "Add Person"}</DialogTitle>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-muted-foreground">Full Name *</label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground">Department</label><Input value={department} onChange={e => setDepartment(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground">Date of Joining</label><Input type="date" value={doj} onChange={e => setDoj(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground">Last Skill Update</label><Input type="date" value={lastUpdate} onChange={e => setLastUpdate(e.target.value)} className="mt-1" /></div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Skill Level</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[0, 1, 2, 3, 4].map(l => {
                const c = SKILL_CONFIG[l];
                return (
                  <button key={l} onClick={() => setSkillLevel(l)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md border-2 text-xs font-medium transition-all ${skillLevel === l ? `${c.bg} ${c.text} ${c.border}` : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <span className={`w-5 h-5 flex items-center justify-center rounded font-bold text-xs ${skillLevel === l ? "bg-white/30" : c.bg + " " + c.text}`}>{l}</span>
                    {c.desc}
                  </button>
                );
              })}
            </div>
          </div>
          <div><label className="text-xs font-semibold text-muted-foreground">Authorised for Other Machines</label><Input value={authorised} onChange={e => setAuthorised(e.target.value)} placeholder="Painting, PDI, Phosphating..." className="mt-1" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Photo</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setPhoto(e.target.files?.[0] || null)} className="mt-1 block text-sm" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{editPerson ? "Save" : "Add"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Machine Modal ──────────────────────────────────────────────────────────────
function MachineModal({ open, onClose, editMachine, onSaved }: {
  open: boolean; onClose: () => void; editMachine: Machine | null; onSaved: () => void;
}) {
  const [name, setName] = useState(""); const [no, setNo] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (editMachine) { setName(editMachine.machine_name); setNo(editMachine.machine_no || ""); } else { setName(""); setNo(""); } }, [editMachine, open]);
  const handleSave = async () => {
    if (!name.trim()) return toast.error("Machine name is required");
    setSaving(true);
    try {
      if (editMachine) { await api.put(`/skill-matrix/${editMachine.id}`, { machine_name: name, machine_no: no }); }
      else { await api.post("/skill-matrix", { machine_name: name, machine_no: no }); }
      toast.success(editMachine ? "Updated" : "Machine added"); onSaved(); onClose();
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="!max-w-sm">
        <DialogTitle>{editMachine ? "Edit Machine" : "Add Machine"}</DialogTitle>
        <div className="space-y-3 mt-2">
          <div><label className="text-xs font-semibold text-muted-foreground">Machine Name *</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Primo Welding (Robotic Welding)" className="mt-1" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">M/C No.</label><Input value={no} onChange={e => setNo(e.target.value)} placeholder="08" className="mt-1" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{editMachine ? "Save" : "Add"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Row Labels (left column of card table) ─────────────────────────────────────
const ROW_LABELS = ["Photo", "Name", "Department", "Date of Joining", "Skill Level", "Last Skill Updation Date", "Authorised for Other machines"];

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SkillMatrixPage() {
  const { user } = useUser();
  const canEdit = ["admin", "super admin"].includes(user?.role || "");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [machineModal, setMachineModal] = useState(false);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [personModal, setPersonModal] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [activePersonMachineId, setActivePersonMachineId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get("/skill-matrix"); setMachines(r.data.data || []); }
    catch { toast.error("Failed to load skill matrix"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleCollapse = (id: number) => setCollapsedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const deleteMachine = async (id: number) => {
    if (!confirm("Delete this machine and all its persons?")) return;
    try { await api.delete(`/skill-matrix/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Delete failed"); }
  };
  const deletePerson = async (id: number) => {
    if (!confirm("Remove this person?")) return;
    try { await api.delete(`/skill-matrix/persons/${id}`); toast.success("Removed"); load(); }
    catch { toast.error("Delete failed"); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Skill Matrix</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Authorised persons and skill levels by machine</p>
          </div>
          {canEdit && <Button size="sm" className="gap-1.5 h-9 text-xs" onClick={() => { setEditMachine(null); setMachineModal(true); }}><Plus className="w-3.5 h-3.5" />Add Machine</Button>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" />Loading...</div>
        ) : machines.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground text-sm border-2 border-dashed rounded-xl">No machines yet. {canEdit && <button className="text-primary underline ml-1" onClick={() => setMachineModal(true)}>Add the first machine.</button>}</div>
        ) : (
          <div className="space-y-8">
            {machines.map(m => {
              const isCollapsed = collapsedIds.has(m.id);
              return (
                <div key={m.id} className="border rounded-xl shadow-sm bg-white overflow-hidden">
                  {/* Machine Header */}
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-800 text-white">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleCollapse(m.id)} className="text-white/70 hover:text-white">
                        {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                      </button>
                      <div>
                        <h2 className="font-bold text-base">Authorised Persons for {m.machine_name}{m.machine_no ? ` — M/C No. ${m.machine_no}` : ""}</h2>
                        <p className="text-xs text-slate-400">{m.person_count} person{m.person_count !== 1 ? "s" : ""} authorised</p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-white border-white/30 bg-transparent hover:bg-white/10 gap-1"
                          onClick={() => { setActivePersonMachineId(m.id); setEditPerson(null); setPersonModal(true); }}>
                          <Plus className="w-3.5 h-3.5" />Person
                        </Button>
                        <button onClick={() => { setEditMachine(m); setMachineModal(true); }} className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteMachine(m.id)} className="p-1.5 rounded hover:bg-red-500/20 text-white/70 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="overflow-x-auto p-0">
                      {m.persons.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                          No persons added.{canEdit && <button onClick={() => { setActivePersonMachineId(m.id); setEditPerson(null); setPersonModal(true); }} className="text-primary underline ml-1">Add first person.</button>}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
                          {m.persons.map(p => (
                            <PersonCard
                              key={p.id}
                              person={p}
                              canEdit={canEdit}
                              onEdit={() => { setEditPerson(p); setActivePersonMachineId(m.id); setPersonModal(true); }}
                              onDelete={() => deletePerson(p.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Skill Level Legend */}
        <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="px-5 py-3 bg-slate-100 border-b"><h3 className="font-semibold text-slate-700 text-sm text-center">Guidelines For Skill Level</h3></div>
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b"><th className="px-4 py-2 text-left font-semibold text-slate-700 w-28">Skill Level</th><th className="px-4 py-2 text-left font-semibold text-slate-700">Description</th></tr></thead>
            <tbody>
              {[0, 1, 2, 3, 4].map(l => {
                const c = SKILL_CONFIG[l];
                return (
                  <tr key={l} className="border-b">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded font-bold text-sm ${c.bg} ${c.text}`}>{l}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{c.desc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <MachineModal open={machineModal} onClose={() => setMachineModal(false)} editMachine={editMachine} onSaved={load} />
      <PersonModal open={personModal} onClose={() => setPersonModal(false)} editPerson={editPerson} machineId={activePersonMachineId} onSaved={load} />
    </DashboardLayout>
  );
}
