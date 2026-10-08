// Which management actions may I show for this participant?
// Mirrors the backend rules (participant.service.js). The server still re-checks everything.
export function getParticipantActions(me, target, permissions) {
  if (!me || !target) return {};

  const isSelf = me.participantId === target.participantId;
  const isHost = me.role === "HOST";
  const canManage = permissions.includes("CAN_MANAGE_PARTICIPANTS");
  const canRemove = permissions.includes("CAN_REMOVE_PARTICIPANT");

  // The host can manage everybody (except themselves here). Co-hosts only regular participants.
  const mayManageTarget =
    !isSelf && target.role !== "HOST" && (isHost || (me.role === "CO_HOST" && target.role === "PARTICIPANT"));

  return {
    feature: canManage && !target.isFeatured,
    unfeature: canManage && target.isFeatured,
    mute: canManage && mayManageTarget && !target.isMuted,
    lowerHand: canManage && !isSelf && target.isHandRaised,
    remove: canRemove && mayManageTarget,
    promote: isHost && target.role === "PARTICIPANT",
    demote: isHost && target.role === "CO_HOST",
  };
}
