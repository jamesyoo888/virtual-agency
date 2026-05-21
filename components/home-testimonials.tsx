import Link from "next/link";
import { Star } from "lucide-react";
import type { Testimonial } from "@/lib/testimonials";

interface Props {
  testimonials: Testimonial[];
}

export default function HomeTestimonials({ testimonials }: Props) {
  if (testimonials.length === 0) return null;

  return (
    <section className="px-5 md:px-8 py-16 border-b border-zinc-900">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-baseline justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-zinc-500 mb-2">
              Testimonials
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              광고주의 후기
            </h2>
          </div>
          <p className="text-xs text-zinc-500">광고주 사명은 마스킹 처리됨</p>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <li
              key={t.id}
              className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6 flex flex-col"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={
                      i < t.rating
                        ? "w-4 h-4 fill-yellow-400 text-yellow-400"
                        : "w-4 h-4 text-zinc-700"
                    }
                  />
                ))}
              </div>
              <blockquote className="text-sm text-zinc-300 leading-relaxed flex-1 mb-4">
                &ldquo;{t.body}&rdquo;
              </blockquote>
              <div className="text-xs text-zinc-500 flex items-baseline justify-between gap-2">
                <span>{t.company}</span>
                {t.modelId && t.modelName && (
                  <Link
                    href={`/models/${t.modelId}`}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {t.modelName} →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
