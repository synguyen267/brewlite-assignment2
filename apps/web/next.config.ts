import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chỉ bật bản standalone khi build trong Docker (NEXT_OUTPUT=standalone);
  // build thường ở máy Windows không bị ảnh hưởng.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
