import { redirect } from 'react-router';
import { auth } from '~/lib/auth.server';

export async function action({ request }: { request: Request }) {
  const response = await auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });
  const cookie = response.headers.get('set-cookie');
  return redirect('/login', {
    headers: cookie ? { 'Set-Cookie': cookie } : {},
  });
}

export async function loader() {
  return redirect('/login');
}
