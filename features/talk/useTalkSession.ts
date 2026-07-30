"use client";

import { useCallback, useRef, useState } from "react";
import { GoogleGenAI, Modality, type Session } from "@google/genai";

import type { TalkLevel } from "@/features/talk/scenarios";
import { saveTalkSession } from "@/features/talk/actions";

export type TalkStatus = "idle" | "connecting" | "live" | "ended" | "error";
export type TalkTurn = { role: "user" | "model"; text: string; at: string };

const MIC_RATE = 16000;
const OUT_RATE = 24000;

// AudioWorklet inline: ubah Float32 mic menjadi PCM16 lalu kirim ke main thread.
const WORKLET = `
class PCMWorklet extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      const pcm = new Int16Array(ch.length);
      for (let i = 0; i < ch.length; i++) {
        const s = Math.max(-1, Math.min(1, ch[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}
registerProcessor("pcm-worklet", PCMWorklet);
`;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const out = new Float32Array(Math.floor(bytes.length / 2));
  for (let i = 0; i < out.length; i += 1) out[i] = view.getInt16(i * 2, true) / 0x8000;
  return out;
}

export function useTalkSession(scenario: string, level: TalkLevel) {
  const [status, setStatus] = useState<TalkStatus>("idle");
  const [turns, setTurns] = useState<TalkTurn[]>([]);
  const [liveUser, setLiveUser] = useState("");
  const [liveModel, setLiveModel] = useState("");
  const [amplitude, setAmplitude] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const playHeadRef = useRef(0);
  const userBufRef = useRef("");
  const modelBufRef = useRef("");

  const teardown = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    void micCtxRef.current?.close().catch(() => {});
    void playCtxRef.current?.close().catch(() => {});
    micStreamRef.current = null;
    micCtxRef.current = null;
    playCtxRef.current = null;
  }, []);

  const playAudio = useCallback((base64: string) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    const float = pcm16ToFloat32(base64);
    if (float.length === 0) return;
    const buffer = ctx.createBuffer(1, float.length, OUT_RATE);
    buffer.getChannelData(0).set(float);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, playHeadRef.current);
    source.start(startAt);
    playHeadRef.current = startAt + buffer.duration;
    let sum = 0;
    for (let i = 0; i < float.length; i += 1) sum += float[i] * float[i];
    setAmplitude(Math.sqrt(sum / float.length));
  }, []);

  const start = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const resp = await fetch("/api/ai/talk-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, level }),
      });
      if (!resp.ok) {
        setError(
          resp.status === 503
            ? "Conversation needs a Gemini API key on the server."
            : resp.status === 429
              ? "Too many attempts. Wait a moment."
              : "Could not start the session.",
        );
        setStatus("error");
        return;
      }
      const { token, model, systemInstruction } = (await resp.json()) as {
        token: string;
        model: string;
        systemInstruction: string;
      };

      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      });

      const session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => setStatus("live"),
          onmessage: (message) => {
            const content = message.serverContent;
            if (!content) return;
            if (content.inputTranscription?.text) {
              userBufRef.current += content.inputTranscription.text;
              setLiveUser(userBufRef.current);
            }
            if (content.outputTranscription?.text) {
              modelBufRef.current += content.outputTranscription.text;
              setLiveModel(modelBufRef.current);
            }
            for (const part of content.modelTurn?.parts ?? []) {
              const data = part.inlineData?.data;
              if (data && part.inlineData?.mimeType?.startsWith("audio/")) {
                playAudio(data);
              }
            }
            if (content.turnComplete) {
              const now = new Date().toISOString();
              const finalized: TalkTurn[] = [];
              if (userBufRef.current.trim()) {
                finalized.push({
                  role: "user",
                  text: userBufRef.current.trim(),
                  at: now,
                });
              }
              if (modelBufRef.current.trim()) {
                finalized.push({
                  role: "model",
                  text: modelBufRef.current.trim(),
                  at: now,
                });
              }
              if (finalized.length > 0) setTurns((prev) => [...prev, ...finalized]);
              userBufRef.current = "";
              modelBufRef.current = "";
              setLiveUser("");
              setLiveModel("");
            }
          },
          onerror: () => {
            setError("Connection error.");
            setStatus("error");
          },
          onclose: () => {
            setStatus((s) => (s === "error" ? s : "ended"));
          },
        },
      });
      sessionRef.current = session;

      // Microphone -> PCM16 -> Live
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      micStreamRef.current = stream;
      const micCtx = new AudioContext({ sampleRate: MIC_RATE });
      micCtxRef.current = micCtx;
      const url = URL.createObjectURL(
        new Blob([WORKLET], { type: "application/javascript" }),
      );
      await micCtx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new AudioWorkletNode(micCtx, "pcm-worklet");
      node.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        sessionRef.current?.sendRealtimeInput({
          media: {
            data: toBase64(event.data),
            mimeType: `audio/pcm;rate=${MIC_RATE}`,
          },
        });
      };
      micCtx.createMediaStreamSource(stream).connect(node);

      const playCtx = new AudioContext({ sampleRate: OUT_RATE });
      playCtxRef.current = playCtx;
      playHeadRef.current = playCtx.currentTime;
    } catch (cause) {
      const name = (cause as { name?: string }).name;
      setError(
        name === "NotAllowedError"
          ? "Microphone permission was denied."
          : name === "NotFoundError"
            ? "No microphone was found."
            : "Could not start the conversation.",
      );
      setStatus("error");
      teardown();
    }
  }, [scenario, level, playAudio, teardown]);

  const stop = useCallback(async () => {
    sessionRef.current?.close();
    sessionRef.current = null;
    teardown();
    setStatus("ended");
    const finalTurns =
      turns.length > 0
        ? turns
        : userBufRef.current || modelBufRef.current
          ? []
          : turns;
    if (finalTurns.length > 0) {
      try {
        await saveTalkSession({ scenario, level, turns: finalTurns, summary: null });
      } catch {
        // biarkan; transkrip tetap tampil di layar
      }
    }
  }, [scenario, level, turns, teardown]);

  return { status, turns, liveUser, liveModel, amplitude, error, start, stop };
}
