import {
  PARTICIPANT_ROLES,
  PERMISSIONS,
  PERMISSION_TO_SETTING,
  MANAGEMENT_PERMISSIONS,
} from "../constants/index.js";

/*
  Permission rules:
  - HOST can do everything.
  - Management permissions (remove / manage participants) need CO_HOST + the permission saved on the participant.
  - Feature permissions (chat, files, mic...) follow meeting.settings.
    A co-host who was given the permission can use it even if the setting is off.
*/
export function hasPermission(participant, meeting, permission) {
  if (!participant || participant.isRemoved) return false;
  if (participant.role === PARTICIPANT_ROLES.HOST) return true;

  const givenToParticipant = (participant.permissions || []).includes(permission);

  if (MANAGEMENT_PERMISSIONS.includes(permission)) {
    return participant.role === PARTICIPANT_ROLES.CO_HOST && givenToParticipant;
  }

  if (participant.role === PARTICIPANT_ROLES.CO_HOST && givenToParticipant) return true;

  const settingName = PERMISSION_TO_SETTING[permission];
  return Boolean(settingName && meeting.settings && meeting.settings[settingName] === true);
}

// The list the frontend uses to show/hide buttons. The backend still re-checks every action.
export function getEffectivePermissions(participant, meeting) {
  return Object.values(PERMISSIONS).filter((p) => hasPermission(participant, meeting, p));
}
