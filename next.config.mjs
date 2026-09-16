/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sql.js", "@libsql/client"],
  },
};

export default nextConfig;
