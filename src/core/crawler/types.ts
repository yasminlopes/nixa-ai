import type { PageType, Product } from '@/shared/types';

export type { PageType, Product };

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  breadcrumb: string;
  pageType: PageType;
  domain: string;
  product?: Product;
  language: string;
  headings: string[];
  contentHash: string;
}
