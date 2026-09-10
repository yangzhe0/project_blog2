import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://sues.fun/",
    title: "Jones Ray",
    description: "天文科研、数据处理与 AI Agent 应用开发笔记。",
    author: "杨哲",
    profile: "https://me.sues.fun/",
    ogImage: "default-og.png",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 4,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    showArchives: true,
    showBackButton: true,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [
    {
      name: "github",
      url: "https://github.com/yangzhe0",
      linkTitle: "在 GitHub 上查看 Jones Ray",
    },
  ],
  shareLinks: [],
});
