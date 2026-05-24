import type { DailyRevenueBucket } from "@/lib/analytics/daily";

interface Props {
  buckets: DailyRevenueBucket[];
  /** Pixel width of the rendered SVG. Height is derived to keep ~6:1 ratio. */
  width?: number;
  /** Visual emphasis on today's bar — used by the admin home card. */
  highlightLast?: boolean;
}

/**
 * Server-rendered SVG sparkline of daily revenue. No client JS; the values
 * the operator hovers are encoded in `<title>` so native tooltips work in
 * every browser without a popper library.
 *
 * Bars are used (not a line) because zero-revenue days are common at this
 * scale, and bars communicate "we didn't deliver anything today" far more
 * clearly than a polyline dipping to zero between two peaks.
 */
export default function DailyRevenueSparkline({
  buckets,
  width = 360,
  highlightLast = true,
}: Props) {
  if (buckets.length === 0) return null;
  const height = Math.round(width / 6);
  // Reserve a little vertical room so tall bars don't touch the top edge.
  const paddingY = 2;
  const usableH = height - paddingY * 2;
  const max = Math.max(...buckets.map((b) => b.revenue), 1);
  const barGap = 2;
  const barW = Math.max(
    1,
    Math.floor((width - barGap * (buckets.length - 1)) / buckets.length)
  );
  const KRW = new Intl.NumberFormat("ko-KR");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`${buckets.length}일 일별 매출 trend`}
      className="block"
    >
      {buckets.map((b, i) => {
        const h = max > 0 ? Math.round((b.revenue / max) * usableH) : 0;
        const x = i * (barW + barGap);
        const y = height - paddingY - h;
        const isLast = i === buckets.length - 1;
        // Render an empty-day placeholder so the eye still sees a baseline
        // tick — a 1px bottom line keeps the rhythm even on zero days.
        const isZero = b.revenue === 0;
        const fill = isZero
          ? "#27272a" /* zinc-800 */
          : isLast && highlightLast
          ? "#34d399" /* emerald-400 */
          : "#10b981" /* emerald-500 */;
        return (
          <rect
            key={b.date}
            x={x}
            y={isZero ? height - paddingY - 1 : y}
            width={barW}
            height={isZero ? 1 : h}
            fill={fill}
            rx={1}
          >
            <title>{`${b.date} · ₩${KRW.format(b.revenue)} (${b.count}건)`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
