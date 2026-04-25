/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'scontent-iad3-1.cdninstagram.com'
      },
      {
        protocol: 'https',
        hostname: 'scontent-iad3-2.cdninstagram.com'
      }
    ]
  }
};

export default nextConfig;
