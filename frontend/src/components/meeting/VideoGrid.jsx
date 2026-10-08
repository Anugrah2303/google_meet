import { useMemo } from "react";
import clsx from "clsx";
import VideoTile from "./VideoTile";
import { useMeetingStore } from "@/stores/meetingStore";

// Tailwind needs full class names written out, so the columns are listed here
function gridClass(count) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 6) return "grid-cols-2 lg:grid-cols-3";
  if (count <= 9) return "grid-cols-2 lg:grid-cols-3";
  return "grid-cols-2 lg:grid-cols-4";
}

export default function VideoGrid({ localStream, screenStream }) {
  const participants = useMeetingStore((s) => s.participants);
  const remoteStreams = useMeetingStore((s) => s.remoteStreams);
  const peerStates = useMeetingStore((s) => s.peerStates);
  const meId = useMeetingStore((s) => s.meId);

  const tiles = useMemo(() => {
    const list = Object.values(participants).sort((a, b) => (a.participantId === meId ? -1 : b.participantId === meId ? 1 : 0));
    return list.map((participant) => {
      const isLocal = participant.participantId === meId;
      return {
        participant,
        isLocal,
        // while I present, my own tile shows the screen I am sharing
        stream: isLocal ? screenStream || localStream : remoteStreams[participant.participantId],
        peerState: peerStates[participant.participantId],
      };
    });
  }, [participants, remoteStreams, peerStates, meId, localStream, screenStream]);

  // Presenting wins over featured
  const main = tiles.find((t) => t.participant.isScreenSharing) || tiles.find((t) => t.participant.isFeatured);

  const renderTile = (tile, className) => (
    <VideoTile key={tile.participant.participantId} participant={tile.participant} stream={tile.stream} isLocal={tile.isLocal} peerState={tile.peerState} className={className} />
  );

  if (main) {
    const others = tiles.filter((t) => t !== main);
    return (
      <div className="flex h-full min-h-0 flex-col gap-2 lg:flex-row">
        <div className="min-h-0 flex-1">{renderTile(main)}</div>
        {others.length > 0 && (
          <div className="flex shrink-0 gap-2 overflow-auto lg:w-56 lg:flex-col">
            {others.map((tile) => (
              <div key={tile.participant.participantId} className="aspect-video h-28 shrink-0 lg:h-auto lg:w-full">
                {renderTile(tile)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className={clsx("grid h-full auto-rows-fr gap-2", gridClass(tiles.length))}>
        {tiles.map((tile) => (
          <div key={tile.participant.participantId} className="min-h-40">
            {renderTile(tile)}
          </div>
        ))}
      </div>
    </div>
  );
}
