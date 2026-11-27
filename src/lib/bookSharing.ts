export const BOOKI_PRODUCTION_ORIGIN = 'https://booki-vn.vercel.app'

export function createBookiShareUrl(path = '/'): string {
  const url = new URL(path, `${BOOKI_PRODUCTION_ORIGIN}/`)
  url.searchParams.set('utm_source', 'booki')
  url.searchParams.set('utm_medium', 'share')
  url.searchParams.set('utm_campaign', 'community')
  return url.toString()
}

export function getBookiShareReferral(search: string) {
  const params = new URLSearchParams(search)
  if (
    params.get('utm_source') !== 'booki'
    || params.get('utm_medium') !== 'share'
    || params.get('utm_campaign') !== 'community'
  ) return null

  return { source: 'booki', medium: 'share', campaign: 'community' } as const
}
