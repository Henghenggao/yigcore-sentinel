# Contributing to Yigcore Sentinel

Thank you for your interest in contributing to Yigcore Sentinel! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Architecture](#architecture)
- [Community](#community)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code. Please report unacceptable behavior to [your-email@example.com].

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.0.0
- **npm** ≥ 9.0.0
- **Git**

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/yigcore-sentinel.git
   cd yigcore-sentinel
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/Henghenggao/yigcore-sentinel.git
   ```

---

## Development Setup

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

### Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:11435`.

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

---

## Making Changes

### Branch Naming Convention

Use descriptive branch names:

- `feature/add-new-rate-limiter` - New features
- `fix/budget-guard-precision` - Bug fixes
- `docs/api-documentation` - Documentation updates
- `test/policy-engine-tests` - Test additions
- `refactor/simplify-audit-logger` - Code refactoring

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

**Examples:**

```
feat(rate-limiter): add adaptive token bucket algorithm

Implement a token bucket that automatically adjusts refill rate
based on historical usage patterns.

Closes #123
```

```
fix(budget-guard): handle floating-point precision in cost checks

Zero-cost operations are now always allowed, even when budget
is exceeded. This allows audit logging without blocking.

Fixes #456
```

---

## Testing

### Unit Tests

All new features must include unit tests:

```bash
npm test
```

We use [Vitest](https://vitest.dev/) for testing. Tests are located in `src/__tests__/`.

**Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { BudgetGuard } from '../budget_guard';

describe('BudgetGuard', () => {
  it('should block when budget is exceeded', () => {
    const guard = new BudgetGuard(10.0);
    guard.deduct('user1', 15.0);

    expect(guard.check('user1', 1.0)).toBe(false);
  });
});
```

### Integration Tests

For server endpoint changes, add integration tests:

```typescript
import { describe, it, expect } from 'vitest';
import { buildServer } from '../server';

describe('POST /governance/check', () => {
  it('should return allowed for valid request', async () => {
    const server = await buildServer();
    const response = await server.inject({
      method: 'POST',
      url: '/governance/check',
      payload: {
        userId: 'test',
        action: 'read_file',
        context: {},
        costEstimate: 0.01,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).allowed).toBe(true);
  });
});
```

### Test Coverage

Aim for at least 80% code coverage for new code:

```bash
npm run test:coverage
```

---

## Submitting Changes

### 1. Keep Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/my-new-feature
```

### 3. Make Your Changes

- Write clean, readable code
- Follow the coding standards (see below)
- Add tests for new functionality
- Update documentation as needed

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat(scope): add new feature"
```

### 5. Push to Your Fork

```bash
git push origin feature/my-new-feature
```

### 6. Open a Pull Request

1. Go to the [original repository](https://github.com/Henghenggao/yigcore-sentinel)
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill out the PR template:
   - **Description**: What does this PR do?
   - **Motivation**: Why is this change needed?
   - **Testing**: How was this tested?
   - **Checklist**: Complete the checklist

### Pull Request Checklist

- [ ] Code follows the project's coding standards
- [ ] Tests added for new functionality
- [ ] All tests pass (`npm test`)
- [ ] Documentation updated (README, API docs, etc.)
- [ ] Commit messages follow Conventional Commits
- [ ] No merge conflicts with `main`
- [ ] PR description is clear and complete

---

## Coding Standards

### TypeScript Style Guide

- Use **TypeScript** for all source code
- Enable strict mode in `tsconfig.json`
- Avoid `any` types - use specific types or `unknown`
- Use interfaces for public APIs
- Prefer `const` over `let`, avoid `var`

**Example:**

```typescript
// Good
export interface BudgetGuardOptions {
  defaultLimit: number;
}

export class BudgetGuard {
  private readonly usage: Map<string, number>;

  constructor(options: BudgetGuardOptions) {
    this.usage = new Map();
  }
}

// Bad
export class BudgetGuard {
  private usage: any; // Don't use 'any'

  constructor(options: any) { // Don't use 'any'
    this.usage = {};
  }
}
```

### Code Formatting

We use Prettier for code formatting (if configured):

```bash
npm run format
```

### Linting

We use ESLint for code quality:

```bash
npm run lint
```

### Naming Conventions

- **Classes**: PascalCase (`BudgetGuard`, `PolicyEngine`)
- **Functions/Methods**: camelCase (`checkBudget`, `evaluatePolicy`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_BUDGET`, `MAX_RETRIES`)
- **Interfaces**: PascalCase with `I` prefix optional (`PolicyRule`, `IPolicyRule`)
- **Type Aliases**: PascalCase (`PolicyEffect`, `AuditEntry`)

### File Structure

```
src/
  ├── __tests__/          # Unit tests (*.test.ts)
  ├── budget_guard.ts     # Core components
  ├── policy_lite.ts
  ├── rate_limiter.ts
  ├── audit_logger.ts
  ├── server.ts           # HTTP server
  └── index.ts            # Public exports
```

---

## Architecture

### Core Components

```
┌─────────────────────────────────────────┐
│  Sentinel Server (localhost:11435)     │
│  ┌─────────────────────────────────┐   │
│  │ 1. Rate Limiter   (Token Bucket)│   │
│  │ 2. Budget Guard   (Cost Tracking│   │
│  │ 3. Policy Engine  (Rule-based)  │   │
│  │ 4. Audit Logger   (Structured)  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Design Principles

1. **Sidecar Pattern**: Sentinel runs as a separate process, communicating via HTTP
2. **Fail-Open by Default**: If Sentinel crashes, agents continue (configurable)
3. **Zero Dependencies**: Core governance logic has minimal external dependencies
4. **Language Agnostic**: HTTP API works with any language
5. **Rule-Based (No LLM)**: Fast policy decisions without AI inference

### Adding a New Component

1. Create the component in `src/your_component.ts`
2. Export it from `src/index.ts`
3. Add unit tests in `src/__tests__/your_component.test.ts`
4. Update documentation in `docs/`
5. Add examples if applicable

---

## Community

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, general discussion
- **Pull Requests**: Code contributions

### Getting Help

- Check the [README](./README.md) first
- Search [existing issues](https://github.com/Henghenggao/yigcore-sentinel/issues)
- Read the [API documentation](./docs/API.md)
- Ask in [GitHub Discussions](https://github.com/Henghenggao/yigcore-sentinel/discussions)

### Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- Sentinel version (`package.json`)
- Node.js version (`node -v`)
- Operating system
- Steps to reproduce
- Expected vs. actual behavior
- Relevant logs or error messages

### Requesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and include:

- Clear use case
- Why existing features don't solve this
- Proposed API or implementation (optional)
- Are you willing to contribute?

---

## License

By contributing to Yigcore Sentinel, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

Thank you for contributing to Yigcore Sentinel! 🎉
