import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI ?⑹꽦 肄섑뀗痢??쒓린 ?뺤콉 ??Virtual Agency",
  description:
    "Virtual Agency 媛 ?댁쁺?섎뒗 AI 媛??紐⑤뜽???⑹꽦 肄섑뀗痢??쒓린 ?먯튃. EU AI Act Article 50, FTC Endorsement Guides, UK ASA / CAP Code 諛??쒓뎅 諛⑹떖??媛?대뱶 湲곕컲.",
};

export default function AiDisclosurePage() {
  return (
    <>
      <p className="text-xs text-zinc-500 uppercase tracking-widest">
        理쒖쥌 媛쒖젙 2026-05-26 쨌 Version 1.0
      </p>
      <h1 className="text-3xl font-bold mt-2 mb-3 text-white">
        AI ?⑹꽦 肄섑뀗痢??쒓린 ?뺤콉
      </h1>
      <p className="text-zinc-400 text-sm mb-8">
        Virtual Agency ??紐⑤뱺 紐⑤뜽? AI 濡??앹꽦???⑹꽦 ?몃Ъ (synthetic talent) ?낅땲??
        ?ㅼ젣濡?議댁옱?섎뒗 ?щ엺??珥ъ쁺??寃껋씠 ?꾨떃?덈떎. 蹂??섏씠吏???곕━媛 ???ъ떎??        ?대뼸寃?紐낆떆?섍퀬, 愿묎퀬二쇨? 罹좏럹??吏묓뻾 ???대뼡 ?섎Т瑜??댄뻾?댁빞 ?섎뒗吏瑜??ㅻ챸?⑸땲??
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. ?듭떖 ?먯튃</h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1.5">
        <li>
          <strong className="text-white">?⑹꽦?꾩쓣 ?④린吏 ?딅뒗??</strong> 紐⑤뱺 紐⑤뜽 ?꾨줈??          ?섏씠吏쨌OG 移대뱶쨌?앹꽦 ?대?吏?먮뒗 AI ?앹꽦 ?쒓린媛 紐낆떆?⑸땲??
        </li>
        <li>
          <strong className="text-white">?ㅼ젣 ?몃Ъ怨??쇰룞???쇱쑝?ㅼ? ?딅뒗??</strong>
          罹먮┃?곕뒗 媛怨듭쓽 ?몃Ъ?대ŉ, ?ㅼ〈 ?몃Ъ ?먮뒗 ?좊챸?몄쓣 紐⑥궗?섏? ?딆뒿?덈떎.
        </li>
        <li>
          <strong className="text-white">議곗옉 媛?μ꽦???뚮┛??</strong> 愿묎퀬二쇱뿉寃??쒓났?섎뒗
          紐⑤뱺 ?곗텧臾쇱? ?앹꽦 AI 濡?留뚮뱾?댁죱?뚯쓣 罹좏럹???щ━?먯씠?곕툕 ?④퀎?먯꽌 ?④퍡 ?덈궡?⑸땲??
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        2. ?곸슜?섎뒗 湲濡쒕쾶 洹쒖젣
      </h2>

      <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
        2.1 EU AI Act Article 50 (2026 ?쒗뻾)
      </h3>
      <p className="leading-relaxed">
        EU ?쒖옣????곸쑝濡???罹좏럹?몄? AI ?쒖뒪?쒖쑝濡??앹꽦쨌議곗옉???대?吏쨌?ㅻ뵒?ㅒ룹쁺?곸뿉 ???        ?대떦 肄섑뀗痢좉? ?멸났?곸쑝濡??앹꽦?섏뿀?뚯쓣 紐낆떆?곸쑝濡??쒖떆?댁빞 ?⑸땲??(Art. 50 짠2).
        Virtual Agency ???ㅼ쓬???쒓났?⑸땲??
      </p>
      <ul className="list-disc list-inside leading-relaxed space-y-1 mt-2">
        <li>
          <strong className="text-white">C2PA / 硫뷀??곗씠???뚰꽣留덊겕</strong> {`??`}
          ?곗텧臾?EXIF 諛?C2PA manifest ??{`짬AI-generated쨩`} 留덊궧???쎌엯 (?붿껌 ???쒖꽦??
        </li>
        <li>
          <strong className="text-white">?쒓컖???뚰꽣留덊겕</strong> {`??`}
          紐⑥꽌由??먮뒗 罹≪뀡??{`짬AI-generated쨩`} / {`짬?⑹꽦 肄섑뀗痢졖?} ?쒓린 ?듭뀡
        </li>
        <li>
          <strong className="text-white">alt text</strong> {`??`}
          {`짬AI-generated portrait of a fictional model named {name}쨩`} ?먮룞 ?앹꽦
        </li>
      </ul>

      <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
        2.2 FTC Endorsement Guides (誘멸뎅)
      </h3>
      <p className="leading-relaxed">
        誘멸뎅 ?곕갑嫄곕옒?꾩썝?뚮뒗 媛???명뵆猷⑥뼵?쑣텮I 紐⑤뜽???멸컙 endorser ? ?숈씪??湲곗??쇰줈
        洹쒖젣?⑸땲??(16 CFR Part 255, 2023 媛쒖젙). 罹좏럹??寃뚯떆臾쇱뿉 ?ㅼ쓬???ы븿?댁빞 ?⑸땲??
      </p>
      <ul className="list-disc list-inside leading-relaxed space-y-1 mt-2">
        <li>{`짬This is a fictional, AI-generated character쨩`} ??紐낆떆</li>
        <li>愿묎퀬?꾩쓣 #ad / #sponsored ?깆쑝濡??쒖떆</li>
        <li>?ㅼ젣 ?ъ슜 寃쏀뿕??二쇱옣?섏? ?딆쓣 寃?(紐⑤뜽? ?쒗뭹???ъ슜?????놁쓬)</li>
      </ul>

      <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
        2.3 UK ASA / CAP Code (?곴뎅)
      </h3>
      <p className="leading-relaxed">
        ?곴뎅 愿묎퀬湲곗??꾩썝?뚮뒗 misleading representation ??湲덉??⑸땲??(CAP Code Rule 3.1).
        AI ?앹꽦 紐⑤뜽?꾩쓣 ?먮쭑쨌罹≪뀡쨌hashtag ?깆쑝濡??됯퇏 ?뚮퉬?먭? ?몄? 媛?ν븳 諛⑹떇?쇰줈
        ?쒖떆?댁빞 ?⑸땲??
      </p>

      <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
        2.4 ?쒓뎅 諛⑹떖??媛?대뱶 (2024.06)
      </h3>
      <p className="leading-relaxed">
        諛⑹넚?듭떊?ъ쓽?꾩썝?뙿룰났?뺢굅?섏쐞?먰쉶??AI 媛??紐⑤뜽 愿묎퀬??{`짬媛???몃Ъ?낅땲?ㅒ?}
        ?먮뒗 {`짬AI 紐⑤뜽쨩`} ?쒓린瑜?沅뚭퀬?⑸땲?? ?붿옣?댟룹떇?댟룰툑?????⑤뒫 二쇱옣???곕Ⅴ??        ?낆쥌? ?쒓린媛 ?ъ떎???꾩닔?낅땲??
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        3. ?곕━媛 ?먮룞?쇰줈 ?곸슜?섎뒗 ?쒓린
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1.5">
        <li>紐⑤뜽 detail ?섏씠吏 ?곗륫 ?곷떒 {`짬AI ?⑹꽦 ?몃Ъ쨩`} 諛곗?</li>
        <li>OG 移대뱶 ?섎떒 {`짬AI-generated synthetic talent쨩`} ??以?/li>
        <li>
          紐⑤뱺 紐⑤뜽 ?섏씠吏??蹂??뺤콉 ({" "}
          <Link
            href="/legal/ai-disclosure"
            className="text-zinc-300 underline hover:text-white"
          >
            /legal/ai-disclosure
          </Link>{" "}
          ) 留곹겕
        </li>
        <li>寃ъ쟻 PDF ?명꽣??{`짬Synthetic talent ??campaign disclosure required쨩`} ??以?/li>
        <li>JSON-LD ??<code className="text-zinc-300">additionalType</code> ???⑹꽦 ?몃Ъ 留덊궧</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        4. 愿묎퀬二쇨? 罹좏럹??吏묓뻾 ???댁빞 ????      </h2>
      <ol className="list-decimal list-inside leading-relaxed space-y-1.5">
        <li>
          罹좏럹???щ━?먯씠?곕툕 (?대?吏쨌?곸긽쨌SNS post) ???⑹꽦?꾩쓣 紐낆떆 ??罹≪뀡쨌?먮쭑쨌OSD
          以???怨??댁긽??{`짬AI 紐⑤뜽쨩`}, {`짬Virtual model쨩`}, {`짬AI-generated쨩`} ?쒓린
        </li>
        <li>
          ?源??쒖옣???쒓린 ?섎Т??留욎떠 ?뚰꽣留덊겕 ?듭뀡 ?쒖꽦??(EU ?쒖옣 = C2PA ?꾩닔)
        </li>
        <li>
          紐⑤뜽???ъ슜 寃쏀뿕??二쇱옣?섎뒗 ?뺥깭??移댄뵾 ?ъ슜 湲덉? (?? {`짬?쒓? 吏곸젒 ?⑤낯?┑?})
        </li>
        <li>
          ?ㅼ〈 ?몃Ъ쨌?좊챸?몄쓣 紐⑥궗쨌?⑹꽦??寃껋쑝濡?蹂댁씪 ???덈뒗 蹂??湲덉?
        </li>
      </ol>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        5. 湲덉??섎뒗 ?ъ슜
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>?ㅼ〈 ?몃Ъ???쇨뎬쨌紐⑹냼由?룹떊泥??뱀쭠??紐⑤갑???붿????몄쐢 ?앹꽦</li>
        <li>?⑹꽦?꾩쓣 紐낆떆?섏? ?딆? ?뺤튂쨌?좉굅 肄섑뀗痢?/li>
        <li>?섎즺쨌湲덉쑖 ?먮Ц ???꾨Ц ?먭꺽??媛?ν븳 肄섑뀗痢?/li>
        <li>18??誘몃쭔?쇰줈 ?몄떇?????덈뒗 ?몃Ъ???깆쟻 ?먮뒗 ?꾪빐 肄섑뀗痢?/li>
        <li>?뱀젙 ?몄쥌쨌?깅퀎쨌醫낃탳瑜?鍮꾪븯쨌?먯삤?섎뒗 臾섏궗</li>
      </ul>
      <p className="leading-relaxed mt-2">
        蹂???ぉ ?꾨컲???뺤씤?섎㈃ ?곕━???곗텧臾??ъ슜??利됱떆 以묐떒 ?붿껌?섍퀬, 諛섎났 ??        怨꾩빟???댁??⑸땲??
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        6. 而댄뵆?쇱씠?몄뒪 臾몄쓽
      </h2>
      <p className="leading-relaxed">
        蹂??뺤콉??????섍껄쨌踰뺣쪧 臾몄쓽쨌?쒖옣蹂??쒓린 ?붽굔 ?뺤씤:{" "}
        <a
          href="mailto:compliance@aihubs.uk"
          className="text-zinc-300 underline hover:text-white"
        >
          compliance@aihubs.uk
        </a>
      </p>

      <p className="text-xs text-zinc-500 mt-12">
        ??蹂??뺤콉? EU AI Act, US FTC Endorsement Guides, UK ASA CAP Code, ?쒓뎅
        諛⑹떖??媛?대뱶瑜?醫낇빀???댁쁺 湲곗??대ŉ, 媛쒕퀎 罹좏럹?몄쓽 踰뺣쪧 ?먮Ц???泥댄븯吏
        ?딆뒿?덈떎. 愿묎퀬二쇰뒗 ?源??쒖옣??理쒖떊 洹쒖젣瑜?蹂꾨룄 ?뺤씤?댁빞 ?⑸땲??
      </p>
    </>
  );
}
