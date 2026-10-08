import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phones on this LAN load the dev server by IP. The last number can change.
  allowedDevOrigins: ["192.168.0.87", "192.168.0.*"],
  // The Postgres client opens a network socket, so the server bundle leaves it external.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
