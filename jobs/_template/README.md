# Job Portfolio Folder

Copy this folder to `jobs/<company>/<position>/`.

Optional local resources override shared/default resources:
- `data.json` — job portfolio composition (required)
- `banner.json` — falls back to `/defaults/banner.json`
- `aboutme.json` — falls back to `/defaults/aboutme.json`
- `resume.pdf` — falls back to `/defaults/resume.pdf` when present
- `skills/<skill-ref>.json` — falls back to `/skills/<skill-ref>.json`
- `icons/<name>` — can be used for job-specific category icons

A Featured skill must also occur in exactly one regular category.
