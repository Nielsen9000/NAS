// i18n configuration — the two switches management actually controls.
//
// UK_NOINDEX (default true)
//   true:  every /uk/ page carries <meta name="robots" content="noindex">,
//          no hreflang links are emitted anywhere, and no /uk/ URL may appear
//          in a sitemap (the repo has no sitemap today; if one is ever added,
//          brand/build_i18n.mjs --build-uk fails when this flag is true and a
//          sitemap mentions /uk/).
//   false: noindex is dropped, and both language versions get reciprocal
//          hreflang link tags at the next build. Flip THIS ONE LINE when
//          management approves indexing, then rebuild.
//
//   INDEPENDENT OF THE PROOFREAD SIGN-OFF. The proofreader's sign-off flips
//   UK_SWITCHER_LIVE and opens the /uk/ route; it does NOT touch this flag.
//   Indexing is a separate management decision that has not been taken —
//   UK_NOINDEX stays true regardless of sign-off until it is.
export const UK_NOINDEX = true;

// UK_SWITCHER_LIVE (default false)
//   false: the EN pages carry the language switcher markup but with `hidden`,
//          so production shows nothing and links to a /uk/ that is not there.
//   true:  the switcher is visible on EN pages. Flip when /uk/ content is
//          complete, proofread, and deployed to production.
// Generated /uk/ pages always show the switcher (they only exist on builds
// where /uk/ exists).
export const UK_SWITCHER_LIVE = false;
