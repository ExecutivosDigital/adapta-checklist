import { ChangePasswordScreen } from "@/components/driver/screens/ChangePasswordScreen";
import { Suspense } from "react";

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={null}>
      <ChangePasswordScreen />
    </Suspense>
  );
}
