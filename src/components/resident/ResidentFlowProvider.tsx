"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type {
  ExtractionResponse,
  ResidentMatch,
  ResidentProfile,
  SocialPrescription,
} from "@shared/types";
import {
  extractCarePlan,
  extractIntake,
  findBestMatch,
  fetchProfile,
  findCandidates,
  recommendEvent,
  type MatchCandidate,
} from "@/lib/api";
import { recordAccepted } from "@/lib/accepted";
import { isProfileUsable, mergeProfile } from "@/lib/ui";
import { readBuiltProfile, saveProfile } from "@/lib/builtProfiles";

// ============================================================
// The resident flow's state, hoisted out of the page so it survives
// navigation between /profile, /pair and /schedule.
//
// This provider MUST live in layout.tsx, never template.tsx — templates
// remount on every navigation by design, which would reset everything on
// each tab click. It is also a module-level export on purpose: defining
// it inside the layout function would create a new component type per
// render and remount just as badly.
//
// Three contexts, not one: `carePlanText` changes on every keystroke,
// and a single context would re-render the summary rail and every
// subpage with it.
// ============================================================

interface FlowState {
  carePlanText: string;
  intakeText: string;
  carePlanResult: ExtractionResponse | null;
  intakeResult: ExtractionResponse | null;
  carePlanLoading: boolean;
  intakeLoading: boolean;
  carePlanCached: boolean;
  intakeCached: boolean;
  profileEdits: ResidentProfile | null;
  candidates: MatchCandidate[];
  match: ResidentMatch | null;
  matchLoading: boolean;
  matchCached: boolean;
  prescription: SocialPrescription | null;
  eventLoading: boolean;
  /** When the profile reveal ran, so returning to the tab doesn't replay it. */
  revealedAt: number | null;
  /** The profile already on file, loaded on mount. */
  onFile: ResidentProfile | null;
  onFileLoaded: boolean;
}

type Action =
  | { type: "setCarePlanText"; value: string }
  | { type: "setIntakeText"; value: string }
  | { type: "carePlanStart" }
  | { type: "carePlanDone"; result: ExtractionResponse; cached: boolean }
  | { type: "intakeStart" }
  | { type: "intakeDone"; result: ExtractionResponse; cached: boolean }
  | { type: "setProfileEdits"; profile: ResidentProfile }
  | { type: "matchStart" }
  | {
      type: "matchDone";
      match: ResidentMatch;
      candidates: MatchCandidate[];
      cached: boolean;
    }
  | { type: "eventStart" }
  | { type: "eventDone"; prescription: SocialPrescription }
  | { type: "settle"; status: "accepted" | "declined" }
  | { type: "onFile"; profile: ResidentProfile | null };

const initial: FlowState = {
  carePlanText: "",
  intakeText: "",
  carePlanResult: null,
  intakeResult: null,
  carePlanLoading: false,
  intakeLoading: false,
  carePlanCached: false,
  intakeCached: false,
  profileEdits: null,
  candidates: [],
  match: null,
  matchLoading: false,
  matchCached: false,
  prescription: null,
  eventLoading: false,
  revealedAt: null,
  onFile: null,
  onFileLoaded: false,
};

function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case "setCarePlanText":
      return { ...state, carePlanText: action.value };
    case "setIntakeText":
      return { ...state, intakeText: action.value };
    case "carePlanStart":
      return { ...state, carePlanLoading: true };
    case "carePlanDone":
      return {
        ...state,
        carePlanLoading: false,
        carePlanResult: action.result,
        carePlanCached: action.cached,
        profileEdits: null,
        revealedAt: Date.now(),
      };
    case "intakeStart":
      return { ...state, intakeLoading: true };
    case "intakeDone":
      return {
        ...state,
        intakeLoading: false,
        intakeResult: action.result,
        intakeCached: action.cached,
        profileEdits: null,
        revealedAt: Date.now(),
      };
    case "setProfileEdits":
      return { ...state, profileEdits: action.profile };
    case "matchStart":
      return { ...state, matchLoading: true, prescription: null };
    case "matchDone":
      return {
        ...state,
        matchLoading: false,
        match: action.match,
        candidates: action.candidates,
        matchCached: action.cached,
      };
    case "eventStart":
      return { ...state, eventLoading: true };
    case "eventDone":
      return { ...state, eventLoading: false, prescription: action.prescription };
    case "onFile":
      return { ...state, onFile: action.profile, onFileLoaded: true };
    case "settle":
      return {
        ...state,
        match: state.match ? { ...state.match, status: action.status } : null,
        prescription: state.prescription
          ? {
              ...state.prescription,
              status: action.status,
              match: { ...state.prescription.match, status: action.status },
            }
          : null,
      };
  }
}

