import { hubApi } from "@/lib/api";
import {
  AuthResponse,
  ChangePasswordInput,
  ContactLoginInput,
  ContactRegisterInput,
  ForgotPasswordInput,
  MessageResponse,
  RenewTokenResponse,
  ResetPasswordInput,
  VerifyCodeInput,
} from "@/types/auth.types";

// Auth de contato vai pro HUB (emite o token RS256 com o CPF). Ver lib/api.ts.

export async function contactLogin(input: ContactLoginInput): Promise<AuthResponse> {
  const { data } = await hubApi.post<AuthResponse>("/auth/contact-login", input);
  return data;
}

export async function contactRegister(input: ContactRegisterInput): Promise<AuthResponse> {
  const { data } = await hubApi.post<AuthResponse>("/auth/contact-register", input);
  return data;
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<MessageResponse> {
  const { data } = await hubApi.post<MessageResponse>("/auth/contact-forgot-password", input);
  return data;
}

export async function verifyCode(input: VerifyCodeInput): Promise<MessageResponse> {
  const { data } = await hubApi.post<MessageResponse>("/auth/contact-verify-code", input);
  return data;
}

export async function resetPassword(input: ResetPasswordInput): Promise<MessageResponse> {
  const { data } = await hubApi.post<MessageResponse>("/auth/contact-reset-password", input);
  return data;
}

export async function changePassword(input: ChangePasswordInput): Promise<MessageResponse> {
  const { data } = await hubApi.patch<MessageResponse>("/auth/change-password", input);
  return data;
}

export async function renewToken(): Promise<RenewTokenResponse> {
  const { data } = await hubApi.patch<RenewTokenResponse>("/auth/contact-token");
  return data;
}
