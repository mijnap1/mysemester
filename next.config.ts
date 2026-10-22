import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep the folder-style URLs (/main/, /grade/, ...) the static site used.
  trailingSlash: true,
  // Dev only: lets 127.0.0.1 load the dev server too. It keeps separate browser
  // storage from localhost, so test data never touches a signed-in session.
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
