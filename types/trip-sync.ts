import type { TripSnapshot, TripSyncRole } from "~/types/trip";

export type SignalPayload =
  | { type: "offer"; description: RTCSessionDescriptionInit }
  | { type: "answer"; description: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit };

export type SignalingMessage =
  | { type: "join"; workspaceCode: string; peerId: string; role: TripSyncRole }
  | { type: "peer-joined" | "peer-present"; peerId: string; role: TripSyncRole }
  | { type: "peer-left"; peerId: string }
  | {
      type: "signal";
      targetPeerId?: string;
      fromPeerId?: string;
      signal: SignalPayload;
    }
  | { type: "error"; message: string };

export type DataMessage =
  | { type: "hello"; peerId: string; role: TripSyncRole }
  | { type: "snapshot-request"; messageId: string }
  | { type: "snapshot"; messageId: string; snapshot: TripSnapshot };
