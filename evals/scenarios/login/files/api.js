export function api(path, options = {}) {
  const token = localStorage.getItem('token')
  return fetch(path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  })
}
