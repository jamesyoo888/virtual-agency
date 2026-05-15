import { Check, Circle, Loader2 } from "lucide-react";

const STEPS = [
  { value: "inquiry", label: "문의", desc: "담당자가 24시간 내 검토" },
  { value: "brief_received", label: "브리프 접수", desc: "요구사항 정리·확인 중" },
  { value: "in_progress", label: "제작 중", desc: "이미지·영상 생성" },
  { value: "review", label: "검토", desc: "수정·피드백 반영" },
  { value: "delivered", label: "납품 완료", desc: "에셋 다운로드 가능" },
] as const;

const ORDER = STEPS.map((s) => s.value);

interface Props {
  status: string;
}

/**
 * Visual progress bar for a project. Anything before the current step is
 * "done", the current step is "active" (animated), later steps are inactive.
 * Helps clients see at a glance where their work sits and what's next.
 */
export default function ProjectTimeline({ status }: Props) {
  const currentIdx = ORDER.indexOf(status as (typeof ORDER)[number]);

  return (
    <ol className="grid grid-cols-5 gap-2">
      {STEPS.map((step, i) => {
        const state =
          currentIdx === -1
            ? "future"
            : i < currentIdx
            ? "done"
            : i === currentIdx
            ? "active"
            : "future";
        const tone =
          state === "done"
            ? "bg-emerald-500 text-black"
            : state === "active"
            ? "bg-white text-black ring-4 ring-white/20"
            : "bg-zinc-800 text-zinc-500";

        return (
          <li key={step.value} className="text-center">
            <div className="flex items-center mb-2">
              <div className={`flex-1 h-px ${i === 0 ? "opacity-0" : i <= currentIdx ? "bg-emerald-500" : "bg-zinc-800"}`} />
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${tone}`}
              >
                {state === "done" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : state === "active" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Circle className="w-2.5 h-2.5" />
                )}
              </div>
              <div className={`flex-1 h-px ${i === STEPS.length - 1 ? "opacity-0" : i < currentIdx ? "bg-emerald-500" : "bg-zinc-800"}`} />
            </div>
            <p
              className={`text-[11px] font-medium ${
                state === "future" ? "text-zinc-500" : "text-zinc-200"
              }`}
            >
              {step.label}
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">
              {state === "active" ? step.desc : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
