export function normalizeBookDescription(description?: string | null): string {
  return description?.trim() ? description : ''
}

export function bookDescriptionUpdate(
  description: string | undefined,
): { description?: string } {
  return description === undefined
    ? {}
    : { description: normalizeBookDescription(description) }
}
