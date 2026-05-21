import SiteFooter from "@/components/site-footer";
import MobileNav from "@/components/mobile-nav";

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MobileNav />
      {children}
      <SiteFooter />
    </>
  );
}
