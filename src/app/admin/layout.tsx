import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kitchen admin",
  description: "Kuopio Bites staff panel — orders, menu and service timing.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
