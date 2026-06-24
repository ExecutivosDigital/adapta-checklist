"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { extractApiError } from "@/lib/api";
import * as authService from "@/services/authService";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

const CODE_LENGTH = 8;
const CODE_TTL_SECONDS = 15 * 60;

interface VerifyCodeScreenProps {
  email: string;
}

export function VerifyCodeScreen({ email }: VerifyCodeScreenProps) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL_SECONDS);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const code = digits.join("");

  const handleChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
    if (sanitized && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === "Enter") {
      handleSubmit();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleSubmit = async () => {
    if (code.length !== CODE_LENGTH) {
      setError(`Digite os ${CODE_LENGTH} dígitos do código`);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await authService.verifyCode({ email, code });
      router.push(
        `/forgot-password/reset?email=${encodeURIComponent(
          email,
        )}&code=${encodeURIComponent(code)}`,
      );
    } catch (err) {
      setError(extractApiError(err, "Código inválido ou expirado"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setIsResending(true);
    try {
      await authService.forgotPassword({ email });
      setSecondsLeft(CODE_TTL_SECONDS);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(extractApiError(err, "Não foi possível reenviar o código"));
    } finally {
      setIsResending(false);
    }
  };

  const minutes = Math.floor(Math.max(0, secondsLeft) / 60);
  const seconds = Math.max(0, secondsLeft) % 60;
  const timer = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-surface dark:via-background dark:to-surface p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/forgot-password"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/80 text-text-muted shadow-sm transition hover:bg-surface"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        <div className="text-center">
          <div className="from-primary mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br to-orange-600 shadow-lg">
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text">Validar código</h1>
          <p className="mt-2 text-text-muted">
            Enviamos um código para{" "}
            <span className="font-semibold text-text">{email}</span>
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl">Código de verificação</CardTitle>
            <CardDescription>
              Expira em <span className="font-semibold">{timer}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex justify-between gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={isSubmitting}
                  className="border-zinc-200 focus:border-primary h-14 w-full min-w-0 rounded-2xl border bg-surface text-center text-xl font-semibold transition focus:outline-none disabled:opacity-50"
                  aria-label={`Dígito ${index + 1}`}
                />
              ))}
            </div>

            {error && (
              <p className="rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || code.length !== CODE_LENGTH}
              className="h-14 w-full text-base font-semibold shadow-lg transition-all hover:shadow-xl"
              size="lg"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Validar código"
              )}
            </Button>

            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || secondsLeft > CODE_TTL_SECONDS - 30}
              className="text-primary block w-full text-center text-sm font-medium disabled:cursor-not-allowed disabled:text-text-subtle"
            >
              {isResending ? "Reenviando..." : "Reenviar código"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}