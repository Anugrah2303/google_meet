import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdRefresh } from "react-icons/md";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { useAuthStore } from "@/stores/authStore";

export default function PreJoinScreen({ media, title, code, status, joining, joinError, onJoin }) {
  const user = useAuthStore((s) => s.user);
  const { stream, loading, error, retry, hasAudio, hasVideo } = media;
  const [name, setName] = useState(user?.name || "");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [nameError, setNameError] = useState("");
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  // The preview uses the same tracks we will send in the meeting, so toggling here is real
  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [stream, micOn]);
  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [stream, camOn]);

  const ended = status === "ENDED";

  const submit = (event) => {
    event.preventDefault();
    const displayName = name.trim();
    if (!displayName) return setNameError("Enter the name others will see");
    if (displayName.length > 50) return setNameError("Use 50 characters or fewer");
    setNameError("");
    onJoin({ displayName, isMuted: !micOn || !hasAudio, isCameraOff: !camOn || !hasVideo });
  };

  const showVideo = hasVideo && camOn;

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-800">
            <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full -scale-x-100 object-cover ${showVideo ? "" : "invisible"}`} />
            {loading && <div className="absolute inset-0 flex items-center justify-center text-slate-300"><Spinner className="h-8 w-8" /></div>}
            {!loading && !showVideo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <Avatar name={name || user?.name} src={user?.avatar} className="h-20 w-20 text-2xl" />
                {!hasVideo && <p className="text-sm text-slate-300">{error || "No camera available"}</p>}
                {hasVideo && !camOn && <p className="text-sm text-slate-300">Your camera is off</p>}
              </div>
            )}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-3">
              <button
                onClick={() => setMicOn((v) => !v)}
                disabled={!hasAudio}
                aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                title={hasAudio ? (micOn ? "Mute" : "Unmute") : "No microphone found"}
                className={`flex h-12 w-12 items-center justify-center rounded-full text-white disabled:opacity-40 ${micOn && hasAudio ? "bg-slate-700/90 hover:bg-slate-600" : "bg-red-600 hover:bg-red-500"}`}
              >
                {micOn && hasAudio ? <MdMic size={24} /> : <MdMicOff size={24} />}
              </button>
              <button
                onClick={() => setCamOn((v) => !v)}
                disabled={!hasVideo}
                aria-label={camOn ? "Turn camera off" : "Turn camera on"}
                title={hasVideo ? (camOn ? "Turn camera off" : "Turn camera on") : "No camera found"}
                className={`flex h-12 w-12 items-center justify-center rounded-full text-white disabled:opacity-40 ${camOn && hasVideo ? "bg-slate-700/90 hover:bg-slate-600" : "bg-red-600 hover:bg-red-500"}`}
              >
                {camOn && hasVideo ? <MdVideocam size={24} /> : <MdVideocamOff size={24} />}
              </button>
            </div>
          </div>

          {error && !loading && (
            <div role="alert" className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <span>{error}</span>
              <button onClick={retry} className="flex shrink-0 items-center gap-1 underline"><MdRefresh size={16} /> Try again</button>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <h1 className="text-2xl font-semibold text-white">{title || "Ready to join?"}</h1>
            {code && <p className="mt-1 text-sm text-slate-400">Code: {code}</p>}
          </div>
          <Input label="Your name in this meeting" value={name} onChange={(e) => setName(e.target.value)} error={nameError} maxLength={60} autoComplete="name" />
          {ended && <p role="alert" className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300">This meeting has ended, so you cannot join it.</p>}
          {joinError && !ended && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{joinError}</p>}
          <div className="flex gap-3">
            <Button type="submit" size="lg" loading={joining} disabled={loading || ended} className="flex-1">Join now</Button>
            <Link to="/home"><Button variant="secondary" size="lg">Cancel</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
