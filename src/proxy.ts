import { handleAuthProxy } from "@/lib/auth/proxy-handler";

export async function proxy(request: Parameters<typeof handleAuthProxy>[0]) {
  return handleAuthProxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
