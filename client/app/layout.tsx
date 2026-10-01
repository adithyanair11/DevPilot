import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import QueryProvider from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toast";

const sourceSans3Heading = Source_Sans_3({ subsets: ['latin'], variable: '--font-heading' });

const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevPilot",
  description: "Chat with your GitHub codebases. Answers cite the exact files and lines they came from.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", ibmPlexSans.variable, sourceSans3Heading.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">

        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster>{children}</Toaster>
          </ThemeProvider>
        </QueryProvider>

      </body>
    </html>
  );
}
