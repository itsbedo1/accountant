import type { ReactNode } from 'react'
import { useDataStore } from '../state/useDataStore'
import type { Role } from '../../shared/types'

// تحسين على applyRolePermissions() بالكود القديم (كانت تخفي عبر CSS class على
// body، index.html:5033) — هنا نستخدم conditional rendering مباشرة، نفس
// السلوك الظاهر للمستخدم بالضبط. الحماية الفعلية بصلاحيات القاعدة (RLS) —
// هذا فقط لتبسيط الواجهة، تماماً متل الكود القديم.
export default function RoleGate({ only, children }: { only: Role; children: ReactNode }) {
  const myRole = useDataStore((s) => s.myRole)
  if (myRole !== only) return null
  return <>{children}</>
}
