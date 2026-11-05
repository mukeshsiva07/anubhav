import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function AppPage() {
  const session = await getSession();
  if (!session) {
    redirect('/');
  }
  if (session.role === 'employee') {
    redirect('/app/home');
  } else {
    redirect('/app/ask');
  }
}
