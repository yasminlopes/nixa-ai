import type { Metadata } from 'next';

import { AboutView } from '@/features/about';

export const metadata: Metadata = {
  title: 'Sobre · Nixa',
  description: 'Arquitetura, tecnologias e fluxo da Nixa AI',
};

export default function AboutPage() {
  return <AboutView />;
}
