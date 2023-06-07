const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/get',
        destination: 'http://localhost:5002/api/get', // Replace with your actual API server URL
      },
      {
        source: '/api/post',
        destination: 'http://localhost:5002/api/post', // Replace with your actual API server URL
      },
      {
        source: '/api/delete',
        destination: 'http://localhost:5002/api/delete', // Replace with your actual API server URL
      },
    ];
  },
};

module.exports = nextConfig;
