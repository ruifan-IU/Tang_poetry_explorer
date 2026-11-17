import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The explore page is the landing page now; keep old /explore links
  // (and their ?q= / ?tagId= filters, which redirects pass through) working.
  async redirects() {
    return [{ source: '/explore', destination: '/', permanent: true }];
  },
};

export default nextConfig;
