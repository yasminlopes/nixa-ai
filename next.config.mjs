/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['cheerio', '@lancedb/lancedb'],
  },
}

export default nextConfig
