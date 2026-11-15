"use client"

import { useEffect, useState } from "react"
import { Search, UserPlus } from "lucide-react"
import { EmptyState, PageHeader, Panel } from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"
import { ROLE_LABEL, type Role } from "@/lib/adminRoles"

type M = { id: string; email: string; role: string }

function RoleSelect({ value, onChange, withNone }: { value: string; onChange: (r: string) => void; withNone?: boolean }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-[#e0dbd3]">
      {withNone && <option value="user">Choisir un rôle…</option>}
      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r].label}</option>)}
      {!withNone && <option value="user">Retirer l'accès</option>}
    </select>
  )
}

export default function TeamPage() {
  const [members, setMembers] = useState<M[] | null>(null)
  const [q, setQ] = useState("")
  const [found, setFound] = useState<M[]>([])

  const load = () => api.get<{ members: M[] }>("/api/admin/team").then((r) => setMembers(r.members)).catch((e) => notify.error(errorMessage(e)))
  useEffect(() => { load() }, [])
  useEffect(() => {
    if (q.trim().length < 3) { setFound([]); return }
    const t = setTimeout(() => api.get<{ results: M[] }>(`/api/admin/team?q=${encodeURIComponent(q)}`).then((r) => setFound(r.results.filter((x) => !members?.some((m) => m.id === x.id)))).catch(() => {}), 350)
    return () => clearTimeout(t)
  }, [q, members])

  async function setRole(id: string, role: string) {
    if (role === "user" && !window.confirm("Retirer l'accès à l'admin pour ce compte ?")) return
    try { await api.put("/api/admin/team", { id, role }); notify.success("Rôle enregistré"); setQ(""); await load() } catch (e) { notify.error(errorMessage(e)) }
  }

  return (
    <>
      <PageHeader title="Équipe" description="Chaque personne n'accède qu'à ce dont elle a besoin. La personne doit d'abord avoir un compte sur le site." />
      <Panel title="Rôles">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <li key={r}><span className="font-medium">{ROLE_LABEL[r].label}</span> <span className="text-[#7a756d]">· {ROLE_LABEL[r].hint}</span></li>)}
        </ul>
      </Panel>

      <Panel title="Membres" className="mt-4" padded={false}>
        {!members ? <p className="p-4 text-sm text-[#9a948a]">Chargement…</p> : members.length === 0 ? <div className="p-4"><EmptyState title="Personne pour l'instant" /></div> : (
          <ul className="divide-y divide-[#f0ece5]">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 truncate text-sm">{m.email || m.id}</span>
                <RoleSelect value={m.role} onChange={(r) => setRole(m.id, r)} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Ajouter quelqu'un" description="Tape au moins 3 lettres de son e-mail." className="mt-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a948a]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="prenom@email.com" className="w-full rounded-xl bg-white py-2.5 pl-10 pr-3 text-[15px] ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]" />
        </div>
        {found.length > 0 && (
          <ul className="mt-3 divide-y divide-[#f0ece5] rounded-xl bg-white ring-1 ring-[#e0dbd3]">
            {found.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <UserPlus size={15} className="text-[#9a948a]" />
                <span className="min-w-0 flex-1 truncate text-sm">{m.email}</span>
                <RoleSelect value="user" withNone onChange={(r) => r !== "user" && setRole(m.id, r)} />
              </li>
            ))}
          </ul>
        )}
        {q.trim().length >= 3 && found.length === 0 && <p className="mt-3 text-sm text-[#9a948a]">Aucun compte trouvé.</p>}
      </Panel>
    </>
  )
}
