/*
  In-memory state: who is connected RIGHT NOW.

  MongoDB remembers participants forever (history).
  This file only knows about live sockets. If the server restarts, it is empty again,
  and that is correct, because every socket was disconnected.

  rooms:   meetingId -> Map(socketId -> { socketId, participantId, userId })
  sockets: socketId  -> { meetingId, participantId, userId }
*/
const rooms = new Map();
const sockets = new Map();

export function addToRoom(meetingId, socketId, participantId, userId) {
  meetingId = String(meetingId);
  const info = { socketId, participantId: String(participantId), userId: String(userId) };

  if (!rooms.has(meetingId)) rooms.set(meetingId, new Map());
  rooms.get(meetingId).set(socketId, info);
  sockets.set(socketId, { meetingId, participantId: info.participantId, userId: info.userId });
}

export function removeFromRoom(socketId) {
  const info = sockets.get(socketId);
  if (!info) return null;

  sockets.delete(socketId);
  const room = rooms.get(info.meetingId);
  if (room) {
    room.delete(socketId);
    if (room.size === 0) rooms.delete(info.meetingId);
  }
  return info;
}

export const getSocketInfo = (socketId) => sockets.get(socketId) || null;

export const getRoomMembers = (meetingId) => Array.from(rooms.get(String(meetingId))?.values() || []);

export function getSocketIdByParticipant(meetingId, participantId) {
  const member = getRoomMembers(meetingId).find((m) => m.participantId === String(participantId));
  return member ? member.socketId : null;
}

export function clearRoom(meetingId) {
  for (const member of getRoomMembers(meetingId)) sockets.delete(member.socketId);
  rooms.delete(String(meetingId));
}
