"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiError } from "@/lib/api";
import * as authService from "@/services/authService";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ResetPasswordScreenProps {
  email: string;
  code: string;
}

export function ResetPasswordScreen({ email, code }: ResetPasswordScreenProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (newPassword !== confirm) {
      setError("As senhas não coincidem");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await authService.resetPassword({ email, code, newPassword });
      router.push("/login?reset=success");
    } catch (err) {
      setError(extractApiError(err, "Não foi possível alterar a senha"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-surface dark:via-background dark:to-surface p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/forgot-password/verify?email=${encodeURIComponent(email)}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/80 text-text-muted shadow-sm transition hover:bg-surface"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        <div className="text-center">
          <div className="from-primary mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br to-orange-600 shadow-lg">
            <Lock className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text">Nova senha</h1>
          <p className="mt-2 text-text-muted">Crie uma senha forte para sua conta</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl">Definir senha</CardTitle>
            <CardDescription>Mínimo 6 caracteres</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-semibold">
                Nova senha
              </Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-14 text-base"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm font-semibold">
                Confirmar senha
              </Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-14 text-base"
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-14 w-full text-base font-semibold shadow-lg transition-all hover:shadow-xl"
              size="lg"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Salvar nova senha"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}