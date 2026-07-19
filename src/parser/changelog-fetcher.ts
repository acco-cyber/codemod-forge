import * as cheerio from 'cheerio';
import type { FetchResult } from '../types/index.js';

const KNOWN_GUIDES: Record<string, Record<string, string>> = {
  react: {
    '17-19': 'https://react.dev/blog/2024/12/05/react-19',
    '18-19': 'https://react.dev/blog/2024/12/05/react-19',
    '17-18': 'https://react.dev/blog/2022/03/29/react-v18',
    '16-18': 'https://react.dev/blog/2022/03/29/react-v18',
  },
  next: {
    '14-15': 'https://nextjs.org/docs/app/building-your-application/upgrading/version-15',
    '13-14': 'https://nextjs.org/docs/app/building-your-application/upgrading/version-14',
  },
  tailwindcss: {
    '3-4': 'https://tailwindcss.com/docs/upgrade-guide',
  },
  vue: {
    '2-3': 'https://v3-migration.vuejs.org/',
  },
  express: {
    '4-5': 'https://expressjs.com/en/guide/migrating-5.html',
  },
  prisma: {
    '4-5': 'https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-5',
    '5-6': 'https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-6',
  },
  typescript: {
    '4-5': 'https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/',
    '5-5.6': 'https://devblogs.microsoft.com/typescript/announcing-typescript-5-6/',
  },
};

export async function fetchMigrationGuide(
  library: string,
  fromVersion: string,
  toVersion: string,
  guideUrl?: string
): Promise<FetchResult> {
  if (guideUrl) {
    return fetchFromUrl(guideUrl, library);
  }

  const key = `${fromVersion}-${toVersion}`;
  const guides = KNOWN_GUIDES[library.toLowerCase()];
  if (guides?.[key]) {
    return fetchFromUrl(guides[key], library);
  }

  try {
    const npmUrl = `https://registry.npmjs.org/${library}`;
    const res = await fetch(npmUrl);
    const pkg = await res.json() as any;
    const repo = pkg.repository?.url
      ?.replace('git+https://', 'https://')
      ?.replace('git://', 'https://')
      ?.replace('.git', '');

    if (repo) {
      const changelogUrl = `${repo}/blob/main/CHANGELOG.md?raw=true`;
      const changelogResponse = await fetch(changelogUrl);
      if (changelogResponse.ok) {
        const markdown = await changelogResponse.text();
        return {
          content: markdown.slice(0, 15000),
          sourceUrl: changelogUrl,
          format: 'markdown',
          title: `${library} Changelog`,
        };
      }
    }
  } catch {
    // Fall through to the explicit error below.
  }

  throw new Error(
    `No migration guide found for ${library} ${fromVersion}->${toVersion}.\n`
    + `  Try --guide <url>, or check https://www.npmjs.com/package/${library}`
  );
}

async function fetchFromUrl(url: string, library: string): Promise<FetchResult> {
  const res = await fetch(url, { headers: { 'User-Agent': 'codemod-forge/0.2.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, .sidebar, .toc').remove();

  const title = $('title').text() || $('h1').first().text() || `${library} Migration Guide`;
  const body = $('article, main, .content, .prose, body').first();
  const text = body.text().replace(/\s+/g, ' ').trim();

  return {
    content: text.slice(0, 15000),
    sourceUrl: url,
    format: url.endsWith('.md') ? 'markdown' : 'html',
    title,
  };
}
