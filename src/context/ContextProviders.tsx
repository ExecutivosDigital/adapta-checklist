import { CookiesProvider } from "next-client-cookies/server";
import { ApiContextProvider } from "./ApiContext";
import { AuthContextProvider } from "./AuthContext";
import { GeolocationProvider } from "./GeolocationContext";
import { CameraProvider } from "./CameraContext";
import { ThemeProvider } from "./ThemeProvider";

export function ContextProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CookiesProvider>
        <ApiContextProvider>
          <AuthContextProvider>
            <GeolocationProvider>
              <CameraProvider>{children}</CameraProvider>
            </GeolocationProvider>
          </AuthContextProvider>
        </ApiContextProvider>
      </CookiesProvider>
    </ThemeProvider>
  );
}
