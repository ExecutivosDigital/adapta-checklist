"use client";

import {
  registerAuthTokenGetter,
  registerUnauthorizedHandler,
} from "@/lib/api";
import { clearOfflineStorage } from "@/lib/offline-store";
import * as authService from "@/services/authService";
import {
  AuthContact,
  AuthStatus,
  ContactLoginInput,
  ContactRegisterInput,
} from "@/types/auth.types";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useCookies } from "next-client-cookies";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const TOKEN_COOKIE = process.env.NEXT_PUBLIC_USER_TOKEN as string;
const USER_COOKIE = process.env.NEXT_PUBLIC_USER_DATA as string;
const COOKIE_MAX_AGE_DAYS = 30;

// Modo DEMO: login sempre passa, sem backend. Ver checklistMock.ts.
const MOCK = process.env.NEXT_PUBLIC_MOCK_DATA === "1";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthContact | null;
  token: string | null;
  login: (input: ContactLoginInput) => Promise<AuthContact>;
  register: (input: ContactRegisterInput) => Promise<AuthContact>;
  logout: (redirect?: boolean) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const cookies = useCookies();
  const router = useRouter();

  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthContact | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const persist = useCallback(
    (newToken: string, newUser: AuthContact) => {
      const cookieOptions = {
        path: "/",
        expires: COOKIE_MAX_AGE_DAYS,
        secure: typeof window !== "undefined" && window.location.protocol === "https:",
        sameSite: "lax" as const,
      };
      cookies.set(TOKEN_COOKIE, newToken, cookieOptions);
      cookies.set(USER_COOKIE, JSON.stringify(newUser), cookieOptions);
      setToken(newToken);
      setUser(newUser);
      setStatus("authenticated");
    },
    [cookies],
  );

  const clear = useCallback(() => {
    cookies.remove(TOKEN_COOKIE, { path: "/" });
    cookies.remove(USER_COOKIE, { path: "/" });
    cookies.remove("adapta_perfil", { path: "/" });
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
    // LGPD (A4 — ver NOTES): apaga IndexedDB do app inteiro no logout.
    void clearOfflineStorage();
  }, [cookies]);

  const logout = useCallback(
    (redirect = true) => {
      clear();
      if (redirect) {
        router.push("/login");
      }
    },
    [clear, router],
  );

  const login = useCallback(
    async (input: ContactLoginInput) => {
      if (MOCK) {
        const handle = (input.email || "demo@adapta").split("@")[0];
        const contact: AuthContact = {
          id: "mock-contact",
          name: handle ? `Motorista ${handle}` : "Motorista Demo",
          email: input.email || "demo@adapta",
          phone: null,
          jobTitle: null,
          department: null,
          businessPartner: {
            id: "mock-bp",
            documentNumber: "70627445144",
            primaryName: "Motorista Demo",
            secondaryName: null,
          },
        };
        persist("mock-token", contact);
        return contact;
      }
      const result = await authService.contactLogin(input);
      persist(result.accessToken, result.contact);
      return result.contact;
    },
    [persist],
  );

  const register = useCallback(
    async (input: ContactRegisterInput) => {
      const result = await authService.contactRegister(input);
      persist(result.accessToken, result.contact);
      return result.contact;
    },
    [persist],
  );

  const refresh = useCallback(async () => {
    if (MOCK) return; // demo: nada a renovar
    try {
      const result = await authService.renewToken();
      const storedUserRaw = cookies.get(USER_COOKIE);
      const storedUser = storedUserRaw
        ? (JSON.parse(storedUserRaw) as AuthContact)
        : null;

      if (!storedUser) {
        clear();
        return;
      }

      cookies.set(TOKEN_COOKIE, result.accessToken, {
        path: "/",
        expires: COOKIE_MAX_AGE_DAYS,
        secure: typeof window !== "undefined" && window.location.protocol === "https:",
        sameSite: "lax",
      });
      setToken(result.accessToken);
      setUser(storedUser);
      setStatus("authenticated");
    } catch (err) {
      // Só desautentica se o servidor disser explicitamente que o token é inválido.
      // Erros de rede, tunnel piscando ou 5xx mantêm a sessão local — o usuário
      // continua usando o app e o axios interceptor cuidará de 401 reais.
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        clear();
      }
    }
  }, [cookies, clear]);

  useEffect(() => {
    registerAuthTokenGetter(() => tokenRef.current ?? undefined);
    registerUnauthorizedHandler(() => {
      clear();
      router.push("/login");
    });
  }, [clear, router]);

  useEffect(() => {
    const storedToken = cookies.get(TOKEN_COOKIE);
    const storedUserRaw = cookies.get(USER_COOKIE);

    if (!storedToken || !storedUserRaw) {
      setStatus("unauthenticated");
      return;
    }

    try {
      const storedUser = JSON.parse(storedUserRaw) as AuthContact;
      setToken(storedToken);
      setUser(storedUser);
      tokenRef.current = storedToken;
      setStatus("authenticated");
    } catch {
      clear();
      return;
    }

    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ status, user, token, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de um AuthContextProvider");
  }
  return ctx;
}
