import DashboardDataProvider from "@/components/layouts/dashboard/DashboardDataProvider";
import DashboardFooter from "@/components/layouts/dashboard/Footer/DashboardFooter";
import DashboardNavbar from "@/components/layouts/dashboard/Navbar/DashboardNavbar";
import DashboardSidebar from "@/components/layouts/dashboard/Sidebar/DashboardSidebar";

export default function DashboardSetup({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,203,17,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_20%),linear-gradient(180deg,#f6f8fb_0%,#edf2f7_100%)] px-4 py-4 text-(--mg-on-surface) lg:px-6 lg:py-6">
      <div className="mx-auto grid max-w-362.5 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <DashboardSidebar />
        <DashboardDataProvider>
          <div className="min-w-0 space-y-6 xl:pt-3">
            <DashboardNavbar />
            {children}
            <DashboardFooter />
          </div>
        </DashboardDataProvider>
      </div>
    </div>
  );
}