/* ---------------- contexts ---------------- */

interface Docs {
  carePlanText: string;
  intakeText: string;
}

interface Results {
  residentId: string;
  residentName: string;
  carePlanResult: ExtractionResponse | null;
  intakeResult: ExtractionResponse | null;
  carePlanLoading: boolean;
  intakeLoading: boolean;
  carePlanCached: boolean;
  intakeCached: boolean;
  candidates: MatchCandidate[];
  match: ResidentMatch | null;
  matchLoading: boolean;
  matchCached: boolean;
  prescription: SocialPrescription | null;
  eventLoading: boolean;
  revealedAt: number | null;
  merged: ResidentProfile;
  /** True once there is any profile to show — on file or extracted. */
  extracted: boolean;
  /** True when this resident had no profile before this session. */
  needsProfile: boolean;
  settled: boolean;
}

interface Actions {
  setCarePlanText(v: string): void;
  setIntakeText(v: string): void;
  runCarePlan(): void;
  runIntake(): void;
  runMatch(companionId?: string): void;
  setProfileEdits(p: ResidentProfile): void;
  settle(status: "accepted" | "declined"): void;
}

const DocsContext = createContext<Docs | null>(null);
const ResultsContext = createContext<Results | null>(null);
const ActionsContext = createContext<Actions | null>(null);

function useCtx<T>(ctx: React.Context<T | null>, name: string): T {
  const v = useContext(ctx);
  if (!v) throw new Error(`${name} must be used inside ResidentFlowProvider`);
  return v;
}

export const useFlowDocs = () => useCtx(DocsContext, "useFlowDocs");
export const useFlowResults = () => useCtx(ResultsContext, "useFlowResults");
export const useFlowActions = () => useCtx(ActionsContext, "useFlowActions");

/* ---------------- provider ---------------- */

