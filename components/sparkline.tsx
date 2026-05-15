/**
 * Inline SVG sparkline — no charting library, no client-side JS needed.
 * Renders simple vertical bars sized by value. Last bucket is highlighted.
 */
interface Props {
  data: Array<{ day: string; cost: number }>;
  width?: number;
  height?: number;
}

export default function Sparkline({ data, width = 420, height = 60 }: Props) {
  const max = Math.max(0.0001, ...data.map((d) => d.cost));
  const gap = 4;
  const barW = data.length > 0 ? (width - gap * (data.length - 1)) / data.length : 0;

  return (
    <div className="space-y-1.5">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block max-w-full h-auto"
        role="img"
        aria-label={`Last ${data.length} days usage sparkline`}
      >
        {data.map((d, i) => {
          const h = (d.cost / max) * (height - 2);
          const x = i * (barW + gap);
          const y = height - h;
          const isLast = i === data.length - 1;
          return (
            <g key={d.day}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(1, h)}
                rx={2}
                className={isLast ? "fill-white" : "fill-zinc-600"}
              />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
        {data.map((d, i) => (
          <span key={d.day} className={i === data.length - 1 ? "text-zinc-400" : ""}>
            {d.day.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}
