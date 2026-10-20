#!/usr/bin/env python3
"""Regression checks for verify-changelog.py using only the Python standard library."""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("verify-changelog.py")
SPEC = importlib.util.spec_from_file_location("verify_changelog", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"cannot load changelog validator from {SCRIPT}")
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)

CHANGELOG = SCRIPT.resolve().parents[2] / "CHANGELOG.md"
VALID_CHANGELOG = """\
# Changelog

## [Unreleased]

## [0.2.1] - 2026-09-10

## [0.2.0] - 2026-09-09

## [0.1.0] - 2026-06-12

[Unreleased]: https://github.com/116lab/slotify/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/116lab/slotify/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/116lab/slotify/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/116lab/slotify/releases/tag/v0.1.0
"""


class ChangelogValidatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.current_changelog = CHANGELOG.read_text(encoding="utf-8")

    def assert_invalid(self, source: str, expected_error: str) -> None:
        errors = validator.validate(source)
        self.assertTrue(
            any(expected_error in error for error in errors),
            f"expected {expected_error!r} in {errors!r}",
        )

    def test_accepts_current_changelog(self) -> None:
        self.assertEqual(validator.validate(self.current_changelog), [])

    def test_accepts_independent_fixture(self) -> None:
        self.assertEqual(validator.validate(VALID_CHANGELOG), [])

    def test_requires_one_unreleased_section(self) -> None:
        source = VALID_CHANGELOG.replace("## [Unreleased]", "## [Upcoming]", 1)
        self.assert_invalid(source, "expected exactly one [Unreleased] heading")

    def test_unreleased_link_starts_at_latest_release(self) -> None:
        source = VALID_CHANGELOG.replace(
            "compare/v0.2.1...HEAD", "compare/v0.2.0...HEAD", 1
        )
        self.assert_invalid(source, "must start at latest release v0.2.1")

    def test_release_links_form_a_comparison_chain(self) -> None:
        source = VALID_CHANGELOG.replace(
            "compare/v0.2.0...v0.2.1",
            "compare/v0.1.0...v0.2.1",
            1,
        )
        self.assert_invalid(source, "[0.2.1] link must be")

    def test_oldest_release_links_to_its_tag_page(self) -> None:
        source = VALID_CHANGELOG.replace(
            "/releases/tag/v0.1.0", "/compare/v0.1.0...v0.2.0", 1
        )
        self.assert_invalid(source, "[0.1.0] link must be")

    def test_requires_release_headings_in_descending_order(self) -> None:
        first = "## [0.2.1] - 2026-09-10"
        second = "## [0.2.0] - 2026-09-09"
        source = VALID_CHANGELOG.replace(first, "## [TEMP] - 2026-09-10", 1)
        source = source.replace(second, first, 1)
        source = source.replace("## [TEMP] - 2026-09-10", second, 1)
        self.assert_invalid(source, "descending order")

    def test_release_links_use_the_project_repository(self) -> None:
        source = VALID_CHANGELOG.replace(
            "github.com/116lab/slotify", "github.com/attacker/slotify"
        )
        self.assert_invalid(source, "must target repository 116lab/slotify")

    def test_comparison_links_are_checked_in_version_order(self) -> None:
        first = "## [0.2.1] - 2026-09-10"
        second = "## [0.2.0] - 2026-09-09"
        source = VALID_CHANGELOG.replace(first, "## [TEMP] - 2026-09-10", 1)
        source = source.replace(second, first, 1)
        source = source.replace("## [TEMP] - 2026-09-10", second, 1)
        self.assertEqual(
            validator.validate(source),
            ["versioned release headings must be in descending order"],
        )


if __name__ == "__main__":
    unittest.main()
