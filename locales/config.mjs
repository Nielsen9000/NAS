// i18n configuration — the switches management actually controls.
// Language METADATA (native names, html lang, locked strings) lives in
// brand/build_i18n.mjs; this file is only the on/off decisions.
//
// Per language, two INDEPENDENT switches:
//
//   noindex (default true)
//     true:  every /<lang>/ page carries <meta name="robots" content="noindex">,
//            no hreflang links are emitted anywhere for that language, and no
//            /<lang>/ URL may appear in a sitemap (the build fails otherwise).
//     false: noindex is dropped and reciprocal hreflang link tags are emitted
//            at the next build. Indexing is a management decision taken
//            separately from the proofread sign-off — hreflang and sitemap
//            entries switch on TOGETHER with indexing, never before.
//
//   live (default false)
//     false: the language is preview-only. It is not listed in the language
//            switcher on production pages and its route directory must not be
//            deployed (the /<lang>/ output dirs are gitignored; they exist
//            only on local builds and the i18n-preview branch).
//     true:  the language is launched: listed in the switcher and deployed.
//            Flip when content is complete, proofread, and approved.
//
// The two are independent: a language can be live (reachable via the
// switcher) while still noindex — exactly like /uk/ was specified.
export const LANGS = {
  de: { noindex: true, live: false },
  fi: { noindex: true, live: false },
  fr: { noindex: true, live: false },
  es: { noindex: true, live: false },
  pt: { noindex: true, live: false },
  it: { noindex: true, live: false },
  uk: { noindex: true, live: false },
};

// UK_IN_SWITCHER (default false) — DECISION: /uk/ exists, works and is
// noindex, but it is NOT offered in the language switcher; it is reached by
// direct link only. Without this flag /uk/ would merely be hidden from
// search engines, not from visitors. Flipping this single line adds
// Українська to the switcher with no code change. It is a THIRD switch,
// independent of uk.live (deploy) and uk.noindex (indexing).
// (On /uk/ pages themselves the switcher does show УКР as the active
// language — a visitor who is already there can see where they are and
// navigate back; the flag controls whether OTHER languages offer uk.)
export const UK_IN_SWITCHER = false;

// Back-compat aliases (older scripts import these two by name).
export const UK_NOINDEX = LANGS.uk.noindex;
export const UK_SWITCHER_LIVE = LANGS.uk.live;
