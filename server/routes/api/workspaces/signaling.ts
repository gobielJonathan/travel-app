import { defineWebSocketHandler } from "h3";

type WorkspaceRole = "host" | "crew";
type RoomMember = {
  peerId: string;
  role: WorkspaceRole;
  socket: { send: (message: string) => void };
};
const rooms = new Map<string, Set<RoomMember>>();

function send(socket: RoomMember["socket"], message: unknown) {
  try {
    socket.send(JSON.stringify(message));
    return true;
  } catch {
    return false;
  }
}

function redactWorkspaceCode(code: string) {
  return `${code.slice(0, 5)}…${code.slice(-4)}`;
}

export default defineWebSocketHandler({
  open() {},
  close(peer) {
    for (const [code, members] of rooms) {
      const member = [...members].find((item) => item.socket === peer);
      if (!member) continue;
      members.delete(member);
      for (const item of members) send(item.socket, { type: "peer-left", peerId: member.peerId });
      if (!members.size) rooms.delete(code);
    }
  },
  message(peer, message) {
    try {
      const payload = JSON.parse(message.text()) as {
        type?: string;
        workspaceCode?: string;
        peerId?: string;
        role?: WorkspaceRole;
        targetPeerId?: string;
        signal?: unknown;
      };
      if (payload.type === "join" && payload.workspaceCode && payload.peerId) {
        const code = payload.workspaceCode.trim().toUpperCase();
        if (
          !/^ROAM-[A-Z2-9]{6}$/.test(code) ||
          (payload.role !== "host" && payload.role !== "crew")
        ) {
          send(peer, { type: "error", message: "Invalid workspace join" });
          return;
        }
        const members = rooms.get(code) ?? new Set<RoomMember>();
        for (const item of members) {
          if (item.peerId === payload.peerId || item.socket === peer) members.delete(item);
        }
        const member = { peerId: payload.peerId, role: payload.role, socket: peer };
        members.add(member);
        rooms.set(code, members);
        if (member.role === "crew") {
          console.info(
            `[workspace] crew joined ${redactWorkspaceCode(code)} peer=${member.peerId} members=${members.size}`,
          );
        }
        for (const item of members) {
          if (item.socket === peer) continue;
          const delivered = send(item.socket, {
            type: "peer-joined",
            peerId: payload.peerId,
            role: payload.role,
          });
          if (delivered) send(peer, { type: "peer-present", peerId: item.peerId, role: item.role });
          else members.delete(item);
        }
        if (!members.size) rooms.delete(code);
        return;
      }
      const members = [...rooms.values()].find((items) =>
        [...items].some((item) => item.socket === peer),
      );
      if (!members) return;
      if (payload.type === "signal" && payload.targetPeerId && payload.signal !== undefined) {
        const target = [...members].find((item) => item.peerId === payload.targetPeerId);
        const sender = [...members].find((item) => item.socket === peer);
        if (target && sender) {
          const delivered = send(target.socket, {
            type: "signal",
            fromPeerId: sender.peerId,
            signal: payload.signal,
          });
          if (!delivered) {
            members.delete(target);
            send(sender.socket, { type: "peer-left", peerId: target.peerId });
          }
        }
        return;
      }
    } catch {
      send(peer, { type: "error", message: "Invalid sync message" });
    }
  },
});
