function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hashBuffer(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return bufferToHex(digest)
}

export async function loadConfig(buffer) {
  const hash = await hashBuffer(buffer)
  const data = localStorage.getItem(`markers-${hash}`)
  return data ? JSON.parse(data) : []
}

export async function saveConfig(buffer, markers) {
  const hash = await hashBuffer(buffer)
  localStorage.setItem(`markers-${hash}`, JSON.stringify(markers))
}
