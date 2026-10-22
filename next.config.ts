import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  devIndicators: false,
  agentRules: false,
  experimental: {
    useTypeScriptCli: false
  }
};
export default nextConfig;
