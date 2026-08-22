import type { TripSyncRole } from "~/types/trip";

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
const WORKSPACE_ROLE_LS = "travel-app-workspace-role";

export function useInvite() {
  const route = useRoute();
  const inviteCode = useState("workspace-code", () => {
    const queryCode = typeof route.query.room === "string" ? normalizeCode(route.query.room) : "";
    return isValidCode(queryCode)
      ? `ROAM-${queryCode.slice(4)}`
      : localStorage.getItem(WORKSPACE_CODE_LS) || createWorkspaceCode();
  });
  const role = useState<TripSyncRole>("workspace-role", () => {
    return localStorage.getItem(WORKSPACE_ROLE_LS) === "crew" ? "crew" : "host";
  });

  onMounted(() => {
    const queryCode = typeof route.query.room === "string" ? normalizeCode(route.query.room) : "";
    if (isValidCode(queryCode)) {
      inviteCode.value = `ROAM-${queryCode.slice(4)}`;
      role.value = "crew";
    }
    localStorage.setItem(WORKSPACE_CODE_LS, inviteCode.value);
    localStorage.setItem(WORKSPACE_ROLE_LS, role.value);
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
    role.value = "crew";
    localStorage.setItem(WORKSPACE_CODE_LS, inviteCode.value);
    localStorage.setItem(WORKSPACE_ROLE_LS, role.value);
    joined.value = true;
    deviceJoined.value = true;
    return true;
  }

  function createNewWorkspace() {
    inviteCode.value = createWorkspaceCode();
    role.value = "host";
    joined.value = false;
    deviceJoined.value = false;
    localStorage.setItem(WORKSPACE_CODE_LS, inviteCode.value);
    localStorage.setItem(WORKSPACE_ROLE_LS, role.value);
    return inviteCode.value;
  }

  return {
    inviteCode,
    role,
    joined,
    deviceJoined,
    normalizeCode,
    isValidCode,
    join,
    createNewWorkspace,
  };
}
