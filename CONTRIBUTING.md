# Contributing to Linear MCP Server

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

---

## 🎯 Development Philosophy

### ZERO MOCK Policy

**CRITICAL RULE**: This project maintains a strict **ZERO MOCK** policy.

- ✅ **DO**: Use real implementations in production code
- ✅ **DO**: Use real algorithms in tests
- ✅ **DO**: Test against real behavior
- ❌ **DON'T**: Use mocks, stubs, or fakes in production code
- ❌ **DON'T**: Mock behavior that can be implemented for real

**Why?** Real implementations build confidence that the code actually works.

**Current Status**: 203/206 tests passing (98.5%) with ZERO MOCKS

---

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Linear API key (for integration tests)
- Git

### Setup Steps

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/linear-mcp.git
cd linear-mcp

# 3. Install dependencies
npm install

# 4. Build
npm run build

# 5. Run tests
npm test
```

### Environment Setup

```bash
# Create .env file
cp .env.example .env

# Add your Linear API key
echo "LINEAR_API_KEY=lin_api_your_key" >> .env
```

---

## 📝 Contribution Workflow

### 1. Create an Issue First

Before coding, create a GitHub issue:
- Describe the feature or bug
- Explain why it's needed
- Propose a solution approach
- Wait for maintainer feedback

### 2. Create a Feature Branch

```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 3. Make Your Changes

**Code Standards**:
- TypeScript for all production code
- Follow existing code style
- Add JSDoc comments for public APIs
- Keep functions focused (single responsibility)

**Testing Standards**:
- Write tests for all new features
- Maintain 95%+ test coverage
- No mocks in production code
- Test real behavior

**Commit Standards**:
```bash
# Format: type: description

# Types:
# feat: New feature
# fix: Bug fix
# docs: Documentation only
# refactor: Code change that neither fixes bug nor adds feature
# test: Adding or updating tests
# chore: Maintenance tasks

# Examples:
git commit -m "feat: add issue filtering by label"
git commit -m "fix: correct rate limit calculation"
git commit -m "docs: update README with new examples"
```

### 4. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test file
npm test -- your-feature.test.ts

# Check build
npm run build

# Run integration tests (requires API key)
npm run test:integration
```

### 5. Submit Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create PR on GitHub
# - Clear title describing the change
# - Reference related issue (#123)
# - Describe what changed and why
# - List any breaking changes
# - Include test results
```

---

## ✅ PR Checklist

Before submitting, verify:

- [ ] All tests passing (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] New features have tests (95%+ coverage)
- [ ] Documentation updated (README, inline comments)
- [ ] No mocks in production code
- [ ] Commit messages follow format
- [ ] Branch is up to date with main

---

## 🧪 Testing Guidelines

### Test Structure

```typescript
// Good test structure
describe('FeatureName', () => {
  beforeEach(() => {
    // Setup with real objects
  });

  it('should do specific thing', () => {
    // Test with real implementation
    const result = realFunction(realData);
    expect(result).toEqual(expectedRealResult);
  });
});
```

### What to Test

**Required**:
- ✅ Happy path (normal operation)
- ✅ Error cases (invalid inputs)
- ✅ Edge cases (empty, null, boundary values)
- ✅ Integration scenarios (real-world usage)

**Not Required**:
- ❌ Testing library code (LinearClient internals)
- ❌ Testing Node.js built-ins

### Test Coverage Goals
- Overall: 95%+
- New features: 100%
- Bug fixes: 100% (must include regression test)

---

## 📐 Code Style

### TypeScript

```typescript
// ✅ Good
export interface UserInput {
  name: string;
  email?: string;
}

export class UserService {
  async createUser(input: UserInput): Promise<User> {
    // Implementation
  }
}

// ❌ Avoid
export class UserService {
  async createUser(input: any): Promise<any> {
    // Too loose typing
  }
}
```

### File Organization

```typescript
// Each file should have single responsibility
// Good structure:

src/features/issues/
  ├── handlers/
  │   └── issue.handler.ts    // Issue-specific handler
  ├── types/
  │   └── issue.types.ts      // Issue type definitions
  └── __tests__/
      └── issue.test.ts       // Issue tests
```

### Error Handling

```typescript
// ✅ Use domain-specific errors
throw new ValidationError(
  'Invalid priority',
  'priority',
  99,
  [0, 1, 2, 3, 4]
);

// ❌ Don't use generic errors
throw new Error('Invalid priority: 99');
```

---

