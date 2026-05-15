"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

const STATUS_LABELS: Record<string, string> = {
  inquiry: "문의",
  brief_received: "브리프 접수",
  in_progress: "제작 중",
  review: "검토",
  delivered: "납품 완료",
};

const POLL_INTERVAL_MS = 30_000;
const STORAGE_KEY = "va_project_status_seen";

interface ProjectSnapshot {
  id: string;
  title: string;
  status: string;
}

interface Props {
  /** Server-rendered initial snapshot — avoids a flash of "changed" toasts on first mount. */
  initial: ProjectSnapshot[];
}

/**
 * Polls the user's projects every 30s and toasts on status changes. Persists
 * the last-seen status per project in localStorage so a hard refresh doesn't
 * replay yesterday's transition; the `initial` prop seeds the snapshot for
 * brand-new sessions.
 *
 * Why polling, not Supabase realtime: realtime channels need a websocket per
 * client and an extra postgres pub; for ~5 projects per client and a 30s SLA
 * the cost/complexity does not pay back. Swap-in is straightforward later.
 */
export default function DashboardStatusWatcher({ initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const lastSeen = useRef<Map<string, string>>(new Map());
  const firstRun = useRef(true);

  useEffect(() => {
    // Seed from localStorage first (survives refresh), then fill missing
    // entries from the server-rendered snapshot.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        for (const [id, status] of Object.entries(parsed)) {
          lastSeen.current.set(id, status);
        }
      }
    } catch {
      // ignore quota / parse errors — snapshot is best-effort
    }
    for (const p of initial) {
      if (!lastSeen.current.has(p.id)) lastSeen.current.set(p.id, p.status);
    }

    const supabase = createClient();
    let cancelled = false;

    async function tick() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("projects")
        .select("id, title, status")
        .eq("client_id", user.id);

      if (cancelled || !data) return;

      const changed: { p: ProjectSnapshot; prev: string }[] = [];
      for (const p of data as ProjectSnapshot[]) {
        const prev = lastSeen.current.get(p.id);
        if (prev && prev !== p.status) {
          changed.push({ p, prev });
        }
        lastSeen.current.set(p.id, p.status);
      }

      // Persist after every tick, even with no changes — covers the case where
      // the server has been catching up to localStorage.
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(Object.fromEntries(lastSeen.current))
        );
      } catch {
        // ignore quota
      }

      // Suppress toasts on the very first poll — that round is purely for
      // reconciliation with localStorage. Otherwise a user who left the tab
      // open overnight wakes up to a wall of toasts.
      if (firstRun.current) {
        firstRun.current = false;
        return;
      }

      if (changed.length > 0) {
        for (const { p } of changed) {
          const label = STATUS_LABELS[p.status] ?? p.status;
          toast.info(`"${p.title}" → ${label}`);
        }
        router.refresh();
      }
    }

    // Fire once on mount to surface anything that changed while the user was
    // on another page (the server-rendered snapshot is already the freshest),
    // then continue polling.
    void tick();
    const handle = setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [initial, toast, router]);

  return null;
}
