import type { Metadata } from "next";
import "./globals.css";

import InitialLoadOverlay from "@/components/system/InitialLoadOverlay";
import { AuthProvider } from "@/store/authStore";

export const metadata: Metadata = {
  title: "MailGuard",
  description: "MailGuard frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full overflow-x-hidden">
        <AuthProvider>
          <InitialLoadOverlay>{children}</InitialLoadOverlay>
        </AuthProvider>
      </body>
    </html>
  );
}
