import { useState } from 'react'
export default function PetAvatar({ pet, fallback }) {
  const [failedUrl, setFailedUrl] = useState(null)
  const url = typeof pet.avatar_url === 'string' && /^https?:\/\//i.test(pet.avatar_url) ? pet.avatar_url : null
  return url && failedUrl !== url
    ? <img src={url} alt={pet.name} onError={() => setFailedUrl(url)} />
    : <span role="img" aria-label="Pet avatar">{fallback}</span>
}
