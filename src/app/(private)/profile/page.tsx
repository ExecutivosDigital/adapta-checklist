"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { aplicarMascaraCpf } from "@/utils/cpfCnpjUtils";
import { aplicarMascaraTelefone } from "@/utils/phoneUtils";

export default function ProfilePage() {
  const { user, logout } = useAuth();

  const cpf = user?.businessPartner?.documentNumber
    ? aplicarMascaraCpf(user.businessPartner.documentNumber)
    : "—";
  const telefone = user?.phone ? aplicarMascaraTelefone(user.phone) : "—";

  return (
    <div className="p-4">
      <header className="mb-6 pt-2">
        <h1 className="text-2xl font-bold text-text">Perfil</h1>
      </header>

      <Card className="space-y-4 p-5">
        <Field label="Nome" value={user?.name ?? "—"} />
        <Field label="CPF" value={cpf} />
        <Field label="Telefone" value={telefone} />
        {user?.email ? <Field label="E-mail" value={user.email} /> : null}
      </Card>

      <Button
        variant="danger"
        className="mt-6 w-full"
        onClick={() => logout()}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="font-medium text-text">{value}</p>
    </div>
  );
}
