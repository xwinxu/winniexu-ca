import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { SimpleSlug } from "./quartz/util/path"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/xwinxu",
      "Google Scholar": "https://scholar.google.com/citations?user=k4l-zNYAAAAJ&hl=en",
      "Twitter/X": "https://x.com/winniethexu",
      LinkedIn: "https://www.linkedin.com/in/winnie-xu/",
      Email: "mailto:winniexu@cs.stanford.edu",
      CV: "/CV.pdf",
    },
  }),
}

export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page: any) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.MobileOnly(Component.Explorer()),
    Component.DesktopOnly(
      Component.RecentNotes({
        title: "Research",
        limit: 3,
        filter: (f: any) => (f.slug ? (f.slug.startsWith("research/") && f.slug !== "research/index" && !f.frontmatter?.noindex) : false),
        linkToMore: "research/" as SimpleSlug,
      }),
    ),
    Component.DesktopOnly(
      Component.RecentNotes({
        title: "Adventure",
        limit: 3,
        filter: (f: any) => (f.slug ? (f.slug.startsWith("adventure/") && f.slug !== "adventure/index" && !f.frontmatter?.noindex) : false),
        linkToMore: "adventure/" as SimpleSlug,
      }),
    ),
    Component.DesktopOnly(
      Component.RecentNotes({
        title: "Crafts",
        limit: 3,
        filter: (f: any) => (f.slug ? (f.slug.startsWith("crafts/") && f.slug !== "crafts/index" && !f.frontmatter?.noindex) : false),
        linkToMore: "crafts/" as SimpleSlug,
      }),
    ),
    Component.DesktopOnly(
      Component.RecentNotes({
        title: "Writing",
        limit: 3,
        filter: (f: any) => (f.slug ? (f.slug.startsWith("writing/") && f.slug !== "writing/index" && !f.frontmatter?.noindex) : false),
        linkToMore: "writing/" as SimpleSlug,
      }),
    ),
  ],
  right: [
    Component.Graph({
      localGraph: {
        showTags: false,
      },
      globalGraph: {
        showTags: false,
      },
    }),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta()
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.MobileOnly(Component.Explorer()),
    Component.DesktopOnly(
      Component.RecentNotes({
        title: "Research",
        limit: 3,
        filter: (f: any) => (f.slug ? (f.slug.startsWith("research/") && f.slug !== "research/index" && !f.frontmatter?.noindex) : false),
        linkToMore: "research/" as SimpleSlug,
      }),
    ),
    Component.DesktopOnly(
      Component.RecentNotes({
        title: "Adventure",
        limit: 3,
        filter: (f: any) => (f.slug ? (f.slug.startsWith("adventure/") && f.slug !== "adventure/index" && !f.frontmatter?.noindex) : false),
        linkToMore: "adventure/" as SimpleSlug,
      }),
    ),
    Component.DesktopOnly(
      Component.RecentNotes({
        title: "Crafts",
        limit: 3,
        filter: (f: any) => (f.slug ? (f.slug.startsWith("crafts/") && f.slug !== "crafts/index" && !f.frontmatter?.noindex) : false),
        linkToMore: "crafts/" as SimpleSlug,
      }),
    ),
    Component.DesktopOnly(
      Component.RecentNotes({
        title: "Writing",
        limit: 3,
        filter: (f: any) => (f.slug ? (f.slug.startsWith("writing/") && f.slug !== "writing/index" && !f.frontmatter?.noindex) : false),
        linkToMore: "writing/" as SimpleSlug,
      }),
    ),
  ],
  right: [],
}