## 🏗️ Architecture Guidelines

### Adding New Features

**1. Define types** (`src/features/*/types/*.ts`):
```typescript
export interface NewFeatureInput {
  field: string;
}

export interface NewFeatureResponse {
  success: boolean;
  data: FeatureData;
}
```

**2. Create handler** (`src/features/*/handlers/*.handler.ts`):
```typescript
export class NewFeatureHandler extends BaseHandler {
  async handleNewOperation(args: NewFeatureInput): Promise<BaseToolResponse> {
    return this.executeWithHooks('tool_name', args, async () => {
      // Implementation
      const result = await this.doWork(args);
      return this.createResponse(result);
    });
  }
}
```

**3. Register tool** (`src/core/types/tool.types.ts`):
```typescript
linear_new_feature: {
  name: 'linear_new_feature',
  description: 'Clear description of what it does',
  inputSchema: { /* JSON Schema */ }
}
```

**4. Add to factory** (`src/core/handlers/handler.factory.ts`):
```typescript
linear_new_feature: {
  handler: this.newFeatureHandler,
  method: 'handleNewOperation'
}
```

**5. Write tests** (`src/__tests__/new-feature.test.ts`):
```typescript
describe('NewFeature', () => {
  it('should work correctly', () => {
    // Test with real implementation
  });
});
```

---

## 🎨 Coding Best Practices

### DRY (Don't Repeat Yourself)
- Reuse common code via base classes
- Extract shared logic into utilities
- Use lifecycle hooks for cross-cutting concerns

### SOLID Principles
- **S**ingle Responsibility: Each class does one thing
- **O**pen/Closed: Extensible via hooks, not modification
- **L**iskov Substitution: Interfaces work interchangeably
- **I**nterface Segregation: Small, focused interfaces
- **D**ependency Inversion: Depend on abstractions

### Type Safety
- Use TypeScript fully
- Avoid `any` type
- Define interfaces for all data structures
- Use enums for fixed value sets

---

## 🚫 What NOT to Do

### ❌ Don't Add Mocks to Production Code
```typescript
// ❌ Bad
export class RateLimiter {
  async acquireSlot() {
    if (process.env.MOCK_MODE) return; // NO!
    // Real implementation
  }
}

// ✅ Good
export class RateLimiter {
  async acquireSlot() {
    // Always real implementation
  }
}
```

### ❌ Don't Break Backward Compatibility
```typescript
// ❌ Bad: Breaking change
export function createIssue(newParameter: string) {
  // Changed signature breaks existing code
}

// ✅ Good: Backward compatible
export function createIssue(newParameter?: string) {
  // Optional parameter maintains compatibility
}
```

### ❌ Don't Skip Tests
- All features must have tests
- All bug fixes must have regression tests
- PRs without tests will be rejected

---

## 📊 Pull Request Template

```markdown
## Description
Brief description of what this PR does.

## Related Issue
Fixes #123

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Changes Made
- Added feature X
- Fixed bug Y
- Updated documentation for Z

## Testing
- [ ] All tests passing (npm test)
- [ ] New tests added (coverage: X%)
- [ ] Integration tests passing
- [ ] No mocks in production code

## Screenshots (if applicable)
Add screenshots for UI changes or tool outputs.

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed the code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No breaking changes (or documented)
- [ ] Tests cover new code
```

---

## 🎓 Learning Resources

### Understanding MCP
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)

### Linear API
- [Linear GraphQL API](https://developers.linear.app/docs/graphql/working-with-the-graphql-api)
- [Linear SDK](https://github.com/linear/linear-sdk)

### Project Architecture
- [IMPROVEMENTS.md](IMPROVEMENTS.md) - Detailed changelog
- [PROJECT-COMPLETE.md](PROJECT-COMPLETE.md) - Architecture overview

---

## 💬 Questions?

- **General Questions**: Open a [GitHub Discussion](https://github.com/locomotive-agency/linear-mcp/discussions)
- **Bug Reports**: Open a [GitHub Issue](https://github.com/locomotive-agency/linear-mcp/issues)
- **Feature Requests**: Open an issue with the "enhancement" label
- **Security Issues**: Email marty@locomotive.agency directly

---

## 🙌 Recognition

Contributors will be:
- Listed in README.md
- Mentioned in release notes
- Credited in commit history

Thank you for contributing to making Linear MCP even better!

---

**Maintained By**: LOCOMOTIVE Agency
**Lead Developer**: Marty Martin
**License**: MIT
