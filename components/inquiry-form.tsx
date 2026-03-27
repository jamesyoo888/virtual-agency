"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Props {
  modelId: string;
  modelName: string;
}

export default function InquiryForm({ modelId, modelName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    title: `${modelName} 모델 문의`,
    brief: "",
    budget_range: "",
    purpose: "",
  });

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?next=/models/${modelId}`);
      return;
    }

    const { error } = await supabase.from("projects").insert({
      client_id: user.id,
      model_id: modelId,
      title: form.title,
      brief: `목적: ${form.purpose}\n예산: ${form.budget_range}\n\n${form.brief}`,
      status: "inquiry",
    });

    if (!error) {
      setSent(true);
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
