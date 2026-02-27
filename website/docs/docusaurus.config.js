// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'yalcspace',
  tagline: 'Dynamic VSCode workspaces from yalc links',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://yalcspace.pages.dev',
  baseUrl: '/docs/',

  organizationName: 'randymarsh77',
  projectName: 'yalcspace',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/',
          editUrl:
            'https://github.com/randymarsh77/yalcspace/tree/main/website/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'yalcspace',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            href: 'https://github.com/randymarsh77/yalcspace',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Introduction',
                to: '/',
              },
              {
                label: 'Getting Started',
                to: '/getting-started',
              },
              {
                label: 'Usage',
                to: '/usage',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/randymarsh77/yalcspace',
              },
              {
                label: 'npm',
                href: 'https://www.npmjs.com/package/yalcspace',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} yalcspace contributors. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
