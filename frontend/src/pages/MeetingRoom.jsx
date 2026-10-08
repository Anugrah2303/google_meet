import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMeeting, joinMeeting } from "@/api/meetings";
import PreJoinScreen from "@/components/meeting/PreJoinScreen";
import RoomSession from "@/components/meeting/RoomSession";
import Button from "@/components/ui/Button";
import { useMediaStream } from "@/hooks/useMediaStream";
import { getErrorMessage } from "@/lib/errors";

// key={meetingId}: opening another meeting starts from scratch (new camera stream, new socket session)
export default function MeetingRoom() {
  const { meetingId } = useParams();
  return <MeetingRoomInner key={meetingId} meetingId={meetingId} />;
}

function MeetingRoomInner({ meetingId }) {
  const location = useLocation();
  const media = useMediaStream(); // the camera stays on from the PreJoin screen into the room
  const [session, setSession] = useState(null); // { displayName, isMuted, isCameraOff } once joined
  const [joinError, setJoinError] = useState("");

  // Only members can read a meeting by id. Non-members get 403, which we simply ignore here.
  const lookup = useQuery({ queryKey: ["meeting", meetingId], queryFn: () => getMeeting(meetingId), retry: false });

  const join = useMutation({
    mutationFn: ({ displayName }) => joinMeeting(meetingId, displayName),
    onSuccess: (_data, values) => setSession(values),
    onError: (error) => {
      // 403 "host has not started", 403 "removed", 409 "ended"... the server message explains it
      const message = getErrorMessage(error, "Could not join the meeting");
      setJoinError(message);
      toast.error(message);
    },
  });

  if (lookup.error?.response?.status === 404) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-medium text-white">Meeting not found</h1>
        <p className="text-sm text-slate-400">It may have been deleted, or the link is wrong.</p>
        <Link to="/home"><Button>Back to home</Button></Link>
      </div>
    );
  }

  if (session) return <RoomSession meetingId={meetingId} stream={media.stream} session={session} />;

  const meeting = lookup.data?.meeting;
  return (
    <PreJoinScreen
      media={media}
      title={meeting?.title || location.state?.title}
      code={meeting?.meetingCode || location.state?.code}
      status={meeting?.status}
      joining={join.isPending}
      joinError={joinError}
      onJoin={(values) => {
        setJoinError("");
        join.mutate(values);
      }}
    />
  );
}

