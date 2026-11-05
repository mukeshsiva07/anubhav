import { redirect } from 'next/navigation';

export default function RecordRedirectPage() {
  redirect('/app/entries');
}
