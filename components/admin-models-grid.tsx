"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Model, ModelStatus } from "@/types";
import ModelCard from "@/components/model-card";

const STATUS_FILTERS: { value: "all" | ModelStatus; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

interface Props {
  models: Model[];
}

export default function AdminModelsGrid({ models }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ModelStatus>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (q && !(m.name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [models, query, status]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: models.length };
    for (const m of models) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [models]);

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름으로 검색"
            className="w-full pl-9 pr-9 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              aria-label="검색어 지우기"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                status === f.value
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] opacity-60">
                {counts[f.value] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24 text-zinc-500">
          <p className="text-sm">조건에 맞는 모델이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((model) => (
            <ModelCard key={model.id} model={model} variant="admin" />
          ))}
        </div>
      )}
    </>
  );
}
