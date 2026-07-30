"use client";

import Link from "next/link";
import { MicrophoneIcon, StopIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar } from "@/features/talk/Avatar";
import { useTalkSession, type TalkStatus } from "@/features/talk/useTalkSession";
import type { TalkLevel } from "@/features/talk/scenarios";

const STATUS_LABEL: Record<TalkStatus, string> = {
  idle: "Ready",
  connecting: "Connecting…",
  live: "Listening",
  ended: "Ended",
  error: "Error",
};

function TranscriptLine({
  role,
  text,
  pending,
}: {
  role: "user" | "model";
  text: string;
  pending?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <p
        lang="ja"
        className={cn(
          "max-w-[80%] rounded-xl px-3 py-2 font-jp text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card",
          pending && "opacity-60",
        )}
      >
        {text}
      </p>
    </div>
  );
}

export function TalkRoom({
  scenario,
  level,
  title,
}: {
  scenario: string;
  level: TalkLevel;
  title: string;
}) {
  const { status, turns, liveUser, liveModel, amplitude, error, start, stop } =
    useTalkSession(scenario, level);
  const active = status === "live";
  const idle = status === "idle" || status === "ended" || status === "error";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Level {level} · {STATUS_LABEL[status]}
          </p>
        </div>
        <Link
          href="/talk"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Leave
        </Link>
      </div>

      <Avatar amplitude={amplitude} active={active} />

      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-center">
        {idle ? (
          <Button size="lg" onClick={() => void start()}>
            <MicrophoneIcon weight="fill" />
            {status === "ended" ? "Start again" : "Start conversation"}
          </Button>
        ) : (
          <Button
            size="lg"
            variant="destructive"
            onClick={() => void stop()}
            disabled={status === "connecting"}
          >
            <StopIcon weight="fill" />
            {status === "connecting" ? "Connecting…" : "End & save"}
          </Button>
        )}
      </div>

      <section aria-live="polite" className="space-y-2">
        {turns.map((turn, index) => (
          <TranscriptLine key={index} role={turn.role} text={turn.text} />
        ))}
        {liveUser && <TranscriptLine role="user" text={liveUser} pending />}
        {liveModel && <TranscriptLine role="model" text={liveModel} pending />}
        {turns.length === 0 && !liveUser && !liveModel && active && (
          <p className="text-center text-sm text-muted-foreground">
            Start speaking in Japanese…
          </p>
        )}
      </section>
    </div>
  );
}
