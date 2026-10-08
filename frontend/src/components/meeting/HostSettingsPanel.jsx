import { useMemo } from "react";
import Switch from "@/components/ui/Switch";
import { CO_HOST_PERMISSION_OPTIONS, SETTING_OPTIONS } from "@/lib/constants";
import { emitRoom } from "@/lib/socket";
import { useMeetingStore } from "@/stores/meetingStore";

export default function HostSettingsPanel() {
  const settings = useMeetingStore((s) => s.meeting?.settings) || {};
  const participants = useMeetingStore((s) => s.participants);
  const isHost = useMeetingStore((s) => s.participants[s.meId]?.role === "HOST");
  const coHosts = useMemo(() => Object.values(participants).filter((p) => p.role === "CO_HOST"), [participants]);

  // The server sends "permissions-updated" to everybody, which updates the switches
  const setSetting = (key, value) => emitRoom("update-permissions", { settings: { [key]: value } });

  const toggleCoHostPermission = (coHost, key) => {
    const current = coHost.permissions || [];
    const next = current.includes(key) ? current.filter((p) => p !== key) : [...current, key];
    emitRoom("update-permissions", { participantId: coHost.participantId, permissions: next });
  };

  return (
    <div className="h-full overflow-y-auto">
      <section className="p-4">
        <h3 className="text-sm font-medium text-white">Everyone in this meeting</h3>
        <p className="mt-0.5 text-xs text-slate-400">Changes apply to all participants immediately.</p>
        <ul className="mt-3 space-y-3">
          {SETTING_OPTIONS.map(({ key, label, hint }) => (
            <li key={key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-100">{label}</p>
                <p className="text-xs text-slate-500">{hint}</p>
              </div>
              <Switch checked={settings[key] === true} onChange={(value) => setSetting(key, value)} label={label} />
            </li>
          ))}
        </ul>
      </section>

      {isHost && (
        <section className="border-t border-slate-800 p-4">
          <h3 className="text-sm font-medium text-white">Co-host permissions</h3>
          {coHosts.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">No co-hosts yet. Open a participant's menu and choose "Make co-host".</p>
          ) : (
            <div className="mt-3 space-y-4">
              {coHosts.map((coHost) => (
                <div key={coHost.participantId} className="rounded-xl bg-slate-900 p-3">
                  <p className="mb-2 text-sm text-white">{coHost.displayName}</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {CO_HOST_PERMISSION_OPTIONS.map(({ key, label }) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-blue-600"
                          checked={(coHost.permissions || []).includes(key)}
                          onChange={() => toggleCoHostPermission(coHost, key)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
