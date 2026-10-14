/** @type {import('next').NextConfig} */
const basePath = process.env.BASE_PATH || ''
// Server-side rewrite target for /api. In compose this is http://api:4000;
// for local `next dev` it defaults to the compose-published localhost port.
const apiUrl = process.env.API_URL || 'http://localhost:4100'

const nextConfig = {
  output: 'standalone',
  basePath,
  env: {
    // Available to client code as process.env.NEXT_PUBLIC_BASE_PATH
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }]
  },
}

export default nextConfig
