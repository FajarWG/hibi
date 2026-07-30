import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { AppNav } from "@/components/app-nav";
import { StudyTimerDock } from "@/features/timer/StudyTimerDock";
import { getActiveTimer, getTodaySeconds } from "@/features/timer/lib";

/**
 * Otorisasi sebenarnya ada di sini, bukan di proxy.ts. Proxy hanya
 * mempercepat redirect; lapisan ini yang menentukan data siapa yang dibaca.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { timezone: true },
  });
  if (!user) redirect("/login");

  const [timer, todaySeconds] = await Promise.all([
    getActiveTimer(session.userId),
    getTodaySeconds(session.userId, user.timezone),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <AppNav username={session.username} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6">
        {children}
      </main>
      <StudyTimerDock
        key={`${timer?.id ?? "idle"}:${timer?.status ?? "idle"}:${timer?.elapsedSeconds ?? 0}`}
        timer={timer}
        todaySeconds={todaySeconds}
      />
    </div>
  );
}
