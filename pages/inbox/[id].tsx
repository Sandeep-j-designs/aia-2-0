import type { GetStaticPaths, GetStaticProps } from "next";

import { MOCK_INBOX_ITEMS } from "@/config/pages/inbox/mock-inbox";

/**
 * The static export needs every deep-linkable id up front. Items the prototype
 * creates at runtime still route client-side; only a hard refresh on one 404s.
 */
export const getStaticPaths: GetStaticPaths = async () => ({
  paths: MOCK_INBOX_ITEMS.map((item) => ({ params: { id: item.id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = async () => ({ props: {} });

export { default } from "@/components/inbox/v2/workspace";
