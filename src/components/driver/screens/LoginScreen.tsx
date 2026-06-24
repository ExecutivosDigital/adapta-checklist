"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { extractApiError } from "@/lib/api";
import { ClipboardCheck, Loader2, Truck, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCookies } from "next-client-cookies";
import { useState } from "react";

type Perfil = "motorista" | "frota";

export function LoginScreen() {
  const router = useRouter();
  const cookies = useCookies();
  const { login } = useAuth();

  const [perfil, setPerfil] = useState<Perfil>("motorista");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) {
      setError("Preencha e-mail e senha");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      // Persiste o perfil (motorista/frota) pro middleware rotear certo.
      cookies.set("adapta_perfil", perfil, { path: "/", expires: 30 });
      await login({ email: email.trim().toLowerCase(), password: senha });
      router.push(perfil === "frota" ? "/frota" : "/");
    } catch (err) {
      const message = extractApiError(err, "Não foi possível entrar");
      if (/senha expirou/i.test(message)) {
        router.push("/forgot-password?reason=expired");
        return;
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-surface dark:via-background dark:to-surface p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="from-primary mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br to-orange-600 shadow-lg">
            <Truck className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-text">Checklist Frota</h1>
          <p className="mt-2 text-text-muted">Faça login para continuar</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-3 pb-4">
            {/* Switch Frota / Motorista */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-1">
              {(
                [
                  { id: "motorista", label: "Motorista", icon: User },
                  { id: "frota", label: "Frota", icon: ClipboardCheck },
                ] as { id: Perfil; label: string; icon: typeof User }[]
              ).map((p) => {
                const Icon = p.icon;
                const active = perfil === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPerfil(p.id);
                      setError(null);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-primary text-white shadow"
                        : "text-text-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {p.label}
                  </button>
                );
              })}
            </div>
            <CardTitle className="text-2xl">Entrar</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <>
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha" className="text-sm font-semibold">
                    Senha
                  </Label>
                  <Input
                    id="senha"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="h-14 text-base"
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLogin();
                    }}
                  />
                </div>

                {error && (
                  <p className="rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                )}

                <Button
                  onClick={handleLogin}
                  disabled={isSubmitting}
                  className="h-14 w-full text-base font-semibold shadow-lg transition-all hover:shadow-xl"
                  size="lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Entrar"
                  )}
                </Button>
                <div className="flex flex-col gap-3 text-center text-sm">
                  <Link
                    href="/forgot-password"
                    className="text-primary font-medium transition-colors hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                  <Link
                    href="/register"
                    className="text-primary font-medium transition-colors hover:underline"
                  >
                    Primeiro acesso
                  </Link>
                </div>
              </>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
