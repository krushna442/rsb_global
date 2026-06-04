import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { AppProviders } from "@/contexts/AppProviders";

export const metadata: Metadata = {
  title: "RSB Global",
  description: "Enterprise dashboard for product specifications, production verification, QR scanning, approvals, and document management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AppProviders>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </AppProviders>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
