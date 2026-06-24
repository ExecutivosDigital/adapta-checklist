import { VerifyCodeScreen } from "@/components/driver/screens/VerifyCodeScreen";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyCodePage({ searchParams }: PageProps) {
  const { email } = await searchParams;
  if (!email) {
    redirect("/forgot-password");
  }
  return <VerifyCodeScreen email={email} />;
}
