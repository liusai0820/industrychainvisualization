/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
      resolve: {
        fullySpecified: false
      }
    });
    return config;
  },
  experimental: {
    esmExternals: 'loose'
  }
};

export default nextConfig; 