import type { GetStaticPaths, GetStaticProps } from "next";
import SitePage from "../../components/SitePage";
import { SERVICE_PAGES } from "../../lib/services/content";
import { buildServiceMain, faqLd } from "../../lib/services/template";

type Props = { slug: string };

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: SERVICE_PAGES.map((s) => ({ params: { slug: s.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => ({
  props: { slug: String(params?.slug) },
});

export default function ServicePage({ slug }: Props) {
  const c = SERVICE_PAGES.find((s) => s.slug === slug)!;
  return <SitePage title={c.title} description={c.description} main={buildServiceMain(c)} ld={faqLd(c)} />;
}
