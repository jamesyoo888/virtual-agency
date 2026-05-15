"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Props {
  modelId: string;
  modelName: string;
}

const KRW = new Intl.NumberFormat("ko-KR");

function readHashQuote(): { days: number; exclusive: boolean; total: number } | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash.startsWith("#inquire?")) return null;
  try {
    const params = new URLSearchParams(hash.slice("#inquire?".length));
    const days = Number(params.get("days"));
    const total = Number(params.get("total"));
    if (!Number.isFinite(days) || days <= 0 || !Number.isFinite(total) || total <= 0) {
      return null;
    }
    return {
      days,
      exclusive: params.get("exclusive") === "true",
      total,
    };
  } catch {
    return null;
  }
}

export default function InquiryForm({ modelId, modelName }: Props) {
  const router = useRouter();
  // Lazy-init from PriceCalculator handoff (hash like
  // `#inquire?days=5&exclusive=true&total=2500000`) so we don't trip the
  // react-hooks/set-state-in-effect rule.
  const initialQuote = typeof window !== "undefined" ? readHashQuote() : null;
  const [open, setOpen] = useState(!!initialQuote);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState(() => {
    const base = {
      title: `${modelName} 모델 문의`,
      brief: "",
      budget_range: "",
      purpose: "",
    };
    if (!initialQuote) return base;
    const line = `[견적 가안] ${initialQuote.days}일${
      initialQuote.exclusive ? " · 독점 라이선스" : ""
    } / 예상 ₩${KRW.format(initialQuote.total)}\n\n`;
    return { ...base, brief: line };
  });

  // Wipe the hash once consumed so navigation back doesn't re-trigger.
  useEffect(() => {
    if (!initialQuote) return;
    if (typeof window !== "undefined" && window.location.hash.startsWith("#inquire")) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    // initialQuote is captured at first render — intentionally not in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setSubmitError(null);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setSending(false);
      router.push(`/login?next=/models/${modelId}`);
      return;
    }

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: modelId,
          title: form.title,
          brief: form.brief,
          budget_range: form.budget_range,
          purpose: form.purpose,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setSent(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "전송 실패");
    }
    setSending(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="w-full inline-flex items-center justify-center rounded-md bg-white text-black hover:bg-zinc-200 text-base font-medium py-6"
      >
        문의하기
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{modelName} 모델 문의</DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="py-8 text-center">
            <p className="text-green-400 font-medium mb-2">문의가 접수되었습니다.</p>
            <p className="text-sm text-zinc-400">담당자가 24시간 내 연락드립니다.</p>
            <Button
              className="mt-6 bg-white text-black"
              onClick={() => { setOpen(false); setSent(false); }}
            >
              닫기
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>사용 목적</Label>
              <Select
                value={form.purpose}
                onValueChange={(v) => setForm((f) => ({ ...f, purpose: v ?? "" }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="선택해주세요" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="ad">광고/캠페인</SelectItem>
                  <SelectItem value="sns">SNS 콘텐츠</SelectItem>
                  <SelectItem value="video">영상 제작</SelectItem>
                  <SelectItem value="lookbook">룩북/카탈로그</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>예산 범위</Label>
              <Select
                value={form.budget_range}
                onValueChange={(v) => setForm((f) => ({ ...f, budget_range: v ?? "" }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="선택해주세요" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="under_500">500만원 미만</SelectItem>
                  <SelectItem value="500_1000">500 ~ 1,000만원</SelectItem>
                  <SelectItem value="1000_3000">1,000 ~ 3,000만원</SelectItem>
                  <SelectItem value="over_3000">3,000만원 이상</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>요청 사항</Label>
              <Textarea
                value={form.brief}
                onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
                placeholder="원하는 이미지/분위기/일정 등을 자유롭게 적어주세요."
                rows={3}
              />
            </div>

            {submitError && <p className="text-sm text-red-400">{submitError}</p>}

            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-zinc-200"
              disabled={sending}
            >
              {sending ? "전송 중..." : "문의 보내기"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
