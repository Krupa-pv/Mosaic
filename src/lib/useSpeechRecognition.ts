"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// Minimal shape of the Web Speech API we actually use. It's a browser
// feature with no TS lib types, so we declare just enough.
type SpeechResult = { transcript: string };
type SpeechAlt = { 0: SpeechResult; isFinal: boolean; length: number };
type SpeechEvent = {
  resultIndex: number;
  results: { [i: number]: SpeechAlt; length: number };
};
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Voice capture for the intake pane. Per the design doc this is the
 * riskiest single item — so it degrades to `supported: false` and the
 * pane stays fully usable by typing.
 */
// Support is a browser fact, not React state — and it must read as `false`
// during SSR so the server and first client render agree.
const noopSubscribe = () => () => {};
const isSupported = () => getCtor() !== null;
const notSupported = () => false;

export function useSpeechRecognition(onTranscript: (chunk: string) => void) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    isSupported,
    notSupported
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const cbRef = useRef(onTranscript);

  useEffect(() => {
    cbRef.current = onTranscript;
  });

  useEffect(() => () => recRef.current?.stop(), []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) cbRef.current(r[0].transcript.trim());
      }
    };
    rec.onerror = (e) => {
      setError(
        e.error === "not-allowed"
          ? "Microphone access denied."
          : "Voice capture failed — type the intake note instead."
      );
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  return { supported, listening, error, start, stop };
}
