# Changelog

All notable changes to the Slotify Hugo theme will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.3] - 2026-10-20

### Added
- **`personalityOrder` Param**: Declares the theme switcher's personality order; its first id is the default personality. A site's list replaces the theme's, and palette ids it leaves out follow alphabetically.

### Changed
- **GitHub Migration**: Moved the repository to GitHub (`116lab/slotify`). CI and the demo deployment now run on GitHub Actions and GitHub Pages (`.github/workflows/ci.yml`), and changelog comparison links target GitHub.
- **Trunk-Based Workflow**: Replaced the release-only `main` and `release/<version>` integration branches with trunk-based development. Feature PRs squash-merge into `main`, and releases are tagged `chore(release): <version>` commits on `main`.

### Fixed
- **Default Personality Order**: The default personality was the alphabetically first palette id (`espresso`, or a site-added one), because Hugo does not keep the palette's key order. It is now the first id of `personalityOrder` (`vibrant` by default).

## [0.2.2] - 2026-10-05

### Changed
- **Search Query URL Updates**: Search filters locally while typing without rewriting `?q=` on every change. Direct query links still initialize the search, and clearing one removes its `q` parameter.

### Fixed
- **Whitespace-Only Search Queries**: Treat whitespace-only input and a cleared `null` value as an empty query.

[Unreleased]: https://github.com/116lab/slotify/compare/v0.2.3...HEAD
[0.2.3]: https://github.com/116lab/slotify/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/116lab/slotify/releases/tag/v0.2.2
