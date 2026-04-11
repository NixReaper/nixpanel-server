# NixPanel Development Standards

This file is read automatically by Claude Code before every session.
All rules below are **mandatory** — follow them without being asked.

---

## 1. Version Numbering

Versioning follows [Semantic Versioning](https://semver.org/). Pre-1.0 rules:

| Change type | Bump | Example |
|---|---|---|
| New feature, new page, new section | **MINOR** | 0.5.1 → 0.6.0 |
| Bug fix, refactor, chore, docs | **PATCH** | 0.5.1 → 0.5.2 |
| Breaking API/schema change | **MINOR** | 0.5.x → 0.6.0 |

**Always** bump the version in `package.json` before committing any user-visible change.

---

## 2. Changelog

File: `CHANGELOG.md` at the repo root.

### Format

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Features         ← new functionality
### Changes          ← non-breaking behaviour changes / refactors
### Bug Fixes        ← defect corrections
### Refactors        ← internal restructuring with no behaviour change
```

### Rules

- Add a new entry **at the top** of the file (below the header block) for every commit.
- One entry per version — if multiple changes share a version, group them under the same header.
- Bullet points must be descriptive enough that a developer can understand what changed and why without reading the diff.
- Use bold for the affected component/file: `- **BasicSetup.tsx** — description`.
- Today's date format: `YYYY-MM-DD`.

---

## 3. Commit Messages

Format: `type(scope): short imperative summary`

| Type | When to use |
|---|---|
| `feat` | New feature or page |
| `fix` | Bug fix |
| `refactor` | Code restructuring, no behaviour change |
| `chore` | Version bump, changelog, config, tooling |
| `docs` | Documentation only |

Rules:
- Summary line ≤ 72 characters.
- Always include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` trailer.
- Use a multiline HEREDOC — never single-line for complex messages.

### Workflow for every change

1. Make code changes.
2. Bump version in `package.json`.
3. Add entry to `CHANGELOG.md`.
4. Stage all changed files including `package.json` and `CHANGELOG.md`.
5. Commit everything together in **one commit**.
6. Push to `origin main`.

> Do **not** make a separate `chore: bump version` commit — version + changelog belong in the same commit as the code change.

---

## 4. File Size Limit

**No source file should exceed 300 lines.**

When a file approaches this limit, split it by responsibility:
- React pages → extract sub-components into a `pages/<section>/` subfolder.
- Fastify route files → split into sub-plugins under `routes/<section>/` with an `index.ts` registering them.
- Shared UI primitives → `components/` folder.

---

## 5. Page / Section Architecture

### Frontend

Each nav category in the sidebar maps to a **section folder**:
```
pages/<section-name>/
  index.tsx          ← card-grid landing page (always create this first)
  ToolName.tsx       ← one file per tool/feature
```

Unimplemented tools use `<ComingSoon title="..." description="..." />` from `components/ComingSoon.tsx`.

Section landing pages use `<SectionCard>` from `components/SectionCard.tsx`.

### Backend

Route files live under `routes/nixserver/<section>/`:
```
routes/nixserver/<section>/
  index.ts    ← registers sub-plugins, no route logic here
  list.ts     ← read-only GET routes
  create.ts   ← POST / creation route
  modify.ts   ← PUT / PATCH routes
  status.ts   ← suspend / unsuspend / delete / bulk
```

---

## 6. Project Structure (key paths)

```
nixpanel-server/
  package.json                  ← root version number lives here
  CHANGELOG.md                  ← always update before committing
  CLAUDE.md                     ← this file
  nixserver/src/
    components/
      navData.ts                ← NAV array + NavCategory/NavItem types
      Sidebar.tsx               ← sidebar UI
      Layout.tsx                ← thin shell (topbar + Outlet)
      SectionCard.tsx           ← reusable section card
      ComingSoon.tsx            ← placeholder for unimplemented tools
    pages/
      server-configuration/     ← example of section folder pattern
        index.tsx
        BasicSetup.tsx
        ChangeRoot.tsx
        ...
  server/src/
    routes/nixserver/
      accounts/                 ← example of split route folder
        index.ts
        list.ts
        create.ts
        modify.ts
        status.ts
```

---

## 7. API Conventions

- All responses: `{ success: true, data: ... }` or `{ success: false, error: "..." }`.
- All admin routes use `preHandler: [requireAdmin]` or `preHandler: [requireAdminOrReseller]`.
- Settings stored as key-value pairs in the `Setting` model (`key String @id`, `value String`).
- New settings keys use UPPERCASE (matching WHM convention): `CONTACTEMAIL`, `TTL`, etc.

---

## 8. Git Remote

```
origin  https://github.com/NixReaper/nixpanel-server.git  (fetch/push)
branch  main
```

Always push to `origin main` after committing.