export default function ResidentFlowProvider({
  residentId,
  residentName,
  initialCarePlanText,
  initialIntakeText,
  children,
}: {
  residentId: string;
  residentName: string;
  initialCarePlanText: string;
  initialIntakeText: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    ...initial,
    carePlanText: initialCarePlanText,
    intakeText: initialIntakeText,
  });

  // Staff edits win, then anything extracted this session, then the
  // profile already on file. A resident who has been profiled before
  // opens straight into it — extraction is for updating, not for
  // rebuilding from scratch every visit.
  const merged = useMemo(() => {
    if (state.profileEdits) return state.profileEdits;
    const extractedNow =
      state.carePlanResult !== null || state.intakeResult !== null;
    if (!extractedNow && state.onFile) return state.onFile;
    const fresh = mergeProfile(
      residentId,
      state.carePlanResult,
      state.intakeResult
    );
    if (!state.onFile) return fresh;
    // An update should not blank fields the new document didn't mention.
    return {
      ...state.onFile,
      ...fresh,
      careNeeds: { ...state.onFile.careNeeds, ...fresh.careNeeds },
      interests: fresh.interests.length ? fresh.interests : state.onFile.interests,
      personality: { ...state.onFile.personality, ...fresh.personality },
      socialPreferences: {
        ...state.onFile.socialPreferences,
        ...fresh.socialPreferences,
      },
      personalityNote: fresh.personalityNote ?? state.onFile.personalityNote,
    };
  }, [
    state.profileEdits,
    state.onFile,
    residentId,
    state.carePlanResult,
    state.intakeResult,
  ]);

  const docs = useMemo<Docs>(
    () => ({ carePlanText: state.carePlanText, intakeText: state.intakeText }),
    [state.carePlanText, state.intakeText]
  );

  const results = useMemo<Results>(
    () => ({
      residentId,
      residentName,
      carePlanResult: state.carePlanResult,
      intakeResult: state.intakeResult,
      carePlanLoading: state.carePlanLoading,
      intakeLoading: state.intakeLoading,
      carePlanCached: state.carePlanCached,
      intakeCached: state.intakeCached,
      candidates: state.candidates,
      match: state.match,
      matchLoading: state.matchLoading,
      matchCached: state.matchCached,
      prescription: state.prescription,
      eventLoading: state.eventLoading,
      revealedAt: state.revealedAt,
      merged,
      extracted:
        state.onFile !== null ||
        state.carePlanResult !== null ||
        state.intakeResult !== null,
      needsProfile:
        state.onFileLoaded &&
        state.onFile === null &&
        state.carePlanResult === null &&
        state.intakeResult === null,
      settled:
        state.prescription?.status === "accepted" ||
        state.prescription?.status === "declined",
    }),
    [
      residentId,
      residentName,
      state.carePlanResult,
      state.intakeResult,
      state.carePlanLoading,
      state.intakeLoading,
      state.carePlanCached,
      state.intakeCached,
      state.candidates,
      state.match,
      state.matchLoading,
      state.matchCached,
      state.prescription,
      state.eventLoading,
      state.revealedAt,
      state.onFile,
      state.onFileLoaded,
      merged,
    ]
  );

  // Actions must keep a stable identity or every consumer re-renders on
  // each keystroke. They read current state through a ref updated after
  // render — safe because actions only ever fire from event handlers.
  useEffect(() => {
    let cancelled = false;
    // A profile built in the app wins over the server's copy — it is by
    // definition the newer of the two.
    const local = readBuiltProfile(residentId);
    if (local) {
      dispatch({ type: "onFile", profile: local });
      return;
    }
    fetchProfile(residentId).then((p) => {
      if (!cancelled) dispatch({ type: "onFile", profile: p });
    });
    return () => {
      cancelled = true;
    };
  }, [residentId]);

  // Persist whatever the profile currently is, so building one actually
  // changes the app: the roster stops flagging them, matching stops
  // refusing, and it survives navigating away.
  const usable = isProfileUsable(merged);
  const builtSignature = usable ? JSON.stringify(merged) : null;
  useEffect(() => {
    if (!builtSignature) return;
    saveProfile(residentId, JSON.parse(builtSignature) as ResidentProfile);
  }, [builtSignature, residentId]);

  const latestRef = useRef({ merged, state });
  useEffect(() => {
    latestRef.current = { merged, state };
  });

  const actions = useMemo<Actions>(() => {
    return {
      setCarePlanText: (value) => dispatch({ type: "setCarePlanText", value }),
      setIntakeText: (value) => dispatch({ type: "setIntakeText", value }),
      setProfileEdits: (profile) => dispatch({ type: "setProfileEdits", profile }),

      async runCarePlan() {
        dispatch({ type: "carePlanStart" });
        const { data, source } = await extractCarePlan(
          residentId,
          latestRef.current.state.carePlanText
        );
        dispatch({
          type: "carePlanDone",
          result: data,
          cached: source === "fallback",
        });
      },

      async runIntake() {
        dispatch({ type: "intakeStart" });
        const { data, source } = await extractIntake(
          residentId,
          latestRef.current.state.intakeText
        );
        dispatch({
          type: "intakeDone",
          result: data,
          cached: source === "fallback",
        });
      },

      async runMatch(companionId) {
        const profile = latestRef.current.merged;
        dispatch({ type: "matchStart" });

        const [ranked, best] = await Promise.all([
          findCandidates(residentId, profile),
          findBestMatch(residentId, profile, companionId),
        ]);

        dispatch({
          type: "matchDone",
          match: best.data,
          candidates: ranked.data,
          cached: best.source === "fallback",
        });

        // The pair is only useful with somewhere to put them.
        dispatch({ type: "eventStart" });
        const rec = await recommendEvent(best.data, profile);
        dispatch({ type: "eventDone", prescription: rec.data });
      },

      settle(status) {
        const p = latestRef.current.state.prescription;
        if (status === "accepted" && p) {
          recordAccepted(p.event.id, [
            p.match.residentAId,
            p.match.residentBId,
          ]);
        }
        dispatch({ type: "settle", status });
      },
    };
  }, [residentId]);

  return (
    <ActionsContext.Provider value={actions}>
      <ResultsContext.Provider value={results}>
        <DocsContext.Provider value={docs}>{children}</DocsContext.Provider>
      </ResultsContext.Provider>
    </ActionsContext.Provider>
  );
}
