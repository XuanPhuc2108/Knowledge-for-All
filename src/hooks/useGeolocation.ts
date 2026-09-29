import { useCallback, useState } from 'react'

interface GeoState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  loading: boolean
  error: string | null
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
  })

  const requestLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const msg = 'Trình duyệt không hỗ trợ định vị'
        setState((s) => ({ ...s, error: msg, loading: false }))
        reject(new Error(msg))
        return
      }

      setState((s) => ({ ...s, loading: true, error: null }))

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            loading: false,
            error: null,
          })
          resolve(position)
        },
        (err) => {
          const msg =
            err.code === err.PERMISSION_DENIED
              ? 'Bạn đã từ chối quyền định vị. Bạn vẫn có thể xem sách nhưng không sắp xếp theo khoảng cách.'
              : 'Không thể lấy vị trí. Vui lòng thử lại.'
          setState((s) => ({ ...s, loading: false, error: msg }))
          reject(new Error(msg))
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
      )
    })
  }, [])

  return { ...state, requestLocation }
}
