import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // SW só roda em produção — dev causa cache infernal entre rebuilds.
  disable: process.env.NODE_ENV === "development",
  // Decisão D2 do NOTES.md: prompt de update (não skipWaiting automático).
  // O SW novo fica em "waiting" até o usuário aceitar via <UpdatePrompt />.
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  devIndicators: false,
  // Next 16 usa Turbopack por padrão. O Serwist (PWA) adiciona config webpack,
  // o que dispara o erro "webpack config and no turbopack config". Em dev o
  // Serwist é desabilitado, então um turbopack config vazio silencia o erro e
  // o dev roda em Turbopack normalmente. O build de produção usa `--webpack`
  // (ver package.json) para o Serwist gerar o service worker.
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        port: "",
        pathname: "**",
      },
    ],
  },
};

export default withSerwist(nextConfig);
