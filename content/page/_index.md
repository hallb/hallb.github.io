---
title: "Pages"
build:
  render: never
  list: never
---

Not a page. `/page/` is the URL prefix the standalone pages sit under
(`/page/about/`), and Hugo would otherwise generate a section listing for it:
a 200 with a heading and nothing else, advertised in the sitemap (ISS-52).
`render: never` removes it from the output, and with it the sitemap entry.

Delete this file if `/page/` is ever given something to list.
