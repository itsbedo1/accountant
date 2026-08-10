// منقولة حرفياً من index.html (AL_FIELD_LABELS/AL_ACTION_META، كانت بالسطر 2888)
export const AL_FIELD_LABELS: Record<string, string> = {
  noa: 'النوع',
  tarikh: 'التاريخ',
  raqm: 'رقم السند',
  hesab: 'الحساب',
  mabD: 'المبلغ $',
  mabDin: 'المبلغ IQD',
  jiha: 'الجهة',
  sak: 'الصك',
  notes: 'الملاحظات',
  amilName: 'العميل',
  type: 'نوع الصيرفة',
  rate: 'سعر الصرف',
  time: 'الوقت',
  balDAfter: 'رصيد $ بعدها',
  balDinAfter: 'رصيد IQD بعدها',
}

export const AL_ACTION_META: Record<string, { icon: string; label: string; cls: string }> = {
  create: { icon: '➕', label: 'إضافة', cls: 'add' },
  update: { icon: '✏️', label: 'تعديل', cls: 'upd' },
  delete: { icon: '🗑', label: 'حذف', cls: 'del' },
}

export interface AuditLogEntry {
  action: 'create' | 'update' | 'delete'
  table_name: 'moves' | 'sayarfa_moves'
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_by_email: string | null
  created_at: string
}
