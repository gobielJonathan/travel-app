const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createWorkspaceCode() {
  const values = new Uint32Array(6);
  if (import.meta.client && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) values[index] = Math.floor(Math.random() * 2 ** 32);
  }
  return `ROAM-${Array.from(values, (value) => alphabet[value % alphabet.length]).join("")}`;
}

export function useInvite() {
  const inviteCode = useState("workspace-code", createWorkspaceCode);
  const joined = useState("invite-joined", () => false);
  const deviceJoined = useState("invite-device-joined", () => false);

  function normalizeCode(value: string) {
    return value.trim().toUpperCase().replace(/\s|-/g, "");
  }

  function isValidCode(value: string) {
    return normalizeCode(value) === normalizeCode(inviteCode.value);
  }

  function join(code: string) {
    if (!isValidCode(code)) return false;
    joined.value = true;
    deviceJoined.value = true;
    return true;
  }

  return { inviteCode, joined, deviceJoined, normalizeCode, isValidCode, join };
}
