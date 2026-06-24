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
import { useAuth } from "@/hooks/useAuth";
import { extractApiError } from "@/lib/api";
import {
  aplicarMascaraCpf,
  isDocumentoValido,
  soDigitos,
} from "@/utils/cpfCnpjUtils";
import {
  aplicarMascaraTelefone,
  isTelefoneValido,
  toE164BR,
} from "@/utils/phoneUtils";
import { ArrowLeft, Loader2, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FieldErrors {
  name?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  password?: string;
  passwordConfirm?: string;
}

export function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!name.trim() || name.trim().length < 3) {
      next.name = "Informe seu nome completo";
    }
    if (!isDocumentoValido(cpf)) {
      next.cpf = "CPF inválido";
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      next.email = "E-mail inválido";
    }
    if (!isTelefoneValido(phone)) {
      next.phone = "Telefone inválido";
    }
    if (password.length < 6) {
      next.password = "A senha deve ter no mínimo 6 caracteres";
    }
    if (password !== passwordConfirm) {
      next.passwordConfirm = "As senhas não coincidem";
    }
    return next;
  };

  const handleSubmit = async () => {
    const validation = validate();
    setErrors(validation);
    setGlobalError(null);

    if (Object.keys(validation).length > 0) return;

    setIsSubmitting(true);
    try {
      const trimmedName = name.trim();
      await register({
        documentNumber: soDigitos(cpf),
        primaryName: trimmedName,
        contactName: trimmedName,
        email: email.trim().toLowerCase(),
        phone: toE164BR(phone),
        password,
      });
      router.push("/");
    } catch (err) {
      const message = extractApiError(err, "Não foi possível concluir o cadastro");
      if (/documento/i.test(message)) {
        setErrors((prev) => ({ ...prev, cpf: message }));
      } else if (/e-?mail/i.test(message)) {
        setErrors((prev) => ({ ...prev, email: message }));
      } else {
        setGlobalError(message);
      }
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
            <Truck className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text">Primeiro acesso</h1>
          <p className="mt-2 text-text-muted">Cadastre-se para começar a dirigir</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl">Dados do motorista</CardTitle>
            <CardDescription>Preencha os campos abaixo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">
                Nome completo
              </Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 text-base"
                error={!!errors.name}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf" className="text-sm font-semibold">
                CPF
              </Label>
              <Input
                id="cpf"
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(aplicarMascaraCpf(e.target.value))}
                className="h-14 text-base"
                error={!!errors.cpf}
                disabled={isSubmitting}
              />
              {errors.cpf && (
                <p className="text-xs text-red-600">{errors.cpf}</p>
              )}
            </div>

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
                error={!!errors.email}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">
                Telefone (com DDD)
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(aplicarMascaraTelefone(e.target.value))}
                className="h-14 text-base"
                error={!!errors.phone}
                disabled={isSubmitting}
              />
              {errors.phone && (
                <p className="text-xs text-red-600">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 text-base"
                error={!!errors.password}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="passwordConfirm"
                className="text-sm font-semibold"
              >
                Confirmar senha
              </Label>
              <Input
                id="passwordConfirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repita a senha"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="h-14 text-base"
                error={!!errors.passwordConfirm}
                disabled={isSubmitting}
              />
              {errors.passwordConfirm && (
                <p className="text-xs text-red-600">{errors.passwordConfirm}</p>
              )}
            </div>

            {globalError && (
              <p className="rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                {globalError}
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
                "Cadastrar"
              )}
            </Button>

            <p className="text-center text-sm text-text-muted">
              Já tem uma conta?{" "}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline"
              >
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}