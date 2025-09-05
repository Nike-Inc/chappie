# CI/CD Workflow Documentation

## GitHub Actions Workflow Overview

The `publish.yml` workflow now has two distinct jobs that run based on different triggers:

### 🧪 **Test Job**

**Triggers:**

- Push to any branch targeting main
- Pull requests to main branch

**What it does:**

- ✅ Runs on every push and PR
- ✅ Installs dependencies
- ✅ Executes test suite (`npm run test`)
- ✅ Validates Bruno variable functionality
- ✅ Ensures all assertions pass
- ✅ Provides feedback on test results

### 📦 **Version & Publish Job**

**Triggers:**

- Only on pushes to main branch (after tests pass)
- Never runs on PRs or other branches

**What it does:**

- ✅ Waits for test job to complete successfully (`needs: test`)
- ✅ Bumps package version (patch)
- ✅ Publishes to npm
- ✅ Commits version bump back to repository

## Workflow Behavior Examples

### ✅ **Pull Request Scenario**

```
PR created → Test job runs → ✅ Tests pass → PR can be merged
PR created → Test job runs → ❌ Tests fail → PR blocked
```

### ✅ **Push to Main Scenario**

```
Push to main → Test job runs → ✅ Tests pass → Publish job runs → 📦 New version published
Push to main → Test job runs → ❌ Tests fail → Publish job skipped → ❌ No publish
```

### ✅ **Feature Branch Scenario**

```
Push to feature-branch → Test job runs → ✅ Tests pass → No publish (safe)
Push to feature-branch → Test job runs → ❌ Tests fail → Developer gets feedback
```

## Benefits

1. **🛡️ Protection**: No broken code reaches npm
2. **🔄 Continuous Feedback**: Tests run on every change
3. **🚀 Automated Releases**: Successful main branch pushes auto-publish
4. **👥 Team Safety**: PRs are validated before merge
5. **📊 Quality Gates**: Clear pass/fail indicators

## Test Exit Codes

- **Exit 0**: All tests passed ✅
- **Exit 1**: One or more tests failed ❌

## Commands

- `npm run test` - Run full test suite locally
- `npm run test:ci` - Same as above (for CI clarity)
- `npm run mock-server` - Start mock server manually
