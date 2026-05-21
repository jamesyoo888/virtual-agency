import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { ArrowRight, Check, Sparkles, Users } from "lucide-react";

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata = {
  title: "크리에이터 합류 — Virtual Agency",
  description:
    "자체 제작한 AI 버추얼 모델을 Virtual Agency 카탈로그에 등록하고 광고주 캠페인 수익을 분배받으세요.",
  openGraph: {
    title: "크리에이터 합류 — Virtual Agency",
    description:
      "자체 제작한 AI 버추얼 모델을 Virtual Agency 카탈로그에 등록하고 광고주 캠페인 수익을 분배받으세요.",
    url: `${SITE_URL}/careers`,
    type: "website" as const,
    images: [`${SITE_URL}/api/og?careers=1`],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "크리에이터 합류 — Virtual Agency",
    description:
      "자체 제작한 AI 버추얼 모델을 광고 캠페인 자산으로. 정산 70%.",
    images: [`${SITE_URL}/api/og?careers=1`],
  },
};

async function loadCreatorStats(): Promise<{
  approvedCreators: number | null;
  approvedModels: number | null;
}> {
  if (!SUPABASE_CONFIGURED) {
    return { approvedCreators: null, approvedModels: null };
  }
  try {
    const supabase = await createClient();
    const [creators, models] = await Promise.all([
      supabase
        .from("creator_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("models")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);
    return {
      approvedCreators: creators.count ?? null,
      approvedModels: models.count ?? null,
    };
  } catch {
    return { approvedCreators: null, approvedModels: null };
  }
}

export default async function CareersPage() {
  const stats = await loadCreatorStats();

  const steps = [
    {
      n: "01",
      title: "신청서 제출",
      desc: "/creator/onboard 에서 포트폴리오 링크와 자체 제작한 모델 컨셉 1~3개를 제출합니다.",
    },
    {
      n: "02",
      title: "운영팀 검토",
      desc: "평균 영업일 3일 이내 운영팀이 포트폴리오·라이선스·중복 여부를 확인합니다.",
    },
    {
      n: "03",
      title: "카탈로그 등록",
      desc: "승인 시 모델이 공개 카탈로그에 등록되고, 크리에이터 대시보드에서 노출/문의/매출을 추적합니다.",
    },
    {
      n: "04",
      title: "정산",
      desc: "캠페인 납품 매월 정산. 기본 라이선스 70%, 독점 캠페인 60% 가 크리에이터 몫.",
    },
  ];

  const benefits = [
    "운영팀이 광고주 응대·견적·법무·정산까지 처리합니다",
    "Virtual Agency 의 매칭 엔진·OG 카드·SEO 인프라가 자동 노출을 만들어줍니다",
    "독점 캠페인 발생 시 카테고리 단위로 추가 보너스",
    "본인 인스타그램·포트폴리오 사이트와 별개로 운영해도 OK",
    "캠페인 결과·리뷰·견적 데이터를 크리에이터 대시보드에서 실시간 확인",
  ];

  const requirements = [
    "자체 제작한 AI 버추얼 모델 컨셉 이미지 5장 이상 (동일 인물 일관성)",
    "초상권·학습 데이터 출처를 본인이 보증할 수 있을 것",
    "한국어 광고주 응대 협조 (메시지는 운영팀이 1차 처리)",
    "Instagram·X·포트폴리오 사이트 중 1곳 이상 운영",
    "최소 분기당 2개 신규 컨셉 업데이트 의지",
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-14">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Careers · Creator program
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            크리에이터로
            <br />
            <span className="text-zinc-400">Virtual Agency 에 합류하세요.</span>
          </h1>
          <p className="mt-5 text-zinc-400 max-w-2xl leading-relaxed">
            자체 제작한 AI 버추얼 모델을 광고 캠페인 자산으로 전환하세요.
            카탈로그 노출·광고주 매칭·견적·정산은 우리가 운영합니다.
            크리에이터는 모델과 컨셉에만 집중하면 됩니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/creator/onboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
            >
              <Sparkles className="w-4 h-4" /> 신청서 작성 →
            </Link>
            <Link
              href="/creator/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
            >
              <Users className="w-4 h-4" /> 크리에이터 대시보드
            </Link>
          </div>
        </header>

        {(stats.approvedCreators != null || stats.approvedModels != null) && (
          <section className="grid grid-cols-2 gap-4 mb-16 max-w-md">
            <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
              <p className="text-3xl font-semibold tabular-nums">
                {stats.approvedCreators ?? "—"}
                {stats.approvedCreators != null && (
                  <span className="text-base font-normal text-zinc-500 ml-1">
                    +
                  </span>
                )}
              </p>
              <p className="text-xs text-zinc-500 mt-1">승인된 크리에이터</p>
            </div>
            <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
              <p className="text-3xl font-semibold tabular-nums">
                {stats.approvedModels ?? "—"}
                {stats.approvedModels != null && (
                  <span className="text-base font-normal text-zinc-500 ml-1">
                    +
                  </span>
                )}
              </p>
              <p className="text-xs text-zinc-500 mt-1">활성 모델</p>
            </div>
          </section>
        )}

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-6">합류 과정</h2>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map((s) => (
              <li
                key={s.n}
                className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40"
              >
                <p className="text-[10px] tracking-[0.3em] text-zinc-600 mb-3">
                  {s.n}
                </p>
                <p className="font-semibold text-zinc-100 mb-1.5">{s.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div>
            <h2 className="text-xl font-semibold mb-4">제공하는 것</h2>
            <ul className="space-y-2.5">
              {benefits.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 text-sm text-zinc-300"
                >
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">합류 조건</h2>
            <ul className="space-y-2.5">
              {requirements.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-2 text-sm text-zinc-300"
                >
                  <Check className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">정산 구조</h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">유형</th>
                  <th className="text-left px-5 py-3 font-medium">
                    크리에이터 분배
                  </th>
                  <th className="text-left px-5 py-3 font-medium">
                    Virtual Agency 운영 분배
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                <tr>
                  <td className="px-5 py-3 text-zinc-300">기본 라이선스</td>
                  <td className="px-5 py-3 text-emerald-300 font-medium">70%</td>
                  <td className="px-5 py-3 text-zinc-500">30%</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 text-zinc-300">독점 캠페인</td>
                  <td className="px-5 py-3 text-emerald-300 font-medium">60%</td>
                  <td className="px-5 py-3 text-zinc-500">40%</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 text-zinc-300">맞춤형 협업</td>
                  <td className="px-5 py-3 text-emerald-300 font-medium">
                    캠페인별 협의
                  </td>
                  <td className="px-5 py-3 text-zinc-500">개별 견적</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
            매월 1일~말일 정산. 익월 15일 입금. VAT 별도. 외부 매체비·법무
            비용은 분배 전 차감.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">자주 묻는 질문</h2>
          <dl className="space-y-5 text-sm">
            <div>
              <dt className="font-medium text-zinc-200 mb-1">
                Q. 신청 후 거절될 수 있나요?
              </dt>
              <dd className="text-zinc-400 leading-relaxed">
                네. 포트폴리오 일관성·라이선스 보증·기존 카탈로그 중복 여부를
                기준으로 거절될 수 있습니다. 거절 시 사유와 함께 재신청 가능
                여부를 안내합니다.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-200 mb-1">
                Q. 다른 플랫폼에도 같은 모델을 올릴 수 있나요?
              </dt>
              <dd className="text-zinc-400 leading-relaxed">
                기본 라이선스라면 가능합니다. 단, Virtual Agency 가 카테고리
                독점 캠페인을 진행 중인 기간에는 같은 카테고리에서 동시 노출은
                제한됩니다.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-200 mb-1">
                Q. 모델 콘텐츠를 누가 생성하나요?
              </dt>
              <dd className="text-zinc-400 leading-relaxed">
                크리에이터가 1차 컨셉 컷을 제공하고, 캠페인 발주 시 변형 컷은
                Virtual Agency 의 스튜디오(Easy Diffusion + Kling/Minimax)가
                생성합니다. 원할 경우 본인이 직접 생성한 컷만 사용하는 옵션도
                있습니다.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-200 mb-1">
                Q. 광고주와 직접 소통하나요?
              </dt>
              <dd className="text-zinc-400 leading-relaxed">
                기본은 운영팀이 1차 응대하고 의사결정만 크리에이터에게 전달합니다.
                크리에이터가 직접 소통을 원할 경우 옵션으로 활성화할 수
                있습니다.
              </dd>
            </div>
          </dl>
        </section>

        <footer className="text-center pt-10 border-t border-zinc-900">
          <p className="text-sm text-zinc-300 mb-4">
            준비되셨다면 지금 신청해 주세요.
          </p>
          <Link
            href="/creator/onboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
          >
            <Sparkles className="w-4 h-4" /> 크리에이터 신청서 <ArrowRight className="w-4 h-4" />
          </Link>
        </footer>
      </main>
    </div>
  );
}
