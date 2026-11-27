import { useState } from "react";
import { BellRing, Smartphone, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { Spinner } from "../../components/ui/Spinner";
import { useDeleteNotificationDevice, useNotificationSettings, useUpdateNotificationPreferences } from "./notificationsQueries";
import type { NotificationPreferences } from "./notifications.types";
import { browserPushSupported, enableBrowserPush, removeCurrentBrowserPush } from "./firebaseWeb";

const categories: Array<{ key: keyof Pick<NotificationPreferences, "postLikes" | "comments" | "mentions" | "messages" | "connections" | "groups" | "marketplace" | "platformUpdates">; label: string; description: string }> = [
  { key: "postLikes", label: "Likes", description: "Reactions to your posts" },
  { key: "comments", label: "Comments and shares", description: "Comments, replies, and shares of your posts" },
  { key: "messages", label: "Messages", description: "New direct messages" },
  { key: "connections", label: "Connections", description: "Connection requests and acceptances" },
  { key: "groups", label: "Groups", description: "Invitations and group activity" },
  { key: "marketplace", label: "Opportunities", description: "Applications, proposals, and interviews" },
  { key: "platformUpdates", label: "Platform and account updates", description: "Moderation and important account updates" },
];

export function NotificationSettingsPage() {
  const settings = useNotificationSettings();
  const preferencesMutation = useUpdateNotificationPreferences();
  const deleteDevice = useDeleteNotificationDevice();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const preferences = settings.data?.preferences;

  async function setPreference(key: keyof NotificationPreferences, value: boolean) {
    setMessage(null);
    try { await preferencesMutation.mutateAsync({ [key]: value }); }
    catch { setMessage("Could not save this preference. Please try again."); }
  }

  async function enablePush() {
    setBusy(true); setMessage(null);
    try {
      await enableBrowserPush();
      await preferencesMutation.mutateAsync({ pushEnabled: true });
      setMessage("Browser notifications are enabled on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not enable browser notifications.");
    } finally { setBusy(false); }
  }

  async function removeDevice(deviceId: string, label: string) {
    setBusy(true); setMessage(null);
    try {
      if (label === "This browser") await removeCurrentBrowserPush();
      await deleteDevice.mutateAsync(deviceId);
      setMessage("This device was removed from push notifications.");
    } catch { setMessage("Could not remove this device. Please try again."); }
    finally { setBusy(false); }
  }

  if (settings.isPending) return <main className="mx-auto min-h-screen max-w-3xl px-4 py-8"><Card className="flex justify-center py-12"><Spinner label="Loading notification settings" /></Card></main>;
  if (settings.isError || !preferences) return <main className="mx-auto min-h-screen max-w-3xl px-4 py-8"><ErrorMessage title="Could not load notification settings" message="Please try again." onRetry={() => void settings.refetch()} /></main>;

  return <main className="min-h-screen bg-page px-4 py-8 sm:px-6"><div className="mx-auto max-w-3xl space-y-6">
    <header><p className="text-sm font-semibold uppercase tracking-wider text-brand">Your account</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-navy">Notification settings</h1><p className="mt-2 text-sm text-muted">Choose which updates SkillBridge sends and where they appear.</p></header>
    {message ? <p role="status" className="rounded-xl border border-brand/20 bg-brand/5 p-3 text-sm text-ink">{message}</p> : null}
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-navy"><BellRing className="h-5 w-5 text-brand" />Delivery</h2>
      <div className="mt-4 divide-y divide-line">
        <PreferenceRow label="In-app notifications" description="Show updates in your SkillBridge notification center." checked={preferences.inAppEnabled} disabled={preferencesMutation.isPending} onChange={(value) => void setPreference("inAppEnabled", value)} />
        <PreferenceRow label="Browser push notifications" description="Receive alerts when this site is not open, subject to browser and device support." checked={preferences.pushEnabled} disabled={preferencesMutation.isPending || busy} onChange={(value) => value ? void enablePush() : void setPreference("pushEnabled", false)} actionLabel={preferences.pushEnabled ? "Enabled" : "Enable on this browser"} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-page p-3">
        <p className="max-w-xl text-sm text-muted">Each phone or computer must be registered separately, even when browser push is already enabled for your account.</p>
        <button type="button" onClick={() => void enablePush()} disabled={preferencesMutation.isPending || busy} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Setting up…" : "Set up this browser"}</button>
      </div>
      {!browserPushSupported() ? <p className="mt-3 text-sm text-muted">This browser does not support web push notifications.</p> : null}
    </Card>
    <Card>
      <h2 className="text-lg font-semibold text-navy">Notification categories</h2><p className="mt-1 text-sm text-muted">These category choices apply to both in-app and browser notifications.</p>
      <div className="mt-4 divide-y divide-line">{categories.map((category) => <PreferenceRow key={category.key} label={category.label} description={category.description} checked={preferences[category.key]} disabled={preferencesMutation.isPending} onChange={(value) => void setPreference(category.key, value)} />)}</div>
    </Card>
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-navy"><Smartphone className="h-5 w-5 text-brand" />Push devices</h2><p className="mt-1 text-sm text-muted">Remove browsers that should no longer receive push notifications.</p>
      {settings.data.devices.length ? <ul className="mt-4 divide-y divide-line">{settings.data.devices.map((device) => <li key={device.id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block font-medium text-ink">{device.label}</span><span className="block text-xs text-muted">Last active {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(device.lastSeenAt))}</span></span><button type="button" disabled={busy || deleteDevice.isPending} onClick={() => void removeDevice(device.id, device.label)} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger-strong disabled:opacity-50" aria-label={`Remove ${device.label}`}><Trash2 className="h-4 w-4" /></button></li>)}</ul> : <p className="mt-4 text-sm text-muted">No browsers are registered for push notifications.</p>}
    </Card>
  </div></main>;
}

function PreferenceRow({ label, description, checked, disabled, onChange, actionLabel }: { label: string; description: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void; actionLabel?: string }) {
  return <label className="flex items-center justify-between gap-4 py-4"><span><span className="block text-sm font-semibold text-ink">{label}</span><span className="mt-0.5 block text-sm text-muted">{description}</span></span><span className="inline-flex shrink-0 items-center gap-2">{actionLabel ? <span className="hidden text-xs font-medium text-muted sm:inline">{actionLabel}</span> : null}<input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-brand disabled:opacity-50" /></span></label>;
}
