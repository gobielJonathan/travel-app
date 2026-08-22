---
name: git-commit-workflow
description: Commit, push, and open PRs from the current branch with proper conventional-commit titles and a pre-push ESLint gate; use when the user asks to commit changes, push to origin, open a pull request, or finish/ship current work.
---

# Git Commit Workflow

## Overview

Treat requests to commit changes as ship requests by default: inspect changes, commit, run the required gate, push to origin, and create or update a PR. Perform commit-only workflow only when the user explicitly says `commit only`, `do not push`, or equivalent.

Repo remote is GitHub (`dana-indonesia-org/dana-h5-finfit`). Use `gh` for PR queries and creation. Commits follow conventional style from the repo history (`feat:`, `fix:`, `chore:`, `refactor:` with an optional scope, lowercase).

## Required Workflow

1. **Preflight.** Run `git status --porcelain` and `git branch --show-current`. If the tree is clean, say so and stop. If a staged or changed file is a secret/key/credential, stop and ask before committing anything.
2. **Inspect changes.** Run `git diff HEAD --stat`, inspect changed files, and derive commit type, scope, title, and branch name from actual changes.
3. **Check for an open PR.** Run `gh pr view --json number,title,baseRefName`. Exit code `0` means an open PR exists for current branch; any non-zero exit means none.

### Branch HAS an open PR

1. Create commit title from changes (conventional type + optional scope, lowercase, one line).
2. Stage only intended changed files, then commit: `git add <intended-files>` and `git commit -m "<title>"`.
3. **ESLint gate.** Run `pnpm lint` scoped to changed files only:

   ```sh
   pnpm exec eslint <changed-files> --fix
   pnpm exec eslint <changed-files>
   ```

   Fix what the linter finds. If a fix is risky or would change unrelated behavior, leave it and note it instead of forcing it. Never run `--fix` over the whole repo. Do not let linting break the flow — run it before pushing, not after.

4. Push: `git push origin HEAD`. The existing PR updates automatically. Do NOT create a new PR.
5. Output PR link: `gh pr view --json url --template '{{.url}}'`

### Branch HAS NO open PR

1. Ask for target branch only if repository has multiple plausible base branches; otherwise use repository default branch from `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`. Do not guess when default branch lookup fails.
2. Generate short kebab-case branch name from changes, prefixed with `feat/`, `fix/`, or `chore/`. Ask user to confirm branch name before creating it. If current branch is already a suitable non-default feature branch, keep it instead of creating another branch.
3. Checkout to new branch when needed: `git checkout -b <branch-name>`.
4. Create commit title from changes, then stage only intended files and commit.
5. Run ESLint gate. If linting fixes files after commit, amend with `git commit --amend --no-edit`.
6. Push: `git push -u origin HEAD`.
7. Open PR with normal title, without automatic `[WIP]`, and structured body:

   ```sh
    gh pr create --base <target-branch> --head <current-branch> --title "<commit type>: <description without scope>" --body "$(cat <<'EOF'

   ### PURPOSES

   <why this PR exists and what problem it solves>

   ### CHANGES

   <what was changed, grouped by area>

   ### PR NOTES

   <anything reviewers must know: follow-ups, risks, decisions, links>

   ### TEST RESULT

   <manual or automated verification performed>
   EOF
   )"
   ```

   Fill the four body sections from the change summary (what, why, reviewer notes, verification).

8. **Output the PR link.** Capture the `gh pr create` output (it returns the PR URL). Print it to the user.

## Rules

- Commit title is derived from the code changes, never invented to match the branch name.
- Never amend a failed commit silently; if a hook or gate rejects the commit, fix the issue and create a new commit. When linting fixes require amending, use `git commit --amend --no-edit`.
- Only stage intended files; never `git add -A` when untracked files include secrets or unrelated artifacts.
- Do not create a PR when one already exists for the branch.
- `pnpm test` is optional; run it after the push only if the changes touch testable logic and the user wants the extra check.
