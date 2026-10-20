#!/usr/bin/env python3
"""Validate changelog section order and release comparison links offline."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CHANGELOG = ROOT / "CHANGELOG.md"
REPOSITORY = "116lab/slotify"
HEADING_RE = re.compile(
    r"^## \[(Unreleased|\d+\.\d+\.\d+)\](?: - \d{4}-\d{2}-\d{2})?$"
)
REFERENCE_RE = re.compile(
    r"^\[(Unreleased|\d+\.\d+\.\d+)\]:\s*(\S+)\s*$"
)
UNRELEASED_URL_RE = re.compile(
    r"https://github\.com/([^/\s]+/[^/\s]+)/compare/"
    r"v(\d+\.\d+\.\d+)\.\.\.HEAD"
)


def collect_entries(
    text: str,
) -> tuple[list[tuple[str, int]], list[str], dict[str, str], list[str]]:
    headings: list[tuple[str, int]] = []
    references: dict[str, str] = {}
    versions: list[str] = []
    errors: list[str] = []

    for line_number, line in enumerate(text.splitlines(), start=1):
        if line.startswith("## ["):
            match = HEADING_RE.fullmatch(line)
            if not match:
                errors.append(
                    f"line {line_number}: malformed release heading: {line}"
                )
                continue

            name = match.group(1)
            headings.append((name, line_number))
            if name != "Unreleased":
                versions.append(name)

        reference = REFERENCE_RE.fullmatch(line.strip())
        if not reference:
            continue

        name, url = reference.groups()
        if name in references:
            errors.append(f"duplicate link definition for [{name}]")
        references[name] = url

    return headings, versions, references, errors


def validate_release_order(
    headings: list[tuple[str, int]], versions: list[str], errors: list[str]
) -> None:
    unreleased_lines = [line for name, line in headings if name == "Unreleased"]
    if len(unreleased_lines) != 1:
        errors.append(
            f"expected exactly one [Unreleased] heading; found {len(unreleased_lines)}"
        )
    elif versions:
        first_release_line = min(
            line for name, line in headings if name != "Unreleased"
        )
        if unreleased_lines[0] > first_release_line:
            errors.append("[Unreleased] must appear before all versioned sections")

    if not versions:
        errors.append("expected at least one versioned release heading")
    if len(versions) != len(set(versions)):
        errors.append("versioned release headings must be unique")

    sorted_versions = sort_versions_descending(versions)
    if versions != sorted_versions:
        errors.append("versioned release headings must be in descending order")


def sort_versions_descending(versions: list[str]) -> list[str]:
    return sorted(
        versions,
        key=lambda version: tuple(int(part) for part in version.split(".")),
        reverse=True,
    )


def expected_release_url(
    repository: str, version: str, older_version: str | None
) -> str:
    if older_version is None:
        return f"https://github.com/{repository}/releases/tag/v{version}"
    return (
        f"https://github.com/{repository}/compare/"
        f"v{older_version}...v{version}"
    )


def validate_comparison_links(
    versions: list[str], references: dict[str, str], errors: list[str]
) -> None:
    if not versions or "Unreleased" not in references:
        return

    ordered_versions = sort_versions_descending(versions)

    match = UNRELEASED_URL_RE.fullmatch(references["Unreleased"])
    if not match:
        errors.append(
            "[Unreleased] link must compare the latest release tag with HEAD"
        )
        return

    repository, source_version = match.groups()
    if repository != REPOSITORY:
        errors.append(
            f"[Unreleased] link must target repository {REPOSITORY}; found {repository}"
        )
    if source_version != ordered_versions[0]:
        errors.append(
            f"[Unreleased] link must start at latest release v{ordered_versions[0]}"
        )

    for index, version in enumerate(ordered_versions):
        url = references.get(version)
        if url is None:
            continue
        older_version = (
            ordered_versions[index + 1]
            if index + 1 < len(ordered_versions)
            else None
        )
        expected_url = expected_release_url(REPOSITORY, version, older_version)
        if url != expected_url:
            errors.append(f"[{version}] link must be {expected_url}")


def validate(text: str) -> list[str]:
    headings, versions, references, errors = collect_entries(text)
    validate_release_order(headings, versions, errors)

    expected_references = {"Unreleased", *versions}
    missing = sorted(expected_references - references.keys())
    extra = sorted(references.keys() - expected_references)
    if missing:
        errors.append(
            "missing link definitions: " + ", ".join(f"[{name}]" for name in missing)
        )
    if extra:
        errors.append(
            "link definitions without headings: "
            + ", ".join(f"[{name}]" for name in extra)
        )

    validate_comparison_links(versions, references, errors)
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate changelog sections and comparison links."
    )
    parser.add_argument(
        "path",
        nargs="?",
        type=Path,
        default=DEFAULT_CHANGELOG,
        help="changelog file to check (defaults to CHANGELOG.md)",
    )
    args = parser.parse_args()

    try:
        text = args.path.read_text(encoding="utf-8")
    except OSError as error:
        print(f"[FAIL] Cannot read {args.path}: {error}", file=sys.stderr)
        return 1

    errors = validate(text)
    if errors:
        print(f"[FAIL] Changelog validation failed for {args.path}:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("[ OK ] Changelog sections and comparison links are valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
