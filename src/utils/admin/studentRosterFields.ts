/** Read snake_case or camelCase string fields from Firestore user docs. */
export function readUserStringField(
  data: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const v = data[key]
    if (v == null) continue
    const s = String(v).trim()
    if (s !== '') return s
  }
  return ''
}

export function readStudentNumber(data: Record<string, unknown>): string {
  return readUserStringField(data, 'student_number', 'studentNumber')
}

export function readContactNumber(data: Record<string, unknown>): string {
  return readUserStringField(data, 'contact_number', 'contactNumber')
}
