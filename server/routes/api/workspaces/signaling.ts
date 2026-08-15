import { defineWebSocketHandler } from "h3";

type RoomMember = { peerId: string; socket: { send: (message: string) => void } };
const rooms = new Map<string, Set<RoomMember>>();

function send(socket: RoomMember["socket"], message: unknown) {
  socket.send(JSON.stringify(message));
}

export default defineWebSocketHandler({
  open() {},
  close(peer) {
    for (const [code, members] of rooms) {
      const member = [...members].find((item) => item.socket === peer);
      if (!member) continue;
      members.delete(member);
      for (const item of members) send(item.socket, { type: "member-left", peerId: member.peerId });
      if (!members.size) rooms.delete(code);
    }
  },
  message(peer, message) {
    try {
      const payload = JSON.parse(message.text()) as {
        type?: string;
        workspaceCode?: string;
        peerId?: string;
        id?: string;
        payload?: unknown;
      };
      if (payload.type === "join" && payload.workspaceCode && payload.peerId) {
        const code = payload.workspaceCode.trim().toUpperCase();
        const members = rooms.get(code) ?? new Set<RoomMember>();
        for (const item of members) {
          if (item.peerId === payload.peerId || item.socket === peer) members.delete(item);
        }
        const member = { peerId: payload.peerId, socket: peer };
        members.add(member);
        rooms.set(code, members);
        for (const item of members) {
          if (item.socket === peer) continue;
          send(item.socket, { type: "member-joined", peerId: payload.peerId });
          send(peer, { type: "member-present", peerId: item.peerId });
        }
        return;
      }
      const members = [...rooms.values()].find((items) =>
        [...items].some((item) => item.socket === peer),
      );
      if (!members) return;
      if (payload.type === "snapshot-request") {
        const requester = [...members].find((item) => item.socket === peer);
        if (!requester) return;
        for (const item of members) {
          if (item.socket !== peer)
            send(item.socket, {
              type: "snapshot-request",
              id: payload.id,
              peerId: requester.peerId,
            });
        }
        return;
      }
      for (const item of members) {
        if (item.socket !== peer) send(item.socket, payload);
      }
    } catch {
      send(peer, { type: "error", message: "Invalid sync message" });
    }
  },
});
