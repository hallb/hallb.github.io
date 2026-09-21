---
title: "Docs"
build:
  render: never
  list: never
---

Not a page. `/docs/` holds the design-system crosswalk fixture, which is a
draft (ISS-53), so the section listing was a 200 with a heading and nothing
else, advertised in the sitemap (ISS-52). `render: never` removes it from the
output, and with it the sitemap entry.

Delete this file if `/docs/` is ever given something to list.
