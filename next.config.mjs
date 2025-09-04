/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@google-cloud/vision']
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only packages from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
      
      config.externals = config.externals || [];
      config.externals.push({
        '@google-cloud/vision': 'commonjs @google-cloud/vision',
        'otplib': 'commonjs otplib',
        'html-to-docx': 'commonjs html-to-docx',
      });
    }
    
    return config;
  },

  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },

  // Image optimization
  images: {
    domains: ['api.qrserver.com'], // For QR code generation
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      },
      {
        source: '/api/ocr',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
          }
        ]
      }
    ];
  },

  // Redirects for legacy routes
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/signin',
        permanent: true
      },
      {
        source: '/register',
        destination: '/signup', 
        permanent: true
      }
    ];
  },
  
  // Output configuration for deployment
  output: 'standalone',
  
  // Compress responses
  compress: true,
  
  // Enable React strict mode
  reactStrictMode: true,
  
  // SWC minification
  swcMinify: true,
  
  // Optimize bundles
  optimizeFonts: true,
};

export default nextConfig;
