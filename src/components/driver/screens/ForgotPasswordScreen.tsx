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
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError("E-mail inválido");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await authService.forgotPassword({ email: trimmed });
      router.push(
        `/forgot-password/verify?email=${encodeURIComponent(trimmed)}`,
      );
    } catch (err) {
      setError(extractApiError(err, "Não foi possível enviar o código"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-surface dark:via-background dark:to-surface p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/80 text-text-muted shadow-sm transition hover:bg-surface"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        <div className="text-center">
          <div className="from-primary mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br to-orange-600 shadow-lg">
            <KeyRound className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text">Esqueci minha senha</h1>
          <p className="mt-2 text-text-muted">
            Vamos te enviar um código por e-mail
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl">E-mail cadastrado</CardTitle>
            <CardDescription>
              Informe o e-mail usado no seu cadastro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                "Enviar código"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}