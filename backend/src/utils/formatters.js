// Turns database documents into the shape we send to the frontend

export const idOf = (value) => String(value?._id ?? value);

export function formatParticipant(participant) {
  const p = participant.toObject ? participant.toObject() : participant;
  const populatedUser = p.user && p.user.name ? p.user : null;

  return {
    participantId: String(p._id),
    userId: idOf(populatedUser || p.user),
    displayName: p.displayName,
    avatar: populatedUser?.avatar || "",
    socketId: p.socketId,
    role: p.role,
    permissions: p.permissions,
    joinedAt: p.joinedAt,
    leftAt: p.leftAt,
    isOnline: p.isOnline,
    isMuted: p.isMuted,
    isCameraOff: p.isCameraOff,
    isScreenSharing: p.isScreenSharing,
    isHandRaised: p.isHandRaised,
    isFeatured: p.isFeatured,
  };
}

export function formatMeeting(meeting) {
  const m = meeting.toObject ? meeting.toObject() : meeting;
  const host = m.host && m.host.name ? { id: String(m.host._id), name: m.host.name, avatar: m.host.avatar } : idOf(m.host);

  return {
    id: String(m._id),
    meetingCode: m.meetingCode,
    title: m.title,
    host,
    status: m.status,
    scheduledAt: m.scheduledAt,
    startedAt: m.startedAt,
    endedAt: m.endedAt,
    settings: m.settings,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

export function formatMessage(message) {
  const m = message.toObject ? message.toObject() : message;
  const sender = m.sender && m.sender.name ? { userId: String(m.sender._id), name: m.sender.name, avatar: m.sender.avatar } : null;

  return {
    messageId: String(m._id),
    meetingId: String(m.meeting),
    sender,
    message: m.message,
    type: m.type,
    createdAt: m.createdAt,
  };
}
