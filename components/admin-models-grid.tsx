"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, CheckSquare, Square } from "lucide-react";
import type { Model, ModelStatus } from "@/types";
import ModelCard from "@/components/model-card";

const STATUS_FILTERS: { value: "all" | ModelStatus; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

interface PerfBadge {
  views: number;
  inquiries: number;
}

interface Props {
  models: Model[];
  /**
   * Optional 30d perf data keyed by model_id. When present each card gets
   * a small overlay chip with views/inquiries — admin can scan ranking
   * without clicking through.
   */
  perfByModel?: Record<string, PerfBadge>;
}

export default function AdminModelsGrid({ models, perfByModel }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ModelStatus>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

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

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(filtered.map((m) => m.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function applyStatus(target: ModelStatus) {
    if (selected.size === 0) return;
    setBusy(true);
    setErrMsg(null);
    try {
      const res = await fetch("/api/admin/models/bulk-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], status: target }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      clearSelection();
      setSelectMode(false);
      router.refresh();
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "bulk update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
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

        <button
          type="button"
          onClick={() => {
            setSelectMode((m) => !m);
            clearSelection();
          }}
          className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            selectMode
              ? "bg-white text-black border-white"
              : "bg-transparent text-zinc-300 border-zinc-800 hover:border-zinc-600"
          }`}
        >
          {selectMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          {selectMode ? "선택 모드 종료" : "선택 모드"}
        </button>
      </div>

      {selectMode && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm">
          <p className="text-zinc-300">
            <span className="font-semibold text-white">{selected.size}</span>개 선택됨
          </p>
          <button
            type="button"
            onClick={selectAllVisible}
            className="text-xs text-zinc-400 hover:text-white"
            disabled={busy}
          >
            보이는 전체 선택
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-zinc-400 hover:text-white"
            disabled={busy}
          >
            선택 해제
          </button>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => applyStatus("active")}
              disabled={selected.size === 0 || busy}
              className="px-3 py-1.5 rounded-md bg-green-500/20 text-green-300 hover:bg-green-500/30 text-xs font-medium disabled:opacity-40"
            >
              Activate
            </button>
            <button
              type="button"
              onClick={() => applyStatus("inactive")}
              disabled={selected.size === 0 || busy}
              className="px-3 py-1.5 rounded-md bg-zinc-700/40 text-zinc-300 hover:bg-zinc-700/60 text-xs font-medium disabled:opacity-40"
            >
              Inactivate
            </button>
            <button
              type="button"
              onClick={() => applyStatus("draft")}
              disabled={selected.size === 0 || busy}
              className="px-3 py-1.5 rounded-md bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 text-xs font-medium disabled:opacity-40"
            >
              Draft
            </button>
          </div>
          {errMsg && (
            <p className="basis-full text-xs text-red-400">{errMsg}</p>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-24 text-zinc-500">
          <p className="text-sm">조건에 맞는 모델이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((model) => {
            const isSelected = selected.has(model.id);
            return (
              <div key={model.id} className="relative">
                {selectMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleOne(model.id);
                    }}
                    aria-pressed={isSelected}
                    className={`absolute top-2 left-2 z-20 w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-white text-black"
                        : "bg-black/70 text-white hover:bg-black/90"
                    }`}
                    title={isSelected ? "선택 해제" : "선택"}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                )}
                <div
                  className={`${
                    selectMode && isSelected
                      ? "ring-2 ring-white ring-offset-2 ring-offset-black rounded-lg"
                      : ""
                  }`}
                >
                  <ModelCard model={model} variant="admin" />
                </div>
                {perfByModel?.[model.id] && (
                  <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 items-end">
                    <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] tabular-nums text-zinc-200 border border-zinc-700">
                      30d {perfByModel[model.id].views.toLocaleString()}v
                    </span>
                    {perfByModel[model.id].inquiries > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/80 text-black text-[10px] tabular-nums font-medium">
                        {perfByModel[model.id].inquiries} 문의
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
