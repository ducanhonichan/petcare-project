import { useEffect, useId, useState } from 'react'
import { API_BASE } from '../api/config'
import { clearSession } from '../auth/session'
import { useNavigate } from 'react-router-dom'

export default function PetPhotoUpload({ pet, onSaved }) {
  const inputId = useId()
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview)
  }, [preview])

  function choose(event) {
    const next = event.target.files?.[0]
    event.target.value = ''
    setMessage('')
    setError('')
    setFile(null)
    setPreview('')
    if (!next) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) {
      setError('Choose a JPEG, PNG or WebP photo.')
    } else if (next.size > 5 * 1024 * 1024) {
      setError('Photo must be 5 MB or smaller.')
    } else {
      setFile(next)
      setPreview(URL.createObjectURL(next))
    }
  }
  async function save(event) {
    event.preventDefault()
    if (!file || busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const token = sessionStorage.getItem('petcare_token')
      if (!token) { navigate('/login'); return }
      const body = new FormData()
      body.append('photo', file)
      const response = await fetch(API_BASE + '/pets/' + pet.id + '/photo', {
        method: 'POST', headers: { Authorization: 'Bearer ' + token }, body,
      })
      const result = await response.json().catch(() => ({}))
      if (response.status === 401) { clearSession(); navigate('/login'); return }
      if (!response.ok) throw new Error(result.message || 'Could not save the photo. Please try again.')
      onSaved(result.avatar_url)
      setFile(null)
      setPreview('')
      setMessage('Photo saved.')
    } catch (error) {
      setError(error instanceof TypeError ? 'Could not connect. Check your connection and try again.' : error.message)
    } finally {
      setBusy(false)
    }
  }
  return <form className="pet-photo-upload" onSubmit={save}>
    <label htmlFor={inputId}>Change photo for {pet.name}</label>
    <p>JPEG, PNG or WebP · Maximum 5 MB</p>
    <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={choose} />
    {preview && <img className="pet-photo-preview" src={preview} alt={'New photo preview for ' + pet.name} />}
    {file && <div className="pet-form-actions">
      <button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Save photo'}</button>
      <button type="button" disabled={busy} onClick={() => { setFile(null); setPreview(''); setError('') }}>Cancel</button>
    </div>}
    {error && <p role="alert" className="pet-photo-error">{error}</p>}
    {message && <p role="status">{message}</p>}
  </form>
}
