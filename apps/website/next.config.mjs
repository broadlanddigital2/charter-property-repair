/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: served by a Cloudflare Worker (static assets).
  output: "export",
  trailingSlash: true,
  reactStrictMode: false,
  images: { unoptimized: true },
};

export default nextConfig;
