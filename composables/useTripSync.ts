type SocketMessage =
  | { type: "join"; workspaceCode: string; peerId: string }
  | { type: "member-joined" | "member-present" | "member-left"; peerId: string }
  | { type: "operation"; id: string; payload: unknown }
  | { type: "snapshot-request"; id: string; peerId?: string }
  | { type: "snapshot"; id: string; payload: unknown; peerId?: string };

function createId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useTripSync(workspaceCode: Ref<string>) {
  const status = ref<"offline" | "connecting" | "connected" | "error">("offline");
  const error = ref("");
  const peerCount = ref(0);
  const members = ref<string[]>([]);
  const peerId = createId();
  const seen = new Set<string>();
  let socket: WebSocket | null = null;
  const pendingMessages: SocketMessage[] = [];
  let onOperation: ((payload: unknown) => void) | undefined;
  let onSnapshot: ((payload: unknown) => void) | undefined;
  let getSnapshot: (() => unknown) | undefined;

  function send(message: SocketMessage) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return;
    }
    if (status.value === "connecting") pendingMessages.push(message);
  }

  function flushPendingMessages() {
    for (const message of pendingMessages) socket?.send(JSON.stringify(message));
    pendingMessages.length = 0;
  }

  function handleMessage(event: MessageEvent<string>) {
    try {
      const message = JSON.parse(event.data) as SocketMessage;
      if ("id" in message && seen.has(message.id)) return;
      if ("id" in message) seen.add(message.id);
      if (message.type === "member-joined" || message.type === "member-present") {
        if (!members.value.includes(message.peerId)) members.value.push(message.peerId);
        peerCount.value = members.value.length;
      } else if (message.type === "member-left") {
        members.value = members.value.filter((id) => id !== message.peerId);
        peerCount.value = members.value.length;
      } else if (message.type === "operation") {
        onOperation?.(message.payload);
      } else if (message.type === "snapshot-request") {
        const snapshot = getSnapshot?.();
        if (snapshot !== undefined)
          send({ type: "snapshot", id: message.id, payload: snapshot, peerId: message.peerId });
      } else if (message.type === "snapshot") {
        onSnapshot?.(message.payload);
      }
    } catch {
      status.value = "error";
      error.value = "Invalid sync message";
    }
  }

  function connect(
    callback: (payload: unknown) => void,
    snapshotCallback: (payload: unknown) => void,
    snapshotProvider: () => unknown,
  ) {
    if (!workspaceCode.value) return;
    onOperation = callback;
    onSnapshot = snapshotCallback;
    getSnapshot = snapshotProvider;
    status.value = "connecting";
    const url = new URL("/api/workspaces/signaling", window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(url);
    socket.onopen = () => {
      status.value = "connected";
      send({ type: "join", workspaceCode: workspaceCode.value, peerId });
      send({ type: "snapshot-request", id: createId() });
      flushPendingMessages();
    };
    socket.onmessage = handleMessage;
    socket.onerror = () => {
      status.value = "error";
      error.value = "Signaling unavailable";
    };
    socket.onclose = () => {
      if (status.value !== "offline") status.value = "error";
    };
  }

  function publish(payload: unknown) {
    const message = { type: "operation" as const, id: createId(), payload };
    seen.add(message.id);
    send(message);
  }

  function disconnect() {
    socket?.close();
    socket = null;
    pendingMessages.length = 0;
    members.value = [];
    peerCount.value = 0;
    status.value = "offline";
  }

  onBeforeUnmount(disconnect);
  return { status, error, peerCount, members, connect, publish, disconnect };
}
