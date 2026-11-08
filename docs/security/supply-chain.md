# Supply chain

Dependency and CI controls, organised by the [OpenSSF Scorecard](https://github.com/ossf/scorecard) checks. Scorecard runs from [`scorecard.yml`](../../.github/workflows/scorecard.yml) and publishes its own score, so none is copied here.

## Dependency policy

- **Permissive licences** for direct dependencies: MIT, ISC, Apache-2.0 or BSD for code, SIL OFL 1.1 for the fonts. [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) lists every direct dependency and each transitive licence outside that set, with a reason.
- **Few runtime dependencies.** `package-lock.json` has 10 packages not marked `dev`: the direct dependencies `react`, `react-dom`, `zod`, `lucide-react`, `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/jetbrains-mono` and `@fontsource/atkinson-hyperlegible`; `scheduler`, used by `react-dom`; and the type-only `@types/react` and `csstype`, marked `devOptional` because `lucide-react` lists them as an optional peer. Only the first eight reach the bundle.
- **Lockfile committed**; CI installs with `npm ci`, so the lockfile is authoritative.
- **Cooldown.** New versions are adopted at least 14 days after release, so a compromised one has time to be reported; Dependabot uses the same cooldown. `eslint-plugin-jsdoc`, for example, is locked at 65.0.2, released on 2026-10-02.
- **Updates** come from Dependabot weekly, grouped by minor and patch, at most five open pull requests per ecosystem ([`.github/dependabot.yml`](../../.github/dependabot.yml)).

## Controls by Scorecard check

| Check                          | How this repository meets it                                                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token-Permissions              | Every workflow sets `permissions: contents: read` at the top. The only write permission is `id-token: write` on the Scorecard job, which publishing needs. No workflow can write code-analysis results.                                                 |
| Pinned-Dependencies            | Actions are pinned to full commit SHAs with the version as a comment; npm packages are pinned by the lockfile.                                                                                                                                          |
| Dependency-Update-Tool         | Dependabot for `npm` and `github-actions`.                                                                                                                                                                                                              |
| SAST                           | Type-aware ESLint in the gate. CodeQL **default setup** for `javascript-typescript` and `actions` is a repository setting, to enable after the first push ([enable-repository-security-features.md](../how-to/enable-repository-security-features.md)). |
| Security-Policy                | [SECURITY.md](../../SECURITY.md) at the root.                                                                                                                                                                                                           |
| License                        | [LICENSE](../../LICENSE) (MIT) at the root.                                                                                                                                                                                                             |
| CI-Tests                       | [`ci.yml`](../../.github/workflows/ci.yml) runs the full gate on every push to `main` and every pull request.                                                                                                                                           |
| Dangerous-Workflow             | No `pull_request_target`; no untrusted input interpolated into `run:` steps; `persist-credentials: false` on every checkout.                                                                                                                            |
| SBOM                           | `npm sbom --sbom-format cyclonedx` in the `supply-chain` CI job, uploaded as the `sbom` artifact (kept 30 days).                                                                                                                                        |
| Binary-Artifacts               | No binaries are committed; `docs/assets/` holds only images.                                                                                                                                                                                            |
| Code-Review, Branch-Protection | Repository settings, to enable after the first push ([enable-repository-security-features.md](../how-to/enable-repository-security-features.md)).                                                                                                       |

## Where analysis results go

- **CodeQL** default setup lives in the repository settings, not in a workflow, so no workflow token needs permission to write analysis results.
- **Scorecard** runs with `publish_results: true` (hence `id-token: write`) and keeps its SARIF as the `scorecard-results` artifact for 30 days. It does not upload SARIF to the Security tab, which would need a further write permission; the score is visible through the Scorecard API and badge.

## Vulnerability checks in CI

The `supply-chain` job in [`ci.yml`](../../.github/workflows/ci.yml):

- `npm audit --omit=dev --audit-level=high` **blocks** the build on a high or critical advisory in anything shipped to users.
- `npm audit --audit-level=high || true` **reports** development-tool advisories without failing, since they never reach the built app; each is reviewed and recorded below.

Pull requests also run the [dependency review](../../.github/workflows/dependency-review.yml) action, which fails on new dependencies with high or critical advisories.

## Current status

Recorded on 2026-10-17 with npm 11.4.2 against the committed lockfile:

| Command                                   | Result                                 |
| ----------------------------------------- | -------------------------------------- |
| `npm audit --omit=dev --audit-level=high` | `found 0 vulnerabilities`              |
| `npm audit --audit-level=high`            | `found 0 vulnerabilities`              |
| `npm sbom --sbom-format cyclonedx`        | CycloneDX 1.5 document, 242 components |

No risks are accepted. A development-only advisory without a patched release would be recorded here with the package, the advisory, why it cannot reach the built app, and the date last checked.

## Build output and workflows

- Source maps are built `'hidden'`: written to `dist/` but not linked from the bundle, so browsers do not fetch them and a host can leave them out.
- The CI jobs are the two defined in [`ci.yml`](../../.github/workflows/ci.yml), `verify` and `supply-chain`; the [test strategy](../testing/strategy.md) maps them to the local commands.
- Not covered: the SBOM and build output are not signed, and no provenance attestation is published.
