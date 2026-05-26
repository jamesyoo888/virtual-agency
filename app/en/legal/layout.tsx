import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EnLegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-zinc-200">
      <header className="border-b border-zinc-900 px-8 py-4">
        <Link
          href="/en"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Virtual Agency
        </Link>
      </header>
      <article className="max-w-3xl mx-auto px-8 py-12 prose prose-invert prose-zinc">
        {children}
      </article>
    </div>
  );
}
