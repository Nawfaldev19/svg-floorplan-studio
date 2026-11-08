# Enable repository security features

Some protections are repository settings, not files. After the repository is pushed to GitHub, the maintainer turns them on once. Menu names are those of GitHub's web interface.

- [ ] **Private vulnerability reporting:** Settings → Security (Advanced Security) → Private vulnerability reporting → Enable. [SECURITY.md](../../SECURITY.md) and the issue chooser link to it.
- [ ] **Dependabot alerts and security updates:** Settings → Security → Dependabot alerts → Enable, and Dependabot security updates → Enable. Version updates are already configured in [`.github/dependabot.yml`](../../.github/dependabot.yml).
- [ ] **Dependency graph:** on by default for public repositories; needed by the dependency review workflow.
- [ ] **Secret protection and push protection:** Settings → Security → Secret Protection → Enable, then Push protection → Enable. The project has no secrets; this stops one being pushed by mistake.
- [ ] **CodeQL (static analysis):** Settings → Code security → CodeQL analysis → Set up → **Default**, with the languages **javascript-typescript** and **actions**, on the default branch and pull requests. This is the project's SAST control. It is configured in the repository settings rather than as a workflow file: a CodeQL workflow would need a job permission to write analysis results, and this repository keeps every workflow's token at `contents: read` (plus `id-token: write` for Scorecard publishing).
- [ ] **Branch protection or a ruleset for `main`:** Settings → Rules → Rulesets → New branch ruleset targeting `main`, with: require a pull request before merging; require status checks to pass, selecting `verify` and `supply-chain` (CI), `dependency-review`, and the CodeQL check once default setup has run; block force pushes; restrict deletions.
- [ ] **Actions permissions:** Settings → Actions → General → Workflow permissions → "Read repository contents and packages permissions". The workflows request anything more per job.
- [ ] **Scorecard:** nothing to enable; [`scorecard.yml`](../../.github/workflows/scorecard.yml) publishes results after the first push to `main`. The badge URL has the form `https://api.securityscorecards.dev/projects/github.com/Nawfaldev19/svg-floorplan-studio/badge`.

Record the date these were enabled in the CHANGELOG or the release notes, so the Scorecard results can be read in context.
