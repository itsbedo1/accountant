// منقولة من index.html (fmt كانت بالسطر 1872)
export function fmt(n: number | null | undefined): string {
  return n ? Number(n).toLocaleString() : '0'
}
