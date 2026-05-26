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
  return listTags("en").map((t) => ({ tag: tagSlug(t.tag) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tag: rawSlug } = await params;
  const tag = decodeTagSlug(rawSlug);
  const posts = listPostsByTag(tag, "en");
  if (posts.length === 0) {
    return { title: "Tag not found — Virtual Agency" };
  }
  const description = `${tag} — ${posts.length} post${posts.length === 1 ? "" : "s"}. ${posts
    .slice(0, 3)
    .map((p) => p.title)
    .join(" · ")}`;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";
  // Use the en_blog_tag OG variant so the card copy is English ("X posts" vs
  // the Korean "X개의 글") and only ranks English-locale posts.
  const ogImage = `${siteUrl}/api/og?en_blog_tag=${encodeURIComponent(tag)}`;
  return {
    title: `#${tag} — Virtual Agency Blog`,
    description,
    alternates: {
      canonical: `${siteUrl}/en/blog/tag/${rawSlug}`,
    },
    openGraph: {
      title: `#${tag} — Virtual Agency Blog`,
      description,
      images: [ogImage],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `#${tag}`,
      description,
      images: [ogImage],
    },
  };
}

export default async function EnBlogTagPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { tag: rawSlug } = await params;
  const tag = decodeTagSlug(rawSlug);
  const posts = listPostsByTag(tag, "en");
  if (posts.length === 0) notFound();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link
          href="/en/blog"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> All posts
        </Link>
        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Tagged
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            #{tag}
          </h1>
          <p className="mt-4 text-zinc-400">
            {posts.length} post{posts.length === 1 ? "" : "s"}
          </p>
        </header>

        <ul className="space-y-8 border-t border-zinc-900">
          {posts.map((post) => (
            <li key={post.slug} className="pt-8">
              <Link href={`/en/blog/${post.slug}`} className="group block">
                <p className="text-xs text-zinc-500 tabular-nums mb-2">
                  {post.publishedAt} · {post.readingMinutes} min read
                </p>
                <h2 className="text-xl font-semibold group-hover:underline">
                  {post.title}
                </h2>
                <p className="text-sm text-zinc-400 mt-2">{post.excerpt}</p>
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 mt-3 group-hover:text-zinc-300">
                  Continue reading <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
