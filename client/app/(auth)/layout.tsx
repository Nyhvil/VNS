import AuthSetup from "@/components/layouts/auth/AuthSetup";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthSetup>{children}</AuthSetup>;
}
