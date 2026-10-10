import AuthBrand from "@/components/layouts/auth/Navbar/AuthBrand";

export default function AuthSetup({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(255,220,95,0.26),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(255,218,106,0.14),transparent_20%),linear-gradient(180deg,#fffdf9_0%,#ffffff_55%,#fffdfa_100%)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#f1cb48_0%,#ffe589_50%,#f1cb48_100%)]" />

      <div className="mx-auto flex min-h-screen max-w-340 flex-col px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <AuthBrand />
        {children}
      </div>
    </main>
  );
}
