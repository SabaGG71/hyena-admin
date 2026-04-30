/**
 * One-time setup route: creates the admin user if not yet created.
 * Visit /setup once after deploying. It becomes a no-op after that.
 */
import { redirect } from 'react-router';
import { auth } from '~/lib/auth.server';
import { prisma } from '~/lib/prisma.server';

const ADMIN_EMAIL = 'hyena.shopping@gmail.com';
const ADMIN_PASSWORD = 'Hyena2026!!';
const ADMIN_NAME = 'Hyena Admin';

export async function loader({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) return redirect('/');

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) return redirect('/login');

  await auth.api.signUpEmail({
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
    },
  });

  return redirect('/login');
}
