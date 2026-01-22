const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: process.env.BASEPATH,
  output: 'standalone', // Enable standalone output for Docker
  env: {
    NEXT_PUBLIC_API_URL: 'https://pickleflavor.info',
  },
  // Отключаем ESLint во время сборки в production (предупреждения не должны блокировать сборку)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Отключаем проверку типов во время сборки (если используется TypeScript)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure proper module resolution
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@layouts': path.resolve(__dirname, 'src/@layouts'),
      '@views': path.resolve(__dirname, 'src/views'),
      '@core': path.resolve(__dirname, 'src/@core'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@configs': path.resolve(__dirname, 'src/configs'),
      '@menu': path.resolve(__dirname, 'src/@menu'),
      '@data': path.resolve(__dirname, 'src/data'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@hocs': path.resolve(__dirname, 'src/hocs'),
      '@libs': path.resolve(__dirname, 'src/libs'),
      '@redux-store': path.resolve(__dirname, 'src/redux-store'),
      '@fake-db': path.resolve(__dirname, 'src/fake-db'),
    }
    
    // Ensure @tanstack packages are resolved correctly
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    
    return config
  },
}

module.exports = nextConfig

