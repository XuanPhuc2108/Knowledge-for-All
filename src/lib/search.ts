export function normalizeBookSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
}
