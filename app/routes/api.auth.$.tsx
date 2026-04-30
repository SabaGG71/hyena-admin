import { auth } from '~/lib/auth.server';

export async function loader({ request }: { request: Request }) {
  return auth.handler(request);
}

export async function action({ request }: { request: Request }) {
  return auth.handler(request);
}
