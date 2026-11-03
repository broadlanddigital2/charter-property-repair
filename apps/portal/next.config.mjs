/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: served by a Cloudflare Worker (static assets), data comes from Supabase.
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
