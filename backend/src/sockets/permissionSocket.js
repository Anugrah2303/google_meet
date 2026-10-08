import ApiError from "../utils/ApiError.js";
import { settingsSchema, permissionsSchema } from "../validations/meeting.validation.js";
import { updateMeetingSettings } from "../services/permission.service.js";
import { findTarget, updateCoHostPermissions } from "../services/participant.service.js";
import { getMeetingContext, safeHandler } from "./socketUtils.js";

export function registerPermissionHandlers(io, socket) {
  /*
    update-permissions
    Client -> Server, one or both of:
      { meetingId, settings: { allowChat: false } }            meeting-wide switches
      { meetingId, participantId, permissions: ["CAN_CHAT"] }  a co-host's personal permissions

    Server replies to every connected client with "permissions-updated" (see permission.service.js).
  */
  socket.on(
    "update-permissions",
    safeHandler(socket, "update-permissions", async ({ meetingId, settings, participantId, permissions }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);

      const wantsSettings = settings !== undefined;
      const wantsCoHost = participantId !== undefined && permissions !== undefined;
      if (!wantsSettings && !wantsCoHost) throw new ApiError(400, "Send settings, or participantId + permissions");

      if (wantsSettings) {
        const parsed = settingsSchema.safeParse(settings);
        if (!parsed.success) throw new ApiError(422, parsed.error.issues[0].message);
        await updateMeetingSettings(io, meeting, participant, parsed.data);
      }

      if (wantsCoHost) {
        const parsed = permissionsSchema.safeParse({ permissions });
        if (!parsed.success) throw new ApiError(422, parsed.error.issues[0].message);
        const target = await findTarget(meeting, participantId);
        await updateCoHostPermissions(io, meeting, participant, target, parsed.data.permissions);
      }
    })
  );
}
