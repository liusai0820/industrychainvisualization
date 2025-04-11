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
  },
  // 禁用默认的ESLint配置，使用我们自己的.eslintrc.json
  eslint: {
    ignoreDuringBuilds: false, // 不忽略ESLint错误
    dirs: ['src'] // 只检查src目录
  }
};

export default nextConfig; 