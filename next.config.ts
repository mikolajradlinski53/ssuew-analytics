import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * firebase-admin ma opcjonalne zależności (m.in. @opentelemetry/api), których
   * nie instalujemy. Next próbował je spakować i budowanie padało na
   * „Cannot find module '@opentelemetry/api'". Pakiet zostaje po stronie
   * serwera jako zwykły import Node'a i problem znika.
   */
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
