import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 처리방침 — Virtual Agency",
  description: "Virtual Agency가 수집·이용하는 개인정보 안내",
};

export default function PrivacyPage() {
  return (
    <>
      <p className="text-xs text-zinc-500 uppercase tracking-widest">
        최종 개정 2026-05-14
      </p>
      <h1 className="text-3xl font-bold mt-2 mb-8 text-white">
        개인정보 처리방침
      </h1>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        1. 수집 항목
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>회원가입: 이메일, 비밀번호(해시), 회사명, 담당자명, 전화번호</li>
        <li>문의 접수: 프로젝트 브리프, 예산 범위, 사용 목적</li>
        <li>자동 수집: 접속 IP, 브라우저 정보, 페이지 방문 기록</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        2. 수집 목적
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>회원 식별 및 서비스 제공</li>
        <li>문의 응답 및 견적 산출</li>
        <li>계약 체결 및 청구·정산</li>
        <li>서비스 개선 통계 분석 (비식별 처리)</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        3. 보관 기간
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>회원 정보: 탈퇴 시까지 (탈퇴 후 30일 이내 파기)</li>
        <li>계약·결제 기록: 전자상거래법에 따라 5년</li>
        <li>로그 기록: 통신비밀보호법에 따라 3개월</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        4. 제3자 제공
      </h2>
      <p className="leading-relaxed">
        회사는 회원의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단,
        법령에 의거하거나 수사 목적으로 정해진 절차에 따라 요청받은 경우는
        예외로 합니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        5. 처리 위탁
      </h2>
      <p className="leading-relaxed">
        서비스 운영을 위해 다음 업체에 처리를 위탁합니다.
      </p>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>Vercel — 웹 호스팅</li>
        <li>Supabase (자체 호스팅) — DB·인증</li>
        <li>Replicate — AI 모델 추론 (모델 생성 시 일시 처리)</li>
        <li>Meshy — 3D 모델 생성 (입력 이미지 일시 처리)</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        6. 이용자 권리
      </h2>
      <p className="leading-relaxed">
        회원은 언제든지 본인의 개인정보를 열람·정정·삭제·처리 정지를 요구할
        수 있으며, 회원 탈퇴 시 모든 정보는 즉시 비활성화됩니다.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        7. 보호 조치
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>비밀번호 단방향 해시(bcrypt) 저장</li>
        <li>HTTPS 전 구간 암호화 전송</li>
        <li>관리자 권한 RLS 정책으로 분리</li>
        <li>주기적 보안 감사 및 audit log 보관</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        8. 개인정보 책임자
      </h2>
      <p className="leading-relaxed">
        문의:{" "}
        <a
          href="mailto:privacy@aihubs.uk"
          className="text-zinc-300 underline hover:text-white"
        >
          privacy@aihubs.uk
        </a>
      </p>

      <p className="text-xs text-zinc-500 mt-12">
        본 방침은 기본 템플릿이며, 실제 운영 시 개인정보보호위원회 가이드 및
        법률 자문을 받아 최종 확정해야 합니다.
      </p>
    </>
  );
}
