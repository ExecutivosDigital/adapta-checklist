import { ResetPasswordScreen } from "@/components/driver/screens/ResetPasswordScreen";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ email?: string; code?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { email, code } = await searchParams;
  if (!email || !code) {
    redirect("/forgot-password");
  }
  return <ResetPasswordScreen email={email} code={code} />;
}
