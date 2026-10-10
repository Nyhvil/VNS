import DashboardSetup from "@/components/layouts/dashboard/DashboardSetup";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <DashboardSetup>{children}</DashboardSetup>;
}
