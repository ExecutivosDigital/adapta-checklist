import axios, { AxiosError, AxiosInstance } from "axios";

// Fluxo de auth do motorista (Opção A): o login vai pro HUB (emite o token RS256
// com o CPF), e os dados (checklists) vão pro MONOLITO (que valida o token do Hub
// e popula o partnerDocumentNumber). Por isso há duas baseURLs.
const baseURL = process.env.NEXT_PUBLIC_API_URL; // monolito (dados)
const hubBaseURL = process.env.NEXT_PUBLIC_HUB_API_URL; // Hub (auth)

let authTokenGetter: (() => string | undefined) | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function registerAuthTokenGetter(getter: () => string | undefined) {
  authTokenGetter = getter;
}

export function registerUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

function withInterceptors(instance: AxiosInstance): AxiosInstance {
  instance.interceptors.request.use((config) => {
    const token = authTokenGetter?.();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status;
      const url = error.config?.url ?? "";
      const isAuthEndpoint = url.includes("/auth/");
      if (status === 401 && !isAuthEndpoint) {
        unauthorizedHandler?.();
      }
      return Promise.reject(error);
    },
  );
  return instance;
}

/** Dados de negócio — monolito (`adapta-api`). */
export const api: AxiosInstance = withInterceptors(
  axios.create({ baseURL, headers: { "ngrok-skip-browser-warning": "any" } }),
);

/** Autenticação de contato — Hub (`adapta-hub`), que emite o token RS256 com o CPF. */
export const hubApi: AxiosInstance = withInterceptors(
  axios.create({
    baseURL: hubBaseURL ?? baseURL,
    headers: { "ngrok-skip-browser-warning": "any" },
  }),
);

export function extractApiError(error: unknown, fallback = "Ocorreu um erro inesperado"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message[0] : data.message;
    }
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
