/**
 * Static blog catalog. SEO-targeted long-form content lives here as
 * structured data rather than MDX — it lets us render rich, typed
 * sections without an extra toolchain, and `generateStaticParams`
 * picks up new slugs automatically.
 *
 * Adding a post: append a new entry below. The sitemap reads this same
 * list, so a new slug is indexed on the next deployment.
 */

export interface BlogSection {
  heading: string;
  body: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  readingMinutes: number;
  tags: string[];
  sections: BlogSection[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "ai-virtual-model-vs-influencer-marketing",
    title: "AI 버추얼 모델 vs 인플루언서 마케팅 — 2026년 광고주의 선택",
    excerpt:
      "캠페인 비용·속도·통제권 세 축에서 두 모델을 비교합니다. 실제 광고주 데이터로 본 손익분기.",
    publishedAt: "2026-05-02",
    readingMinutes: 6,
    tags: ["전략", "비용", "캠페인"],
    sections: [
      {
        heading: "왜 비교가 시작되었나",
        body: "2024년까지 인플루언서 마케팅은 '진정성'이라는 무형 자산으로 평가받았습니다. 2025년 들어 광고주들은 동일한 자산을 'AI 버추얼 모델 + 일관된 컨셉'으로 대체할 수 있는지 묻기 시작했습니다. 이 글은 의사결정 프레임을 제시합니다.",
      },
      {
        heading: "비용 구조",
        body: "인플루언서 캠페인은 평균 모델료(또는 광고비)·촬영 인건비·로케이션·후반작업이 들어갑니다. 1회 캠페인 평균 1,200만원~3,000만원. AI 버추얼 모델은 라이선스 일당과 컴퓨트 비용만으로 같은 결과물을 만들 수 있어, 동일 광고 결과 기준 5%~10% 수준으로 떨어집니다.",
      },
      {
        heading: "속도와 통제권",
        body: "버추얼 모델은 컨셉이 바뀌어도 같은 얼굴을 유지할 수 있고, 24시간 안에 신규 컷을 추가 납품할 수 있습니다. 인플루언서 캠페인은 일정 조율·재촬영 비용이 비대칭적으로 큽니다.",
      },
      {
        heading: "남는 인플루언서의 영역",
        body: "라이브 커머스, 진성 팬 기반 충성도, 즉흥적인 UGC 트리거는 여전히 사람만 만들 수 있습니다. 캠페인의 '얼굴'은 버추얼로, '관계'는 인플루언서로 분리하는 하이브리드 전략이 부상 중입니다.",
      },
      {
        heading: "광고주 체크리스트",
        body: "(1) 캠페인 KPI 가 도달인가, 전환인가. (2) 동일 모델을 분기 단위로 재사용할 의향이 있는가. (3) 컨셉 변형 횟수가 분기당 4 회 이상인가. 세 답이 yes 이면 AI 버추얼 모델이 손익분기를 넘습니다.",
      },
    ],
  },
  {
    slug: "how-to-write-a-brief-for-virtual-models",
    title: "버추얼 모델 캠페인 브리프 작성법",
    excerpt:
      "AI 매칭을 100% 활용하려면 브리프가 핵심입니다. 광고주가 자주 빠뜨리는 5가지 필드.",
    publishedAt: "2026-04-18",
    readingMinutes: 4,
    tags: ["가이드", "브리프", "매칭"],
    sections: [
      {
        heading: "톤·분위기를 단어로 고정",
        body: "'고급스럽게' 같은 모호한 형용사 대신 '미니멀 / 차가운 / 모노톤' 처럼 3개 단어로 잠급니다. 매칭 엔진과 후속 이미지 생성 모두 이 단어 셋을 기준으로 추론합니다.",
      },
      {
        heading: "사용처를 명시",
        body: "SNS 피드용 정사각, 유튜브 인스트림 16:9, 옥외광고 등 출력 매체를 적어 두면 모델 선정과 출력 비율이 자동 최적화됩니다.",
      },
      {
        heading: "독점 여부와 기간",
        body: "독점 라이선스가 필요하면 견적이 5~10 배까지 차이 납니다. 분기 단위가 아니라 캠페인 단위로 좁히면 비용이 떨어집니다.",
      },
      {
        heading: "레퍼런스 이미지",
        body: "5장 이내로 첨부. 같은 분위기 5장이 다양한 10장보다 매칭 정확도를 더 끌어올립니다.",
      },
      {
        heading: "납기와 분할",
        body: "전체 납기가 아니라 '컨셉 컨펌 → 1차 컷 → 최종' 식으로 분할 명시하면 우선순위 큐가 자동 조정됩니다.",
      },
    ],
  },
  {
    slug: "ai-model-licensing-explained",
    title: "AI 모델 라이선스 — 알아둬야 할 5가지 조항",
    excerpt:
      "기본·독점·캠페인 단위 라이선스의 차이, 그리고 '재사용 권리'가 만들어내는 숨은 비용.",
    publishedAt: "2026-03-30",
    readingMinutes: 5,
    tags: ["라이선스", "계약", "리스크"],
    sections: [
      {
        heading: "기본 vs 독점",
        body: "기본 라이선스는 같은 모델을 다른 광고주와 공유합니다. 독점은 일정 기간 동안 단독 사용권을 잠그며, 가격은 5~25 배 비쌉니다. 카테고리 독점 (예: 뷰티 분야 한정) 옵션이 있는지 확인하세요.",
      },
      {
        heading: "사용 매체 한정",
        body: "디지털·인쇄·옥외·방송 매체별로 라이선스가 분리될 수 있습니다. '전 매체' 라이선스는 단가가 2~3 배 올라가지만 분쟁 가능성을 크게 줄입니다.",
      },
      {
        heading: "기간과 자동 갱신",
        body: "기간 만료 후 광고 소재 사용을 계속하면 추가 비용이 발생할 수 있습니다. 갱신 조건과 노티스 기한을 미리 정의해 두세요.",
      },
      {
        heading: "지역",
        body: "국내 한정인지 글로벌인지에 따라 가격 차이가 큽니다. 글로벌 캠페인이면 별도 견적을 받으세요.",
      },
      {
        heading: "초상권 클리어런스",
        body: "버추얼 모델이라도 학습 데이터·튜닝 절차에 따라 초상권 분쟁이 발생할 수 있습니다. Virtual Agency 의 모든 모델은 라이선스에 클리어런스 보증이 포함되어 있습니다.",
      },
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function listPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt)
  );
}
