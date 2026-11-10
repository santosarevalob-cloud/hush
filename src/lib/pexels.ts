export interface PexelsPhoto {
  id: number
  width: number
  height: number
  photographer: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
  }
}

export interface PexelsSearchResult {
  photos: PexelsPhoto[]
  totalResults: number
}

export async function searchPhotos(query: string, page = 1): Promise<PexelsSearchResult> {
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY
  if (!apiKey) {
    throw new Error(
      'Pexels API key is not configured. Add VITE_PEXELS_API_KEY to .env.local (see .env.example).',
    )
  }

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&page=${page}`
  const res = await fetch(url, { headers: { Authorization: apiKey } })
  if (!res.ok) {
    throw new Error(`Pexels search failed (${res.status})`)
  }

  const data = await res.json()
  return {
    photos: data.photos ?? [],
    totalResults: data.total_results ?? 0,
  }
}
