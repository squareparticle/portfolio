# Modular Portfolio Architecture (first-pass migration)

This refactor preserves the legacy site's visual structure while moving portfolio evidence into reusable skill JSON files.

## Resource resolution

The runtime follows a local-first rule:

- `data.json`: job/local manifest, then shared root manifest.
- `banner.json`: job/local file, then `defaults/banner.json`.
- `aboutme.json`: job/local file, then `defaults/aboutme.json`.
- `resume.pdf`: job/local file, then `defaults/resume.pdf`.
- `skills/<ref>.json`: job/local skill, then shared `skills/<ref>.json`.

A nested job page uses the shared renderer from the domain root while loading its own local data.

## Manifest (`data.json`)

The manifest is composition, not evidence. It chooses featured skills and assigns each skill to one category.

```json
{
  "schemaVersion": 1,
  "featured": [
    "squareparticle/bridge-captain/gear-vr-2016"
  ],
  "categories": [
    {
      "id": "Company",
      "name": "Square Particle",
      "icon": "images/logo/company.png",
      "color": "#...",
      "intro": {
        "title": "...",
        "text": "...",
        "image": "images/skills/company/..."
      },
      "skills": [
        "squareparticle/bridge-captain/gear-vr-2016"
      ]
    }
  ]
}
```

Categories are deliberately not a fixed enum. A job portfolio can define categories that best tell that job's story.

## Skill JSON

A reusable skill represents one canonical piece of project evidence.

```json
{
  "schemaVersion": 1,
  "id": "squareparticle/bridge-captain/mission-editor",
  "title": "Mission Editor",
  "subtitle": "...",
  "text": "...",
  "mobileText": "...",
  "media": {
    "image": "...",
    "youtube": "...",
    "gallery": ["..."],
    "htmlBlock": "..."
  },
  "featured": {
    "heroImage": "...",
    "supportingImages": ["...", "...", "..."],
    "overlayTitle": "...",
    "overlayText": "...",
    "description": "..."
  }
}
```

All media fields are optional. `featured` is only required when that skill is promoted into the Featured carousel.

## Featured invariant

A Featured item is a promotion of a normal skill, not a duplicate record.

- Every Featured reference must also occur in exactly one regular category.
- The Featured carousel uses the skill's optional `featured` presentation.
- `Read More` opens the owning category and scrolls to that exact skill.
- A skill should appear in only one regular category in a generated portfolio.

## Job folders

Use `jobs/_template/` as the starter package. A real deployment can place the same package at a public URL such as:

`/rockstar/dialogue-programmer/`

Typical contents:

```text
rockstar/dialogue-programmer/
  index.htm
  data.json
  banner.json       (optional)
  aboutme.json      (optional)
  resume.pdf        (optional but normally expected)
  skills/           (rare job-local skills/overrides)
  icons/            (optional job-local icons)
```

The exact resume submitted for the job should be copied into the job folder as `resume.pdf`.

## Duplicate-skill rule

Before creating a skill, search the shared company/project skill folder. Reuse existing evidence whenever the underlying work is the same. Do not make a duplicate merely to change wording, category placement, or job relevance. A rare job-only skill may live in the job folder's `skills/` tree.

## Migration notes

The current starter library was mechanically extracted from the legacy `data.json`. Existing wording and media references were retained, with only obvious typo/grammar cleanup. The filesystem project classification is a first pass and is intentionally expected to receive a later human cleanup.
