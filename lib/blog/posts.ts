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
    slug: "measuring-virtual-model-campaign-roi",
    title: "버추얼 모델 캠페인 ROI 어떻게 측정하나",
    excerpt:
      "노출·전환·재구매를 분리해 측정해야 ROI 가 보입니다. 광고주가 흔히 합치는 3가지 지표.",
    publishedAt: "2026-05-12",
    readingMinutes: 5,
    tags: ["측정", "전환", "데이터"],
    sections: [
      {
        heading: "ROI 를 단일 숫자로 만들지 마세요",
        body: "캠페인 보고서에 'ROI 320%' 같은 한 줄이 적혀 있다면 그 안에 노출·인지·전환·재구매 4 단계가 뭉쳐 있을 가능성이 높습니다. 버추얼 모델 캠페인은 단계별로 분리해서 봐야 의미 있는 비교가 가능합니다.",
      },
      {
        heading: "Stage 1 — 노출 효율 (CPM)",
        body: "버추얼 모델은 컷 추가 비용이 거의 0 이라 변형 광고를 다량 운영할 수 있습니다. 동일 매체비에서 평균 CPM 이 인플루언서 캠페인의 0.6~0.8 배로 떨어지는 것이 일반적입니다.",
      },
      {
        heading: "Stage 2 — 인게이지먼트 (CTR · 체류)",
        body: "여기서는 인플루언서가 우세한 경우가 많습니다. 다만 컨셉을 잠근 버추얼 모델 시리즈가 5컷 이상 노출되면 인플루언서 1컷보다 누적 인지가 빠르게 올라갑니다. A/B 로 시리즈 vs 단발 비교를 권장.",
      },
      {
        heading: "Stage 3 — 전환 (CPA)",
        body: "CPA 는 '광고 → 랜딩 → 결제' 의 합산이라 모델 종류보다 랜딩페이지 품질의 영향을 더 받습니다. 캠페인 인사이트 보고서에서 모델 효과를 분리해 보려면 '동일 랜딩 + 모델만 교체' A/B 가 유일한 정답입니다.",
      },
      {
        heading: "Stage 4 — 재구매 (LTV)",
        body: "분기 단위로 모델을 재사용할 때만 의미 있는 지표. Virtual Agency 광고주 평균 데이터로는 동일 모델 2~3 회 재사용 시 LTV 가 1.4 배 상승. 이 영역에서 버추얼 모델의 압도적 우위가 나옵니다.",
      },
    ],
  },
  {
    slug: "industry-playbooks-beauty-fashion-food",
    title: "산업별 캠페인 플레이북 — 뷰티 · 패션 · 식음료",
    excerpt:
      "산업마다 모델 선정 기준과 컷 구성이 다릅니다. 광고주 실 데이터로 정리한 세 산업의 정석.",
    publishedAt: "2026-05-08",
    readingMinutes: 7,
    tags: ["산업", "플레이북", "사례"],
    sections: [
      {
        heading: "뷰티 — 피부톤·라이팅이 우선",
        body: "뷰티 캠페인은 모델의 표정·각도보다 피부 표현 일관성이 핵심입니다. 같은 모델로 톤·온도·메이크업 변형을 7~10 컷 만들고 그중 3 컷을 선별하는 패턴이 효율적입니다. 자연광 라이팅 모델을 우선 추천합니다.",
      },
      {
        heading: "뷰티 — 클로즈업과 분할 컷",
        body: "전신보다 얼굴 클로즈업과 손/입술 분할 컷이 전환률에서 우세합니다. 분할 컷은 동일 모델에서 추가 비용 없이 생성 가능 — 인플루언서 캠페인에서는 추가 촬영비가 큽니다.",
      },
      {
        heading: "패션 — 무드 일관성과 시리즈",
        body: "패션은 단발 컷보다 시리즈가 결정적입니다. 4~6 컷 시리즈를 같은 모델·같은 로케이션으로 잠가야 컬렉션 의도가 전달됩니다. 무드(차가운·따뜻한)와 장르(드라마·다큐) 두 축을 먼저 결정하세요.",
      },
      {
        heading: "식음료 — 모델 노출 vs 제품 노출",
        body: "F&B 캠페인은 모델 등장 비율이 30% 이하일 때 전환률이 더 높습니다. 모델은 분위기 메이커이며 제품이 주인공이어야 합니다. 모델 단가는 낮추고 컷 다양화에 예산을 분배하는 전략이 유리합니다.",
      },
      {
        heading: "공통 — 첫 캠페인은 작게",
        body: "어떤 산업이든 첫 캠페인은 3~5 컷 단위로 시작하고, 결과 데이터에 따라 다음 분기에 시리즈를 확장하세요. 처음부터 20 컷 시리즈를 발주하면 모델 적합성을 검증하기 전에 매몰비용이 커집니다.",
      },
    ],
  },
  {
    slug: "exclusive-campaign-when-to-go",
    title: "독점 캠페인은 언제 의미가 있나",
    excerpt:
      "독점 라이선스는 비용이 5~25 배입니다. 그 차액을 정당화하는 조건 3가지.",
    publishedAt: "2026-05-04",
    readingMinutes: 4,
    tags: ["독점", "라이선스", "전략"],
    sections: [
      {
        heading: "조건 1 — 브랜드 아이덴티티가 모델 얼굴로 연결",
        body: "광고 종료 후에도 모델 얼굴이 그 브랜드를 떠올리게 만드는 자산으로 남는 캠페인이라면 독점이 의미 있습니다. 단발 프로모션이라면 기본 라이선스로 충분합니다.",
      },
      {
        heading: "조건 2 — 경쟁사 노출이 실제 리스크",
        body: "같은 모델이 경쟁 카테고리에 등장할 가능성이 높을수록 독점의 가치가 올라갑니다. 카테고리 독점(예: '뷰티 분야 한정')은 전체 독점의 30~50% 가격이라 차선책으로 우수합니다.",
      },
      {
        heading: "조건 3 — 캠페인 길이 6 개월 이상",
        body: "6 개월 미만 캠페인이면 독점료 회수가 어렵습니다. 분기 단위 재집행이 확정되었거나, 같은 시즌 동안 다채널 운영이 예정되어 있을 때 ROI 가 맞춰집니다.",
      },
      {
        heading: "협상 팁",
        body: "독점 시작일을 캠페인 게재일이 아니라 컨셉 컨펌일로 잠그면 사실상 최대 1 개월의 무료 prep 기간을 확보할 수 있습니다. Virtual Agency 견적 폼에서 '독점 시작일 옵션' 을 선택하면 자동 반영됩니다.",
      },
    ],
  },
  {
    slug: "brand-safety-with-virtual-models",
    title: "버추얼 모델로 브랜드 안전성 확보하기",
    excerpt:
      "실존 인플루언서 리스크를 0으로 만드는 방법. 광고주가 알아야 할 브랜드 안전성 체크리스트.",
    publishedAt: "2026-05-16",
    readingMinutes: 5,
    tags: ["브랜드 안전성", "리스크", "전략"],
    sections: [
      {
        heading: "왜 브랜드 안전성이 화두인가",
        body: "2024~2025년 사이 국내외에서 인플루언서의 과거 발언·사생활 이슈가 브랜드 캠페인을 즉시 중단시킨 사례가 늘었습니다. 평균 손실액은 캠페인 비용의 3~7배로 추산됩니다 (촬영 비용 + 매체비 폐기 + 브랜드 이미지 회복비). 버추얼 모델은 이 리스크 카테고리 자체를 제거합니다.",
      },
      {
        heading: "버추얼 모델이 제거하는 리스크 5가지",
        body: "(1) 과거 발언 발굴, (2) 사생활 폭로, (3) 경쟁 광고 동시 출연, (4) 일정 갑작스런 변경, (5) 컨셉 거부. 5가지 모두 인플루언서 캠페인에서 매월 발생하는 운영 리스크지만, 버추얼 모델에서는 구조적으로 발생 불가능합니다.",
      },
      {
        heading: "남는 리스크 — 그리고 대응",
        body: "버추얼 모델이라도 (a) 학습 데이터 출처 분쟁, (b) AI 생성물 표기 의무, (c) 동일/유사 얼굴 충돌은 남습니다. Virtual Agency 는 (a) 자체 학습 + 클리어런스 보증, (b) 캠페인별 'AI generated' 워터마크 옵션, (c) 신규 모델 등록 시 유사도 검증을 제공합니다.",
      },
      {
        heading: "체크리스트",
        body: "광고주가 에이전시를 평가할 때 물어봐야 할 5문항: ① 학습 데이터 출처 보증서 발급 가능? ② 동일 모델이 경쟁 카테고리에 노출되지 않도록 카테고리 독점 옵션 있는가? ③ AI 생성물 표기 의무 (방심위·공정위) 가이드 제공? ④ 모델 얼굴 유사도 검증 절차? ⑤ 광고 종료 후 모델 자산 처분 정책?",
      },
      {
        heading: "결론",
        body: "브랜드 안전성은 캠페인 한 건의 ROI 보다 장기 리스크 회피의 문제입니다. 분기 단위로 모델을 재사용하는 광고주일수록 버추얼 모델로의 전환이 보수적으로도 합리적입니다.",
      },
    ],
  },
  {
    slug: "pricing-vs-traditional-models",
    title: "전통 모델 vs 버추얼 모델 — 실제 견적 비교",
    excerpt:
      "광고주가 가장 자주 묻는 견적 비교. 같은 컨셉 5컷 캠페인의 실가격 데이터.",
    publishedAt: "2026-05-14",
    readingMinutes: 4,
    tags: ["가격", "비용", "견적"],
    sections: [
      {
        heading: "비교 기준",
        body: "같은 컨셉(미니멀·차가운·모노톤) 5컷 + SNS 3개월 사용권 + 1개 산업 카테고리 한정. 광고주 50명 인터뷰로 실가격 분포를 수집했습니다.",
      },
      {
        heading: "전통 모델 (실존 인물)",
        body: "신인 모델 ₩800만~₩1,500만, A급 인플루언서 ₩2,500만~₩6,000만, 셀럽 ₩8,000만~₩2억. 여기에 촬영 인건비·로케이션·후반작업 평균 ₩500만~₩1,200만 별도. 일정 조율 1~3주.",
      },
      {
        heading: "버추얼 모델 (Virtual Agency)",
        body: "신규 컨셉 ₩200만~₩500만 (5컷 패키지). 동일 모델 재사용 시 컷 단가 ₩30만~₩80만. 컴퓨트 비용 포함. 평균 납기 24~72시간. 추가 컷 무한 확장 가능.",
      },
      {
        heading: "총비용 vs 결과물 가치",
        body: "결과 품질이 동등하다고 보면 4~10배 가격 차이. 같은 예산이면 버추얼로 컷 수를 4~10배 확장 → A/B 테스트 횟수와 캠페인 학습 속도가 압도적으로 빨라집니다.",
      },
      {
        heading: "언제 전통 모델이 더 나은가",
        body: "(1) 라이브 행사 진행, (2) 진성 팬 베이스 활용, (3) 1년 이상 단일 브랜드 앰배서더. 이 셋 외에는 버추얼 모델이 거의 모든 경우에 ROI 우위.",
      },
    ],
  },
  {
    slug: "b2b-buying-checklist-virtual-models",
    title: "버추얼 모델 에이전시 선정 — B2B 광고주 체크리스트",
    excerpt:
      "잘못된 에이전시 선택은 캠페인 실패로 직결됩니다. 구매 결정 전 반드시 확인해야 할 12가지.",
    publishedAt: "2026-05-13",
    readingMinutes: 6,
    tags: ["가이드", "체크리스트", "B2B"],
    sections: [
      {
        heading: "1~3: 모델 자산",
        body: "(1) 활성 모델 수 30+ 이상인가. (2) 매월 신규 모델 추가 빈도. (3) 모델별 컨셉/무드 메타데이터가 검색 가능한가. 자산이 빈약하면 매칭 정확도가 떨어집니다.",
      },
      {
        heading: "4~6: 생성 인프라",
        body: "(4) 자체 GPU 인프라인가 외부 API 의존인가 (안정성 차이). (5) 평균 컷당 생성 시간 (60초 이하 권장). (6) 영상 생성 지원 여부 + lipsync 옵션. 영상이 없으면 1년 안에 한계 도달.",
      },
      {
        heading: "7~9: 운영 도구",
        body: "(7) 광고주 대시보드 + 견적 기능. (8) 캠페인 상태 변경 알림. (9) CSV 익스포트 + 데이터 소유권. 직접 운영 도구 없이 이메일 핑퐁만 한다면 스케일 불가능.",
      },
      {
        heading: "10~12: 계약과 클리어런스",
        body: "(10) 학습 데이터 출처 + 초상권 클리어런스 보증서. (11) 카테고리 독점 옵션. (12) 광고 종료 후 모델 자산 처분 정책. 이 셋이 누락되면 법무 리스크.",
      },
      {
        heading: "Virtual Agency 체크 결과",
        body: "위 12항목 모두 충족. /press 에 통계, /faq 에 클리어런스 정책, /pricing 에 카테고리 독점 옵션이 공개되어 있습니다. 견적은 model detail → 캠페인 요청에서 즉시 발행되며, PDF 다운로드도 지원합니다.",
      },
    ],
  },
  {
    slug: "lookbook-series-strategy-2026",
    title: "룩북 시리즈 vs 단발 컷 — 2026년 캠페인 전략",
    excerpt:
      "동일 모델 4~12컷 시리즈가 단발 컷보다 ROI 가 높은 이유. 시리즈 구성 황금비 공개.",
    publishedAt: "2026-05-19",
    readingMinutes: 5,
    tags: ["룩북", "시리즈", "전략", "캠페인"],
    sections: [
      {
        heading: "왜 시리즈가 다시 부상하나",
        body: "2024~2025년 SNS 알고리즘이 동일 크리에이티브의 반복 노출을 페널티 처리하면서, '같은 모델·다른 컷' 시리즈가 1컷 캠페인보다 평균 CTR 1.4~1.7배 우위로 돌아왔습니다. 버추얼 모델은 시리즈 비용이 인플루언서 대비 1/10 이라 이 구조의 가장 큰 수혜자입니다.",
      },
      {
        heading: "황금비 4-2-1",
        body: "Virtual Agency 광고주 데이터 기준 가장 효율적인 시리즈 구성: 메인 컨셉 컷 4장, 분위기 변형 2장, 클로즈업/디테일 1장. 이 7장 단위가 SNS 캐러셀·옥외·랜딩 페이지 모두에서 재사용됩니다.",
      },
      {
        heading: "무드 일관성 잠그기",
        body: "시리즈는 모델 얼굴이 아니라 무드(cold/warm/edgy 등 3단어)로 잠가야 합니다. 같은 모델이지만 무드가 흔들리면 시리즈가 아니라 별개 캠페인 5건처럼 인식됩니다. 브리프에 무드 3단어를 명시하세요.",
      },
      {
        heading: "운영 효율 — 시즌 횡단 재사용",
        body: "1차 시리즈 7컷을 잘 만들면, 2분기에는 의상·로케이션만 갱신해 4컷 추가로 시리즈를 확장할 수 있습니다. 분기당 시리즈 갱신 비용이 신규 캠페인의 30~40% 수준으로 떨어집니다.",
      },
      {
        heading: "언제 단발 컷이 더 나은가",
        body: "(1) 단기 프로모션 (할인·이벤트·신제품 출시일 한정), (2) A/B 컨셉 검증 단계, (3) 모델 적합성 평가 테스트. 이 3 경우는 단발 컷 1~3장이 적합. 결과 데이터를 보고 다음 분기에 시리즈로 확장하세요.",
      },
    ],
  },
  {
    slug: "video-vs-image-virtual-models",
    title: "버추얼 모델 영상 vs 이미지 — 어떤 산업에서 영상이 필요한가",
    excerpt:
      "영상이 항상 우월하지 않습니다. 산업별로 영상 ROI 가 임계점을 넘는 조건과 그렇지 않은 경우.",
    publishedAt: "2026-05-18",
    readingMinutes: 6,
    tags: ["영상", "이미지", "전략", "산업"],
    sections: [
      {
        heading: "영상 = 더 비싼 이미지가 아니다",
        body: "영상은 단순히 이미지를 움직이는 것이 아니라 다른 의도를 전달합니다. 이미지가 '브랜드 인지·기억'을 만든다면, 영상은 '제품 사용 흐름·감정 곡선'을 만듭니다. 이 차이를 무시하고 영상을 '비싼 이미지'로 발주하면 ROI 가 깨집니다.",
      },
      {
        heading: "산업별 영상 임계점",
        body: "뷰티: 영상 ROI 임계점 = 시즌 캠페인 6주 이상. 패션: 영상 임계점 = 컬렉션 단위 (4~8주). 식음료: 영상 ROI 가 가장 빠르게 발동 (1주 프로모션도 가치). 테크: 제품 사용 흐름이 핵심이라 거의 항상 영상 권장. 럭셔리: 이미지 + 분기당 영상 1편이 골든 비율.",
      },
      {
        heading: "립싱크 vs 무음",
        body: "한국 광고는 자막 시청률이 60%를 넘기 때문에 립싱크 정확도는 영어권보다 덜 중요합니다. 다만 글로벌 캠페인이면 립싱크 정확도가 우선. Virtual Agency 영상 서비스는 한국어·영어·일본어 립싱크를 기본 제공합니다.",
      },
      {
        heading: "비용 구조 — 이미지 vs 영상",
        body: "Virtual Agency 기준 이미지 1컷 ₩40~80만, 영상 5초 ₩200~400만, 30초 ₩800~1,500만. 인플루언서 영상 대비 1/5~1/10 가격이지만 이미지 대비 5~10배 가격이라 분명한 의도가 있을 때만 발주하세요.",
      },
      {
        heading: "체크리스트 — 영상이 필요한가",
        body: "(1) 캠페인이 1주 이상 지속되는가, (2) 제품 사용·움직임을 보여줘야 하는가, (3) 감정 곡선이 핵심 메시지인가, (4) 풀-스크린 광고 매체(YouTube·TVCF·옥외)에 게재하는가. 2개 이상 yes 면 영상 발주가 ROI 우위. 1개 이하라면 이미지 시리즈로 충분.",
      },
    ],
  },
  {
    slug: "quarterly-brand-model-retention",
    title: "분기 단위 전속 모델 운영 — Brand Model Kit 도입 가이드",
    excerpt:
      "단발 캠페인보다 분기 단위로 같은 모델을 재사용하면 인지·전환·LTV 가 동시에 올라갑니다. 도입 임계점과 운영 체크리스트.",
    publishedAt: "2026-05-17",
    readingMinutes: 5,
    tags: ["브랜드 키트", "리텐션", "전략", "독점"],
    sections: [
      {
        heading: "단발 캠페인의 한계",
        body: "광고주가 분기마다 다른 모델·다른 컨셉으로 캠페인을 발주하면 인지 누적이 0으로 리셋됩니다. 같은 예산을 같은 모델에 분기 단위로 집중하면 인지 누적 곡선이 가파르게 올라갑니다.",
      },
      {
        heading: "도입 임계점 3가지",
        body: "(1) 연간 광고 예산이 ₩2억 이상, (2) 같은 카테고리 신제품 라인이 분기당 1개 이상, (3) SNS·옥외·인쇄 등 3채널 이상 운영. 셋 모두 충족하면 Brand Model Kit (전속 모델 + 컨셉 라이브러리) 도입 ROI 가 단발 캠페인보다 우위.",
      },
      {
        heading: "독점의 진짜 가치",
        body: "분기 단위 운영은 사실상 카테고리 독점과 결합되어야 가치가 극대화됩니다. 같은 모델이 경쟁사에 등장하면 누적 인지가 분산되기 때문입니다. Virtual Agency 의 카테고리 독점 옵션을 활용하세요.",
      },
      {
        heading: "운영 체크리스트",
        body: "(1) 분기 시작 14일 전 신규 컨셉 컨펌, (2) 분기당 신규 컷 30~50장 + 영상 1~2편, (3) 캠페인 사이 1~2주 휴면 기간으로 시청 피로도 관리, (4) 분기 말 결과 리뷰 + 다음 분기 로드맵. 이 사이클이 정착되면 광고주 운영팀 1명이 분기당 캠페인 3~4건을 운영 가능합니다.",
      },
      {
        heading: "측정 — LTV 곡선",
        body: "분기 1: 인지 누적. 분기 2: 전환률 1.2~1.4배 상승. 분기 3: 재구매 + LTV 1.3~1.6배. 단발 캠페인 4회보다 분기 단위 1년 운영이 누적 결과 기준 2~3배 효율. 단, 분기 1만 보면 단발과 차이가 거의 없어 보일 수 있어 의사결정에 주의.",
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

/**
 * Slug-safe key derived from a Korean (or any) tag string. We can't put
 * Korean characters in a URL path reliably across crawlers + RSS readers,
 * so we percent-encode at the framework boundary but key the lookup map on
 * the raw tag for stable comparisons.
 */
export function tagSlug(tag: string): string {
  return encodeURIComponent(tag);
}

export function decodeTagSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function listTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of BLOG_POSTS) {
    for (const t of post.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function listPostsByTag(tag: string): BlogPost[] {
  return listPosts().filter((p) => p.tags.includes(tag));
}

/**
 * Returns up to `limit` posts ranked by tag overlap with the source post,
 * tie-broken by recency. The source post itself is excluded. Falls back to
 * the most recent posts when there is no overlap so callers always have
 * something to render.
 */
export function listRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const source = getPostBySlug(slug);
  if (!source) return listPosts().slice(0, limit);
  const others = listPosts().filter((p) => p.slug !== slug);
  const scored = others.map((p) => {
    const overlap = p.tags.filter((t) => source.tags.includes(t)).length;
    return { post: p, overlap };
  });
  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return b.post.publishedAt.localeCompare(a.post.publishedAt);
  });
  // If nothing overlaps the source's tags, the sort above is just by date
  // descending anyway — so we still return something useful.
  return scored.slice(0, limit).map((s) => s.post);
}
