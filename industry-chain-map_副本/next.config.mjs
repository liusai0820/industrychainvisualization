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
  // 添加静态文件服务配置
  async rewrites() {
    return [
      {
        source: '/data/industries/:path*',
        destination: '/src/data/industries/:path*'
      }
    ];
  }
};

export default nextConfig; 