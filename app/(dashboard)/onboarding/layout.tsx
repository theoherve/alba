import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alba - Configuration",
  description: "Configurez votre conciergerie Alba",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
