import PublicFooter from "@/components/layouts/public/Footer/PublicFooter";
import PublicNavbar from "@/components/layouts/public/Navbar/PublicNavbar";

export default function PublicSetup({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="sentinel-shell relative flex min-h-screen flex-col overflow-hidden text-[var(--mg-on-surface)]">
      <PublicNavbar />
      <div className="pt-18">{children}</div>
      <PublicFooter />
    </div>
  );
}
