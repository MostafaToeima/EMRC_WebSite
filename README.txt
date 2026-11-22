EMRC static website (generated 2026-11-22 from the ASP.NET site in the parent folder)

- Open index.html to view it locally, or deploy this whole folder to Vercel.
- Every page is plain HTML: the master page, header, menu, footer and icons are built in,
  and the homepage figures come from App_Data\emrc-facts.xml as it was on 2026-11-22.
- If you change the ASP.NET site (e.g. new figures in emrc-facts.xml), this copy does NOT update
  by itself: ask Claude to regenerate the static site.
- vercel.json: clean URLs (/about/about instead of /about/about.html) and old .aspx links
  redirect to the new pages.
