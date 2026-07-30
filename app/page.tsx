import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

/** Landing penuh dibuat pada fase 6. Untuk fase fondasi, root hanya
 * mengarahkan ke tujuan yang benar tanpa menampilkan template bawaan. */
export default async function HomePage() {
  const session = await getSession();
  redirect(session ? "/today" : "/login");
}
