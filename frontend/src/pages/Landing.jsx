import { Link } from "react-router-dom";
import { MdVideocam, MdScreenShare, MdChat, MdFiberManualRecord, MdAdminPanelSettings, MdAttachFile } from "react-icons/md";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";

const FEATURES = [
  { icon: MdScreenShare, title: "Present your screen", text: "Share a window or your whole screen with everyone in the call." },
  { icon: MdChat, title: "Chat and files", text: "Send messages and share documents without leaving the meeting." },
  { icon: MdFiberManualRecord, title: "Record the call", text: "Record the meeting and find the video again after it ends." },
  { icon: MdAdminPanelSettings, title: "Host controls", text: "Mute people, appoint co-hosts and switch features on or off live." },
  { icon: MdAttachFile, title: "Meeting history", text: "See every meeting you joined and how long you stayed." },
];

export default function Landing() {
  const token = useAuthStore((s) => s.token);

  return (
    <div className="min-h-full">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <span className="flex items-center gap-2 text-lg font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <MdVideocam size={20} />
          </span>
          Meetly
        </span>
        <div className="flex items-center gap-2">
          {token ? (
            <Link to="/home"><Button size="sm">Open app</Button></Link>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/register"><Button size="sm">Get started</Button></Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Video meetings that start with one click
            </h1>
            <p className="mt-5 max-w-lg text-lg text-slate-400">
              Create a meeting, share the code, and talk face to face. Camera, microphone, chat, files and recording
              all work in the browser.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={token ? "/home" : "/register"}><Button size="lg">{token ? "Start a meeting" : "Get started free"}</Button></Link>
              {!token && <Link to="/login"><Button size="lg" variant="secondary">Sign in</Button></Link>}
            </div>
          </div>

          {/* A small mock of the meeting room, drawn with divs */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-2xl">
            <div className="grid grid-cols-2 gap-2">
              {["Ana", "Ben", "Chen", "Dara"].map((name, i) => (
                <div key={name} className="relative flex aspect-video items-center justify-center rounded-xl bg-slate-800">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white ${["bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-rose-600"][i]}`}>
                    {name[0]}
                  </span>
                  <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">{name}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-2">
              {[MdVideocam, MdScreenShare, MdChat].map((Icon, i) => (
                <span key={i} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white"><Icon size={20} /></span>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <Icon size={24} className="text-blue-400" />
              <h3 className="mt-3 font-medium text-white">{title}</h3>
              <p className="mt-1 text-sm text-slate-400">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
