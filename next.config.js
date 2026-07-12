/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const basePath = isGithubActions ? '/red-sea-catalog' : '';

const nextConfig = {
  output: 'export',
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    // @xenova/transformers pulls in onnxruntime-node's native bindings as an
    // optional backend; the browser build only ever uses onnxruntime-web, so
    // keep webpack from trying to bundle the native .node files.
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node': false,
    };
    return config;
  },
};

module.exports = nextConfig;
