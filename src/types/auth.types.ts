export interface AuthBusinessPartner {
  id: string;
  documentNumber: string;
  primaryName: string;
  secondaryName: string | null;
}

export interface AuthContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  businessPartner: AuthBusinessPartner;
}

export interface AuthResponse {
  accessToken: string;
  contact: AuthContact;
}

export interface RenewTokenResponse {
  accessToken: string;
}

export interface ContactLoginInput {
  email: string;
  password: string;
}

export interface ContactRegisterInput {
  documentNumber: string;
  primaryName: string;
  secondaryName?: string;
  contactName: string;
  email: string;
  password: string;
  phone?: string;
  jobTitle?: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface VerifyCodeInput {
  email: string;
  code: string;
}

export interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
