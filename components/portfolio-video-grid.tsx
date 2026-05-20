"use client";

interface Props {
  videos: { id: string; url: string }[];
}

export default function PortfolioVideoGrid({ videos }: Props) {
  if (videos.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {videos.map((v) => (
        <video
          key={v.id}
          src={v.url}
          controls
          playsInline
          preload="metadata"
          className="w-full aspect-video rounded-lg bg-zinc-900"
        />
      ))}
    </div>
  );
}
