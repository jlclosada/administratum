export function likesLabel(count: number): string {
  return count === 1 ? "1 Me gusta" : `${count.toLocaleString("es-ES")} Me gusta`;
}
