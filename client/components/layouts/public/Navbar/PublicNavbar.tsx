import Image from "next/image";
import Link from "next/link";

import BaseNavbar, {
  type BaseNavAction,
  type BaseNavItem,
} from "@/components/layouts/@base/NavBar/baseNavBar";

const navItems: BaseNavItem[] = [
  { href: "#problem", label: "Vì sao MailGuard" },
  { href: "#features", label: "Tính năng" },
  { href: "/register", label: "Đăng ký" },
];

const actions: BaseNavAction[] = [
  { href: "/login", label: "Login", variant: "primary" },
];

export default function PublicNavbar() {
  return <BaseNavbar brand={<PublicBrand />} navItems={navItems} actions={actions} />;
}

function PublicBrand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Image
        src="/img/Logo.png"
        alt="MailGuard"
        width={30}
        height={30}
        className="h-7 w-7 rounded-md object-cover"
        priority
      />
      <span className="text-sm font-semibold tracking-[-0.02em] text-[#111827]">MailGuard</span>
    </Link>
  );
}
