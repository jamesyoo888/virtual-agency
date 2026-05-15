import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 — Virtual Agency",
  description: "Virtual Agency 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <>
      <p className="text-xs text-zinc-500 uppercase tracking-widest">최종 개정 2026-05-14</p>
      <h1 className="text-3xl font-bold mt-2 mb-8 text-white">이용약관</h1>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. 목적</h2>
      <p className="leading-relaxed">
        본 약관은 Virtual Agency(이하 &ldquo;회사&rdquo;)가 제공하는 AI 기반 버추얼 모델
        에이전시 서비스(이하 &ldquo;서비스&rdquo;)의 이용 조건과 절차, 회사와 회원의
        권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">2. 서비스 내용</h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>AI 버추얼 모델 카탈로그 열람 및 매칭 추천</li>
        <li>모델 라이선스 견적 산출 및 문의 접수</li>
        <li>광고·콘텐츠 제작 프로젝트 관리</li>
        <li>제작된 자산의 다운로드 및 라이선스 발급</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">3. 라이선스 및 사용 범위</h2>
      <p className="leading-relaxed">
        회사가 제공하는 버추얼 모델의 이미지·영상·3D 에셋은 회사의 지적재산이며,
        클라이언트는 계약된 범위 내(기간·산업·매체·지역)에서만 사용할 수 있습니다.
        독점 라이선스 계약 시 동일 산업 내 경쟁사 사용이 제한되며, 비독점의 경우
        타사도 동시 사용 가능합니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">4. 금지 행위</h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>모델 자산을 계약 외 용도(딥페이크·성적·정치적 콘텐츠 등)에 사용</li>
        <li>모델 외관을 모방하여 실존 인물처럼 묘사</li>
        <li>제3자에게 자산을 양도·재판매</li>
        <li>크롤링·자동화 스크립트로 카탈로그·API를 무단 수집</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">5. 요금 및 결제</h2>
      <p className="leading-relaxed">
        각 모델의 일일 단가와 독점 단가는 카탈로그에 명시되며, 다일 계약 시
        장기 할인이 자동 적용됩니다. 최종 견적은 문의 후 확정되며, 결제 조건은
        개별 계약서에 따릅니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">6. 계약 해지 및 환불</h2>
      <p className="leading-relaxed">
        제작 착수 전 해지 시 전액 환불, 제작 진행 후 해지 시 진행 단계에 비례한
        금액을 차감합니다. 납품 완료 후에는 환불이 불가합니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">7. 면책 사항</h2>
      <p className="leading-relaxed">
        AI 생성물은 외부 인프라(Replicate, Meshy 등)에 의존하며, 외부 장애로 인한
        지연·실패에 대해 회사는 합리적 노력 외의 책임을 지지 않습니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">8. 분쟁 해결</h2>
      <p className="leading-relaxed">
        본 약관에 관한 분쟁은 대한민국 법령을 따르며, 회사 본사 소재지 관할
        법원을 1심 관할로 합니다.
      </p>

      <p className="text-xs text-zinc-500 mt-12">
        ※ 본 약관은 견본 템플릿이며, 실제 운영 시 법률 자문을 받아 최종 확정해야 합니다.
      </p>
    </>
  );
}
