# Jamie Whitten Portfolio

A modular, JSON-driven portfolio system designed to generate targeted portfolio versions for individual job applications while reusing a shared library of real project experience.

## Purpose

This project is the source for `jamiewhitten.com` and its job-specific portfolio variants.

Instead of maintaining separate copies of the portfolio for every company or position, the site is built from reusable project skill files plus small job-specific configuration folders.

Example:

```text
jamiewhitten.com/rockstar/dialogue-programmer/
```

A targeted portfolio can select the projects, categories, Featured items, banner text, About Me content, and exact resume most relevant to that job.

## Core Design

The portfolio separates reusable career evidence from job-specific presentation.

```text
skills/
    company/
        project/
            *.json

jobs/
    company/
        position/
            data.json
            banner.json
            aboutme.json
            resume.pdf
            skills/
            icons/
```

### Shared Skills

Reusable project evidence lives under:

```text
skills/<company>/<project>/
```

Each skill represents a distinct piece of real project experience and can contain:

* Title
* Technology / subtitle text
* Description
* Images
* Image galleries
* Videos
* Featured presentation data

Skills are reused across job portfolios rather than duplicated.

### Job Portfolios

Each targeted application can have its own folder under:

```text
jobs/<company>/<position>/
```

The job folder defines how the shared evidence is presented for that employer.

A job portfolio can provide:

* `data.json` — categories, skill selection, ordering, Featured selection, and page composition
* `banner.json` — job-specific top banner
* `aboutme.json` — job-specific About Me content
* `resume.pdf` — the exact resume submitted with that application
* `skills/` — rare job-specific skills or local overrides
* `icons/` — optional job-specific category icons

## Local-First Resolution

Resources use a local-first fallback model.

For example:

```text
jobs/rockstar/dialogue-programmer/aboutme.json
```

is used when present.

Otherwise the site falls back to:

```text
defaults/aboutme.json
```

The same approach applies to:

* Banner content
* About Me content
* Resume
* Skills
* Category icons

For skills, a job-local version overrides the shared skill with the same path.

## Categories

Categories are not hardcoded.

Each job portfolio can define the categories that best communicate fit for that particular role.

Examples might include:

* Narrative Systems
* Developer Tools
* Engine Architecture
* Full-Stack Systems
* Identity & SSO
* Cloud Architecture
* Technical Leadership

The category list also drives the site's navigation and category-selection UI.

## Featured Carousel

Featured is a curated carousel of existing skills.

A Featured skill must also exist in a normal category so visitors can use **Read More** to jump directly to the full skill entry.

Featured presentation supports:

* 1 hero image
* 3 supporting images
* Overlay title
* Technology / subtitle text
* Short description
* Read More navigation

The existing carousel transitions and visual presentation are intentionally preserved.

## About Me

The About Me page is JSON-driven and can be tailored for each job.

A game-company version might emphasize:

* Game development
* Engines
* Narrative systems
* Tools
* Shipped titles

A full-stack version might instead emphasize:

* Production software engineering
* Architecture
* Cloud
* Databases
* Leadership

If a job-specific `aboutme.json` is missing, the default version is used.

## Resume

Each job portfolio can contain the exact resume submitted to that employer:

```text
jobs/<company>/<position>/resume.pdf
```

The site's **Download Resume** button resolves to that file first.

If it is absent, the site falls back to:

```text
defaults/resume.pdf
```

## Validation and Tests

The project includes automated checks for important portfolio rules.

Current tests cover areas such as:

* Shared skill resolution
* Job-local skill overrides
* Banner and About Me fallback
* Featured/category integrity
* Duplicate category placement
* Missing-media resilience
* Visible startup failures
* Featured Read More navigation
* Successful browser rendering

Run tests with:

```bash
npm test
```

## Legacy UI

The current visual design is intentionally retained.

The project still uses the existing Bootstrap 3, jQuery, Animate.css, and Font Awesome based interface.

These libraries are pinned locally so the portfolio does not depend on external CDNs to start correctly.

Modernizing the frontend stack is considered a separate future task and is not part of the modular portfolio refactor.

## Design Principle

The shared skill library describes:

> What Jamie has actually built.

A job portfolio describes:

> Which of that evidence matters most to this employer, and how it should be presented.

The goal is one maintainable portfolio engine capable of producing highly targeted application portfolios without duplicating career history or maintaining separate websites.

