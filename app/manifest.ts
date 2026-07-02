import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Business Location Intelligence',
    short_name: 'BizIntel',
    description: 'ML-powered spatial opportunity intelligence for urban microbusinesses.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#0f172a',
    icons: [],
  };
}
