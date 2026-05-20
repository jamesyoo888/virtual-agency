import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  decodeTagSlug,
  listPostsByTag,
  listTags,
  tagSlug,
} from "@/lib/blog/posts";

export const revalidate = 3600;

interface Params {
  tag: string;
}

export function generateStaticParams(): Array<{ tag: string }> {
  return listTags().map((t) => ({ tag: tagSlug(t.tag) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tag: rawSlug } = await params;
  const tag = decodeTagSlug(rawSlug);
  const posts = listPostsByTag(tag);
  if (posts.length === 0) {
    return { title: "태그를 찾을 수 없습니다 — Virtual Agency" };
  }
  const description = `${tag} 관련 ${posts.length}개의 글. ${posts
    .slice(0, 3)
    .map((p) => p.title)
    .join(" · ")}`;
  return {
    title: `#${tag} — Virtual Agency 블로그`,
    description,
    openGraph: {
      title: `#${tag} — Virtual Agency 블로그`,
      description,
    },
  };
}

export default async function BlogTagPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { tag: rawSlug } = await params;
  const tag = decodeTagSlug(rawSlug);
  const posts = listPostsByTag(tag);
  if (posts.length === 0) notFound();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> 블로그 전체
        </Link>
        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Tagged
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            #{tag}
          </h1>
          <p className="mt-4 text-zinc-400">
            {posts.length}개의 글
          </p>
        </header>

        <ul className="space-y-8 border-t border-zinc-900">
          {posts.map((post) => (
            <li key={post.slug} className="pt-8">
              <Link href={`/blog/${post.slug}`} className="group block">
                <p className="text-xs text-zinc-500 tabular-nums mb-2">
                  {post.publishedAt} · {post.readingMinutes}분 읽기
                </p>
                <h2 className="text-xl font-semibold group-hover:underline">
                  {post.title}
                </h2>
                <p className="text-sm text-zinc-400 mt-2">{post.excerpt}</p>
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 mt-3 group-hover:text-zinc-300">
                  계속 읽기 <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
