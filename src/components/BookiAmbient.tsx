type BookiAmbientProps = {
  variant: 'app' | 'landing'
}

export function BookiAmbient({ variant }: BookiAmbientProps) {
  return (
    <div className={`booki-ambient booki-ambient-${variant}`} aria-hidden="true">
      <span className="booki-ambient-light" />
      <span className="booki-ambient-cover" />
      <span className="booki-ambient-pages" />
    </div>
  )
}
