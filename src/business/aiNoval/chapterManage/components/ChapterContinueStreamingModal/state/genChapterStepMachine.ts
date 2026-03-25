import { useMemo, useReducer } from "react";

export type GenChapterStepId =
  | "start"
  | "prepareInputs"
  | "aggregateContext"
  | "writerDraft"
  | "critic2"
  | "critic1"
  | "critic3"
  | "modifier"
  | "polish"
  | "end";

export type GenChapterStepStatus =
  | "idle"
  | "pending"
  | "running"
  | "success"
  | "error"
  | "skipped";

export interface GenChapterStepStateItem {
  id: GenChapterStepId;
  title: string;
  status: GenChapterStepStatus;
  detail?: string;
  startedAt?: number;
  endedAt?: number;
}

export interface GenChapterStepsState {
  runId: number;
  currentStepId?: GenChapterStepId;
  steps: GenChapterStepStateItem[];
  round: number;
  maxRounds: number;
}

type Action =
  | { type: "reset" }
  | { type: "startRun"; runId: number }
  | { type: "setRounds"; round: number; maxRounds: number }
  | { type: "stepStart"; id: GenChapterStepId; detail?: string }
  | { type: "stepEnd"; id: GenChapterStepId; detail?: string }
  | { type: "stepSkip"; id: GenChapterStepId; detail?: string }
  | { type: "stepError"; id: GenChapterStepId; detail?: string };

const DEFAULT_STEPS: GenChapterStepStateItem[] = [
  { id: "start", title: "开始", status: "idle" },
  { id: "prepareInputs", title: "缩写前文", status: "idle" },
  { id: "aggregateContext", title: "聚合设定", status: "idle" },
  { id: "writerDraft", title: "生成初稿", status: "idle" },
  { id: "critic2", title: "理解检查", status: "idle" },
  { id: "critic1", title: "1号审稿", status: "idle" },
  { id: "critic3", title: "3号建议", status: "idle" },
  { id: "modifier", title: "修改员", status: "idle" },
  { id: "polish", title: "润色", status: "idle" },
  { id: "end", title: "结束", status: "idle" },
];

const ROUND_STEP_IDS: GenChapterStepId[] = ["critic1", "critic3", "modifier", "polish"];

function formatRound(round: number, maxRounds: number) {
  const safeRound = Math.max(0, round);
  const safeMax = Math.max(1, maxRounds);
  // “未开始”按要求显示轮次为 0
  return `第 ${safeRound} / ${safeMax} 轮`;
}

function initState(): GenChapterStepsState {
  const maxRounds = 5;
  return {
    runId: 0,
    currentStepId: undefined,
    steps: DEFAULT_STEPS.map((s) => {
      const detail = ROUND_STEP_IDS.includes(s.id) ? formatRound(0, maxRounds) : undefined;
      return { ...s, detail };
    }),
    round: 0,
    maxRounds,
  };
}

function reducer(state: GenChapterStepsState, action: Action): GenChapterStepsState {
  const now = Date.now();
  switch (action.type) {
    case "reset":
      return initState();
    case "startRun": {
      const nextMaxRounds = state.maxRounds;
      return {
        runId: action.runId,
        currentStepId: undefined,
        steps: DEFAULT_STEPS.map((s) => {
          const detail = ROUND_STEP_IDS.includes(s.id) ? formatRound(0, nextMaxRounds) : undefined;
          return { ...s, status: "pending", detail, startedAt: undefined, endedAt: undefined };
        }),
        round: 0,
        maxRounds: nextMaxRounds,
      };
    }
    case "setRounds": {
      const nextRound = action.round;
      const nextMaxRounds = action.maxRounds;
      return {
        ...state,
        round: nextRound,
        maxRounds: nextMaxRounds,
        steps: state.steps.map((s) => {
          if (!ROUND_STEP_IDS.includes(s.id)) return s;
          // 未开始：status 为 idle/pending 时，轮次显示 0
          const started = s.status === "running" || s.status === "success" || s.status === "error" || s.status === "skipped";
          const shownRound = started ? nextRound : 0;
          return { ...s, detail: formatRound(shownRound, nextMaxRounds) };
        }),
      };
    }
    case "stepStart": {
      const shouldSetRoundDetail =
        ROUND_STEP_IDS.includes(action.id) ? formatRound(state.round, state.maxRounds) : undefined;
      return {
        ...state,
        currentStepId: action.id,
        steps: state.steps.map((s) =>
          s.id === action.id
            ? {
                ...s,
                status: "running",
                detail: action.detail ?? shouldSetRoundDetail ?? s.detail,
                startedAt: s.startedAt ?? now,
                endedAt: undefined,
              }
            : s.status === "idle" ? { ...s, status: "pending" } : s
        ),
      };
    }
    case "stepEnd": {
      return {
        ...state,
        currentStepId: state.currentStepId === action.id ? undefined : state.currentStepId,
        steps: state.steps.map((s) =>
          s.id === action.id ? { ...s, status: "success", detail: action.detail ?? s.detail, endedAt: now } : s
        ),
      };
    }
    case "stepSkip": {
      return {
        ...state,
        steps: state.steps.map((s) =>
          s.id === action.id ? { ...s, status: "skipped", detail: action.detail ?? s.detail, endedAt: now } : s
        ),
      };
    }
    case "stepError": {
      return {
        ...state,
        currentStepId: undefined,
        steps: state.steps.map((s) =>
          s.id === action.id ? { ...s, status: "error", detail: action.detail ?? s.detail, endedAt: now } : s
        ),
      };
    }
    default:
      return state;
  }
}

export function useGenChapterStepMachine() {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const machine = useMemo(() => {
    return {
      state,
      reset() {
        dispatch({ type: "reset" });
      },
      startRun() {
        dispatch({ type: "startRun", runId: Date.now() });
      },
      setRounds(round: number, maxRounds: number) {
        dispatch({ type: "setRounds", round, maxRounds });
      },
      stepStart(id: GenChapterStepId, detail?: string) {
        dispatch({ type: "stepStart", id, detail });
      },
      stepEnd(id: GenChapterStepId, detail?: string) {
        dispatch({ type: "stepEnd", id, detail });
      },
      stepSkip(id: GenChapterStepId, detail?: string) {
        dispatch({ type: "stepSkip", id, detail });
      },
      stepError(id: GenChapterStepId, detail?: string) {
        dispatch({ type: "stepError", id, detail });
      },
    };
  }, [state]);

  return machine;
}

