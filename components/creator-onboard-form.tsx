"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InitialApplication {
  display_name: string;
  bio: string | null;
  portfolio_url: string | null;
  instagram_handle: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
}

interface Props {
  initial: InitialApplication | null;
}

export default function CreatorOnboardForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    display_name: initial?.display_name ?? "",
    bio: initial?.bio ?? "",
    portfolio_url: initial?.portfolio_url ?? "",
    instagram_handle: initial?.instagram_handle ?? "",
    notes: initial?.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/creator/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok && res.status !== 201) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4"
    >
      <Field
        label="활동명 (필수)"
        name="display_name"
        value={form.display_name}
        onChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
        required
        placeholder="실명 / 스튜디오명"
      />
      <Field
        label="포트폴리오 URL"
        name="portfolio_url"
        value={form.portfolio_url}
        onChange={(v) => setForm((f) => ({ ...f, portfolio_url: v }))}
        type="url"
        placeholder="https://"
      />
      <Field
        label="Instagram @"
        name="instagram_handle"
        value={form.instagram_handle}
        onChange={(v) => setForm((f) => ({ ...f, instagram_handle: v }))}
        placeholder="my_handle"
      />
      <Textarea
        label="자기 소개 / 작업 스타일"
        name="bio"
        value={form.bio}
        onChange={(v) => setForm((f) => ({ ...f, bio: v }))}
        rows={3}
        placeholder="어떤 모델을 만드시나요? 강점은?"
      />
      <Textarea
        label="운영팀에게 (선택)"
        name="notes"
        value={form.notes}
        onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
        rows={2}
        placeholder="협업 조건·일정 등 자유롭게"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}
      {submitted && (
        <p className="text-sm text-emerald-400">
          제출되었습니다. 운영팀이 검토 후 회신드립니다.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 rounded-md bg-white text-black font-medium hover:bg-zinc-200 text-sm disabled:opacity-60"
      >
        {submitting ? "제출 중..." : initial ? "수정해 다시 제출" : "신청 제출"}
      </button>
    </form>
  );
}

function Field({
  label, name, value, onChange, type = "text", placeholder, required,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-zinc-400">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
      />
    </label>
  );
}

function Textarea({
  label, name, value, onChange, rows = 3, placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-zinc-400">{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
      />
    </label>
  );
}
