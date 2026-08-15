const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createWorkspaceCode() {
  const values = new Uint32Array(6);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1)
      values[index] = Math.floor(Math.random() * 2 ** 32);
  }
  return `ROAM-${Array.from(values, (value) => alphabet[value % alphabet.length]).join("")}`;
}
const WORKSPACE_CODE_LS = "travel-app-workspace";

export function useInvite() {
  const inviteCode = useState("workspace-code", () => {
    return localStorage.getItem(WORKSPACE_CODE_LS) || createWorkspaceCode();
  });

  onMounted(() => {
    localStorage.setItem(WORKSPACE_CODE_LS, inviteCode.value);
  });
  const joined = useState("invite-joined", () => false);
  const deviceJoined = useState("invite-device-joined", () => false);

  function normalizeCode(value: string) {
    return value.trim().toUpperCase().replace(/\s|-/g, "");
  }

  function isValidCode(value: string) {
    return /^ROAM[A-Z2-9]{6}$/.test(normalizeCode(value));
  }

  function join(code: string) {
    const normalized = normalizeCode(code);
    if (!isValidCode(normalized)) return false;
    inviteCode.value = `ROAM-${normalized.slice(4)}`;
    joined.value = true;
    deviceJoined.value = true;
    return true;
  }

  return { inviteCode, joined, deviceJoined, normalizeCode, isValidCode, join };
}
