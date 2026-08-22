import type { TripSnapshot, TripSyncRole, TripVersion } from "~/types/trip";
import { isTripSnapshot } from "~/types/trip";
import type { DataMessage, SignalingMessage } from "~/types/trip-sync";
import { createTripPeerManager, type TripPeer } from "~/utils/tripPeerManager";
export type SyncMember = {
  peerId: string;
  role: TripSyncRole;
  online: boolean;
};

function createId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function compareTripVersions(left: TripVersion, right: TripVersion) {
  if (left.counter !== right.counter) return left.counter - right.counter;
  return left.peerId.localeCompare(right.peerId);
}

export function useTripSync(
  workspaceCode: Ref<string>,
  role: Ref<TripSyncRole>,
  peerId: Ref<string>,
) {
  const status = ref<"offline" | "connecting" | "waiting" | "syncing" | "connected" | "error">(
    "offline",
  );
  const error = ref("");
  const peerCount = ref(0);
  const members = ref<SyncMember[]>([]);
  const bootstrapped = ref(role.value === "host");
  const seenMessages = new Set<string>();
  let socket: WebSocket | null = null;
  let getSnapshot: (() => TripSnapshot) | undefined;
  let applySnapshot: ((snapshot: TripSnapshot) => void) | undefined;
  let localVersion: TripVersion = { counter: 0, peerId: peerId.value };

  function updatePeerCount() {
    const onlinePeerIds = peerManager.onlinePeerIds();
    peerCount.value = onlinePeerIds.length;
    const onlinePeers = new Set(onlinePeerIds);
    members.value = members.value.map((member) => ({
      ...member,
      online: onlinePeers.has(member.peerId),
    }));
    if (status.value === "error") return;
    if (role.value === "crew" && !bootstrapped.value) {
      status.value = peerCount.value ? "syncing" : "waiting";
    } else if (socket?.readyState === WebSocket.OPEN) {
      status.value = "connected";
    }
  }

  function sendSignaling(message: SignalingMessage) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  function reportError(message: string) {
    status.value = "error";
    error.value = message;
  }

  function ensureMember(remotePeerId: string, remoteRole: TripSyncRole) {
    const member = members.value.find((item) => item.peerId === remotePeerId);
    if (member) {
      member.role = remoteRole;
      return;
    }
    members.value.push({ peerId: remotePeerId, role: remoteRole, online: false });
  }

  function handleSnapshot(message: Extract<DataMessage, { type: "snapshot" }>, peer: TripPeer) {
    if (seenMessages.has(message.messageId) || !isTripSnapshot(message.snapshot)) return;
    seenMessages.add(message.messageId);
    const isHostBootstrap = role.value === "crew" && !bootstrapped.value && peer.role === "host";
    const currentVersion = localVersion;
    localVersion = {
      counter: Math.max(localVersion.counter, message.snapshot.version.counter),
      peerId: localVersion.peerId,
    };
    if (!isHostBootstrap && compareTripVersions(message.snapshot.version, currentVersion) <= 0)
      return;
    applySnapshot?.(message.snapshot);
    localVersion = message.snapshot.version;
    if (isHostBootstrap) bootstrapped.value = true;
    updatePeerCount();
    peerManager.broadcast(message, peer.peerId);
  }

  function handleDataMessage(peer: TripPeer, message: DataMessage) {
    if (message.type === "hello") {
      peer.role = message.role;
      if (role.value === "crew" && !bootstrapped.value && peer.role === "host")
        peerManager.send(peer.peerId, { type: "snapshot-request", messageId: createId() });
    } else if (message.type === "snapshot-request") {
      if (role.value === "host" && getSnapshot) {
        peerManager.send(peer.peerId, {
          type: "snapshot",
          messageId: message.messageId,
          snapshot: getSnapshot(),
        });
      }
    } else if (message.type === "snapshot") {
      handleSnapshot(message, peer);
    }
  }

  const peerManager = createTripPeerManager({
    peerId: peerId.value,
    role: () => role.value,
    sendSignal: (targetPeerId, signal) => sendSignaling({ type: "signal", targetPeerId, signal }),
    onDataMessage: handleDataMessage,
    onPeerStatusChange: () => updatePeerCount(),
    onError: reportError,
  });

  function handleSignalingMessage(event: MessageEvent<string>) {
    try {
      const message = JSON.parse(event.data) as SignalingMessage;
      if (message.type === "peer-present") {
        ensureMember(message.peerId, message.role);
        void peerManager.createPeer(message.peerId, true, message.role);
      } else if (message.type === "peer-joined") {
        ensureMember(message.peerId, message.role);
        void peerManager.createPeer(message.peerId, false, message.role);
      } else if (message.type === "peer-left") {
        members.value = members.value.filter((member) => member.peerId !== message.peerId);
        peerManager.closePeer(message.peerId);
        updatePeerCount();
      } else if (message.type === "signal") {
        if (message.fromPeerId) {
          ensureMember(message.fromPeerId, role.value === "host" ? "crew" : "host");
          void peerManager.handleSignal(message.fromPeerId, message.signal);
        }
      } else if (message.type === "error") {
        reportError(message.message);
      }
    } catch {
      reportError("Invalid signaling message");
    }
  }

  function connect(
    snapshotProvider: () => TripSnapshot,
    snapshotConsumer: (snapshot: TripSnapshot) => void,
  ) {
    if (!workspaceCode.value || socket) return;
    if (typeof RTCPeerConnection === "undefined") {
      reportError("WebRTC is not supported in this browser");
      return;
    }
    getSnapshot = snapshotProvider;
    applySnapshot = snapshotConsumer;
    localVersion = snapshotProvider().version;
    status.value = role.value === "crew" && !bootstrapped.value ? "waiting" : "connecting";
    const url = new URL("/api/workspaces/signaling", window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(url);
    socket.onopen = () => {
      sendSignaling({
        type: "join",
        workspaceCode: workspaceCode.value,
        peerId: peerId.value,
        role: role.value,
      });
      updatePeerCount();
    };
    socket.onmessage = handleSignalingMessage;
    socket.onerror = () => reportError("Signaling unavailable");
    socket.onclose = () => {
      if (status.value !== "offline") {
        socket = null;
        peerManager.closeAll();
        members.value = members.value.map((member) => ({ ...member, online: false }));
        updatePeerCount();
        reportError("Signaling connection closed");
      }
    };
  }

  function publish(snapshot: TripSnapshot) {
    if (role.value === "crew" && !bootstrapped.value) return;
    localVersion = snapshot.version;
    const message: DataMessage = {
      type: "snapshot",
      messageId: createId(),
      snapshot,
    };
    seenMessages.add(message.messageId);
    peerManager.broadcast(message);
  }

  function disconnect() {
    socket?.close();
    socket = null;
    peerManager.closeAll();
    members.value = [];
    peerCount.value = 0;
    status.value = "offline";
  }

  onBeforeUnmount(disconnect);
  return { status, error, peerCount, members, bootstrapped, connect, publish, disconnect };
}
