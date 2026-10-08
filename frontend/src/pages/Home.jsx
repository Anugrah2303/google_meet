import Navbar from "@/components/layout/Navbar";
import CreateMeetingCard from "@/components/home/CreateMeetingCard";
import JoinMeetingForm from "@/components/home/JoinMeetingForm";
import MyMeetingsList from "@/components/home/MyMeetingsList";
import MeetingHistoryList from "@/components/home/MeetingHistoryList";
import { useAuthStore } from "@/stores/authStore";

export default function Home() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-full">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-white">Hi, {user?.name?.split(" ")[0] || "there"}</h1>
        <p className="mt-1 text-slate-400">Start a new meeting or join one with a code.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <CreateMeetingCard />
          <JoinMeetingForm />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <MyMeetingsList />
          <MeetingHistoryList />
        </div>
      </main>
    </div>
  );
}
