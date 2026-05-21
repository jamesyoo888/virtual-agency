"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

/**
 * Floating mobile nav — visible only at < md width. Doesn't replace per-page
 * showcase headers (those each render their own brand mark); this is a
 * dedicated overflow surface so mobile visitors can reach /pricing, /services,
 * /cases, /faq, etc. without scrolling to the footer.
 *
 * Implementation notes:
 *  - All hooks are client-side; the layout renders this as a regular client
 *    component imported once from the showcase RootLayout.
 *  - Auto-closes on route change (pathname dep) so the panel doesn't linger.
 *  - Body scroll is locked while open — Korean iOS Safari otherwise scrolls
 *    the underlying page when the user touches inside the overlay.
 */
const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "카탈로그" },
  { href: "/match", label: "AI 매칭" },
  { href: "/rfp", label: "RFP" },
  { href: "/services", label: "서비스" },
  { href: "/pricing", label: "가격" },
  { href: "/cases", label: "사례" },
  { href: "/blog", label: "블로그" },
  { href: "/faq", label: "FAQ" },
  { href: "/press", label: "프레스" },
  { href: "/careers", label: "크리에이터 합류" },
  { href: "/about", label: "회사 소개" },
];

const SECONDARY: { href: string; label: string }[] = [
  { href: "/legal/terms", label: "이용약관" },
  { href: "/legal/privacy", label: "개인정보 처리방침" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Close on navigation. Using a deferred derived-state pattern instead of
  // an effect that sets state — the latter trips the new
  // react-hooks/set-state-in-effect lint rule.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Hide entirely on admin/client/creator/login surfaces — those layouts
  // have their own sidebars and don't need the public nav.
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/client") ||
    pathname?.startsWith("/creator") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/invite") ||
    pathname?.startsWith("/quote/share")
  ) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
        className="md:hidden fixed top-3 right-3 z-40 w-10 h-10 rounded-full bg-zinc-900/90 border border-zinc-700 backdrop-blur grid place-items-center text-zinc-200 hover:text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-zinc-950 border-l border-zinc-800 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="사이트 메뉴"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
              <p className="text-xs font-bold tracking-widest uppercase text-zinc-300">
                Virtual Agency
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="px-3 py-3">
              <ul className="space-y-0.5">
                {LINKS.map((l) => {
                  const active = pathname === l.href;
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className={`flex items-center px-3 py-2.5 rounded-md text-sm ${
                          active
                            ? "bg-white text-black font-medium"
                            : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                        }`}
                      >
                        {l.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="my-3 border-t border-zinc-900" />
              <ul className="space-y-0.5">
                {SECONDARY.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="flex items-center px-3 py-2 rounded-md text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="px-5 py-4 border-t border-zinc-900 text-[10px] text-zinc-600">
              실제보다 완벽한 AI 버추얼 모델.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
