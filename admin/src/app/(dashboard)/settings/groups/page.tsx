import { redirect } from 'next/navigation';

/** Groups & access moved to the main Access section. */
export default function SettingsGroupsRedirectPage() {
  redirect('/access');
}
