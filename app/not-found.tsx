import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-8">
      <div className="text-center max-w-md">
        <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-3">
          404
        </p>
        <h1 className="text-3xl font-bold mb-3">페이지를 찾을 수 없습니다</h1>
        <p className="text-zinc-400 text-sm mb-8">
          요청하신 페이지가 삭제되었거나 주소가 변경되었습니다.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
        >
          쇼케이스로 돌아가기
        </Link>
      </div>
    </div>
  );
}
