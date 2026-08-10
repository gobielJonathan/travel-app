type SignalMessage =
  | { type: "join"; workspaceCode: string; peerId: string }
  | { type: "offer" | "answer"; peerId: string; description: RTCSessionDescriptionInit }
  | { type: "candidate"; peerId: string; candidate: RTCIceCandidateInit }
  | { type: "leave"; peerId: string };

type SyncMessage = { type: "operation"; id: string; payload: unknown };

export function useTripSync(workspaceCode: Ref<string>) {
  const status = ref<"offline" | "connecting" | "connected" | "error">("offline");
  const error = ref("");
  const peerCount = ref(0);
  const peerId = crypto.randomUUID();
  const peers = new Map<string, RTCPeerConnection>();
  const channels = new Map<string, RTCDataChannel>();
  const seen = new Set<string>();
  let socket: WebSocket | null = null;
  let onOperation: ((payload: unknown) => void) | undefined;

  function sendSignal(message: SignalMessage) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  function broadcast(message: SyncMessage) {
    if (seen.has(message.id)) return;
    seen.add(message.id);
    for (const channel of channels.values()) {
      if (channel.readyState === "open") channel.send(JSON.stringify(message));
    }
  }

  function handleData(_peer: string, event: MessageEvent<string>) {
    try {
      const message = JSON.parse(event.data) as SyncMessage;
      if (message.type !== "operation" || seen.has(message.id)) return;
      seen.add(message.id);
      onOperation?.(message.payload);
      broadcast(message);
    } catch {
      error.value = "Invalid peer message";
    }
  }

  async function createPeer(remotePeerId: string, initiator: boolean) {
    if (peers.has(remotePeerId)) return peers.get(remotePeerId)!;
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peers.set(remotePeerId, connection);
    connection.onicecandidate = (event) => {
      if (event.candidate) sendSignal({ type: "candidate", peerId: remotePeerId, candidate: event.candidate.toJSON() });
    };
    connection.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(connection.connectionState)) {
        channels.delete(remotePeerId);
        peers.delete(remotePeerId);
        peerCount.value = peers.size;
      }
      if (connection.connectionState === "connected") status.value = "connected";
    };
    connection.ondatachannel = (event) => {
      channels.set(remotePeerId, event.channel);
      event.channel.onmessage = (message) => handleData(remotePeerId, message);
    };
    if (initiator) {
      const channel = connection.createDataChannel("trip-sync");
      channels.set(remotePeerId, channel);
      channel.onmessage = (event) => handleData(remotePeerId, event);
      channel.onopen = () => (status.value = "connected");
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      sendSignal({ type: "offer", peerId: remotePeerId, description: offer });
    }
    peerCount.value = peers.size;
    return connection;
  }

  async function connect(callback: (payload: unknown) => void) {
    if (!import.meta.client || !workspaceCode.value) return;
    onOperation = callback;
    status.value = "connecting";
    socket = new WebSocket(`${location.origin.replace(/^http/, "ws")}/api/workspaces/signaling`);
    socket.onopen = () => sendSignal({ type: "join", workspaceCode: workspaceCode.value, peerId });
    socket.onerror = () => {
      status.value = "error";
      error.value = "Signaling unavailable";
    };
    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data) as SignalMessage;
      if (message.peerId === peerId) return;
      if (message.type === "join") {
        const connection = await createPeer(message.peerId, true);
        void connection;
      } else if (message.type === "offer") {
        const connection = await createPeer(message.peerId, false);
        await connection.setRemoteDescription(message.description);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        sendSignal({ type: "answer", peerId: message.peerId, description: answer });
      } else if (message.type === "answer") {
        await peers.get(message.peerId)?.setRemoteDescription(message.description);
      } else if (message.type === "candidate") {
        await peers.get(message.peerId)?.addIceCandidate(message.candidate);
      }
    };
  }

  function publish(payload: unknown) {
    const message = { type: "operation" as const, id: crypto.randomUUID(), payload };
    broadcast(message);
  }

  function disconnect() {
    for (const connection of peers.values()) connection.close();
    peers.clear();
    channels.clear();
    socket?.close();
    socket = null;
    peerCount.value = 0;
    status.value = "offline";
  }

  onBeforeUnmount(disconnect);
  return { status, error, peerCount, connect, publish, disconnect };
}
