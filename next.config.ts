
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack(config) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    
    // This is the comprehensive fix for "node:..." and other server-side module errors
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "fs": false,
      "net": false,
      "tls": false,
      "cardinal": false,
      "mongodb-client-encryption": false,
      "kerberos": false,
      "aws4": false,
      "snappy": false,
      "@mongodb-js/zstd": false,
      "@aws-sdk/credential-providers": false,
    };
    
    return config;
  },
};

export default nextConfig;
