import type { FormEvent, ReactElement } from "react";
import { useUpdateProfile } from "./profileEditMutations";
import type { OwnerProfile } from "../../../types/profile";
import { ProfileSection } from "../ProfileSection";

export function ProfilePreferencesForm({ profile }: { profile: OwnerProfile }): ReactElement {
  const mutation = useUpdateProfile();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const spokenLanguages = String(data.get("spokenLanguages") ?? "").split(",").map((value) => value.trim()).filter(Boolean).slice(0, 20);
    mutation.mutate({ spokenLanguages, allowCommunityInvites: data.get("allowCommunityInvites") === "on" });
  }
  return <ProfileSection title="Languages & community settings" description="Show the languages you speak and choose who can invite you into communities.">
    <form key={`${profile.spokenLanguages.join(",")}-${profile.allowCommunityInvites}`} onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium text-ink">Languages you speak<input name="spokenLanguages" defaultValue={profile.spokenLanguages.join(", ")} maxLength={600} placeholder="English, Yoruba, French" className="mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm" /><span className="mt-1 block text-xs font-normal text-muted">Separate languages with commas. They appear on your profile.</span></label>
      <label className="flex items-start gap-3 rounded-xl border border-line p-3"><input name="allowCommunityInvites" type="checkbox" defaultChecked={profile.allowCommunityInvites} className="mt-1" /><span><span className="block text-sm font-semibold text-navy">Allow community invitations</span><span className="mt-0.5 block text-xs text-muted">Your connections can invite you to communities. Turn this off to decline all new invitations.</span></span></label>
      {mutation.isError ? <p role="alert" className="text-sm text-danger">Could not save these settings. Check your connection and try again.</p> : null}
      {mutation.isSuccess ? <p role="status" className="text-sm text-success">Settings saved.</p> : null}
      <button type="submit" disabled={mutation.isPending} className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{mutation.isPending ? "Saving…" : "Save settings"}</button>
    </form>
  </ProfileSection>;
}
