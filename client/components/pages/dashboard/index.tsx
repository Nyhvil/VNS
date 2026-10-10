import DashboardOverviewHero from "@/components/pages/dashboard/DashboardOverviewHero";
import DashboardStatCards from "@/components/pages/dashboard/DashboardStatCards";
import ProtectionStatusPanel from "@/components/pages/dashboard/ProtectionStatusPanel";
import QuickScanPanel from "@/components/pages/dashboard/QuickScanPanel";
import RecentHistoryPanel from "@/components/pages/dashboard/RecentHistoryPanel";
import UpdateStatusCard from "@/components/pages/dashboard/UpdateStatusCard";

export default function DashboardExperience() {
  return (
    <section className="space-y-6">
      <DashboardOverviewHero />
      <DashboardStatCards />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <QuickScanPanel />
          <RecentHistoryPanel />
        </div>

        <div className="space-y-5 xl:pt-1">
          <ProtectionStatusPanel />
          <UpdateStatusCard />
        </div>
      </div>
    </section>
  );
}
