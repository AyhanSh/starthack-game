import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@takumi-rs/image-response'],
  reactStrictMode: true,
  output: 'export',
  basePath: '/docs',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default withMDX(config);
