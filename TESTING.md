# Testing and Quality Assurance (QA) Pipeline

This project enforces a two-stage Quality Assurance (QA) pipeline to maintain high code quality, security, and performance.

---

## 🛑 MANDATORY RULE FOR FUTURE AGENTS
> [!IMPORTANT]
> **All code must pass `bash scripts/local-qa.sh` locally before attempting a git commit.**

---

## 1. Local QA Pipeline

### Pre-commit Hook Behavior
A local Git pre-commit hook is automatically wired in at `.git/hooks/pre-commit` to prevent committing broken code. Every time you run `git commit`, the hook runs [scripts/local-qa.sh](file:///home/caedussolo/tracegraph-web/scripts/local-qa.sh), which performs the following checks:
1. **Dependency Check**: Automatically verifies and installs Node dependencies (`npm install`).
2. **Linting**: Runs the linter to ensure code style compliance (`npm run lint`).
3. **Unit Tests**: Executes all unit tests in the repository (`npx vitest run`).

If any step in the pipeline fails, the commit is **blocked** and aborted.

### Running Local Tests Manually
You can execute tests manually at any time using the following commands:
- **Run all tests once**:
  ```bash
  npm test
  # or
  npx vitest run
  ```
- **Run tests in watch mode**:
  ```bash
  npm run test:watch
  ```
- **Run a specific test file**:
  ```bash
  npx vitest run api/middleware/csrf.test.ts
  ```
- **Run the full QA pipeline manually**:
  ```bash
  bash scripts/local-qa.sh
  ```

---

## 2. Remote CI (GitHub Actions Integration)

The remote pipeline is configured inside [.github/workflows/qa-pipeline.yml](file:///home/caedussolo/tracegraph-web/.github/workflows/qa-pipeline.yml).

### Chaining & Orchestration
To optimize GitHub Actions execution time and coordinate checks:
1. When changes are pushed or a pull request is created, the primary workflows run first:
   - **`CI`** (build, type-check, lint check)
   - **`Unit Tests`** (vitest with coverage reports)
   - **`E2E Tests`** (playwright end-to-end suite)
2. The **`QA Pipeline`** workflow uses the `workflow_run` trigger to trigger **ONLY after** `CI`, `Unit Tests`, and `E2E Tests` complete successfully (`conclusion == 'success'`).
3. It checks out the code, sets up Node.js, installs dependencies, and runs `bash scripts/local-qa.sh` in the cloud runner to verify the overall integrity of the build.
