import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alba - Connexion",
  description: "Connectez-vous à votre compte Alba",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
