export default function RootLoading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="flex items-center gap-3 text-zinc-500 text-sm">
        <span className="w-4 h-4 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        Loading…
      </div>
    </div>
  );
}
