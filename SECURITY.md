# Security policy

This repository holds the obzly.com website and documentation: a static site built with Astro and
served by GitHub Pages.

## Reporting a vulnerability

Please don't open a public issue for a security problem.

- **The website** (obzly.com, this repository, its build or deploy workflow): report it privately
  through [Report a vulnerability](https://github.com/obzly/obzly-website/security/advisories/new)
  on this repository's Security tab.
- **Obzly itself** (the server, probe, Helm charts or install scripts): report it through the
  Security tab of the [Obzly repository](https://github.com/obzly/obzly/security).

Include what you found, where, and how to reproduce it. We aim to reply within five working days
and will keep you updated until it's fixed. Tell us if you'd like to be credited.

## Scope

The website has no accounts, forms or server-side code. Reports we're most interested in:

- content or links on obzly.com that could mislead users into running something unsafe, such as a
  wrong install command or download URL;
- problems in the build and deploy workflow, such as a way for a pull request to publish to
  obzly.com;
- a compromised dependency in the site's build.

Typical findings for static sites, such as missing security headers that GitHub Pages doesn't let
us set, are out of scope.
