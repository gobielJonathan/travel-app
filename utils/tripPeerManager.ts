import type { TripSyncRole } from "~/types/trip";
import type { DataMessage, SignalPayload } from "~/types/trip-sync";

export type TripPeer = {
  peerId: string;
  role?: TripSyncRole;
  connection: RTCPeerConnection;
  channel?: RTCDataChannel;
  pendingCandidates: RTCIceCandidateInit[];
};

type TripPeerManagerOptions = {
  peerId: string;
  role: () => TripSyncRole;
  sendSignal: (targetPeerId: string, signal: SignalPayload) => void;
  onDataMessage: (peer: TripPeer, message: DataMessage) => void;
  onPeerStatusChange: (peerId: string, online: boolean) => void;
  onError: (message: string) => void;
};

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

function sendData(peer: TripPeer, message: DataMessage) {
  if (peer.channel?.readyState === "open") peer.channel.send(JSON.stringify(message));
}

export function createTripPeerManager(options: TripPeerManagerOptions) {
  const peers = new Map<string, TripPeer>();

  function onlinePeerIds() {
    return [...peers.values()]
      .filter((peer) => peer.channel?.readyState === "open")
      .map((peer) => peer.peerId);
  }

  function attachDataChannel(peer: TripPeer, channel: RTCDataChannel) {
    peer.channel = channel;
    channel.onopen = () => {
      options.onPeerStatusChange(peer.peerId, true);
      sendData(peer, { type: "hello", peerId: options.peerId, role: options.role() });
    };
    channel.onmessage = (event) => {
      try {
        options.onDataMessage(peer, JSON.parse(event.data) as DataMessage);
      } catch {
        options.onError("Invalid sync message");
      }
    };
    channel.onclose = () => options.onPeerStatusChange(peer.peerId, false);
    channel.onerror = () => options.onError(`Connection to ${peer.peerId} failed`);
  }

  function flushCandidates(peer: TripPeer) {
    for (const candidate of peer.pendingCandidates)
      void peer.connection.addIceCandidate(candidate).catch(() => undefined);
    peer.pendingCandidates = [];
  }

  function closePeer(remotePeerId: string) {
    const peer = peers.get(remotePeerId);
    if (!peer) return;
    peers.delete(remotePeerId);
    options.onPeerStatusChange(remotePeerId, false);
    peer.connection.close();
  }

  async function createPeer(remotePeerId: string, initiator: boolean, remoteRole?: TripSyncRole) {
    if (remotePeerId === options.peerId) return;
    const existingPeer = peers.get(remotePeerId);
    if (existingPeer) {
      existingPeer.role = remoteRole ?? existingPeer.role;
      return;
    }
    const connection = new RTCPeerConnection({ iceServers });
    const peer: TripPeer = {
      peerId: remotePeerId,
      role: remoteRole,
      connection,
      pendingCandidates: [],
    };
    peers.set(remotePeerId, peer);
    connection.onicecandidate = (event) => {
      if (event.candidate)
        options.sendSignal(remotePeerId, {
          type: "ice-candidate",
          candidate: event.candidate.toJSON(),
        });
    };
    connection.ondatachannel = (event) => attachDataChannel(peer, event.channel);
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === "failed" || connection.connectionState === "closed")
        closePeer(remotePeerId);
    };
    if (initiator) {
      try {
        attachDataChannel(peer, connection.createDataChannel("trip-sync"));
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        options.sendSignal(remotePeerId, { type: "offer", description: offer });
      } catch {
        closePeer(remotePeerId);
        options.onError(`Unable to connect to ${remotePeerId}`);
      }
    }
  }

  async function handleSignal(remotePeerId: string, signal: SignalPayload) {
    try {
      if (!peers.has(remotePeerId)) await createPeer(remotePeerId, false);
      const peer = peers.get(remotePeerId);
      if (!peer) return;
      if (signal.type === "offer") {
        await peer.connection.setRemoteDescription(signal.description);
        flushCandidates(peer);
        const answer = await peer.connection.createAnswer();
        await peer.connection.setLocalDescription(answer);
        options.sendSignal(peer.peerId, { type: "answer", description: answer });
      } else if (signal.type === "answer") {
        await peer.connection.setRemoteDescription(signal.description);
        flushCandidates(peer);
      } else if (signal.type === "ice-candidate") {
        if (peer.connection.remoteDescription)
          await peer.connection.addIceCandidate(signal.candidate);
        else peer.pendingCandidates.push(signal.candidate);
      }
    } catch {
      options.onError(`Unable to connect to ${remotePeerId}`);
    }
  }

  function send(remotePeerId: string, message: DataMessage) {
    const peer = peers.get(remotePeerId);
    if (peer) sendData(peer, message);
  }

  function broadcast(message: DataMessage, exceptPeerId?: string) {
    for (const peer of peers.values()) {
      if (peer.peerId !== exceptPeerId) sendData(peer, message);
    }
  }

  function closeAll() {
    for (const remotePeerId of peers.keys()) closePeer(remotePeerId);
  }

  return {
    createPeer,
    handleSignal,
    send,
    broadcast,
    onlinePeerIds,
    closePeer,
    closeAll,
  };
}
