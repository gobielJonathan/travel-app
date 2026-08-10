const inviteCode = 'ROAM-LA24-7KQ'

export function useInvite() {
  const joined = useState('invite-joined', () => false)

  function normalizeCode(value: string) {
    return value.trim().toUpperCase().replace(/\s|-/g, '')
  }

  function isValidCode(value: string) {
    return normalizeCode(value) === normalizeCode(inviteCode)
  }

  function join(code: string) {
    if (!isValidCode(code)) return false
    joined.value = true
    return true
  }

  return { inviteCode, joined, normalizeCode, isValidCode, join }
}
