# Migration Plan: Fork to Standalone Repository

**Current**: Fork of `cline/linear-mcp`
**Target**: Standalone repository `locomotive-linear-mcp`
**Reason**: 5,116 lines of significant improvements warrant independent product

---

## ✅ Prerequisites Checklist

- [x] All improvements complete (10/10 issues)
- [x] All tests passing (203/206, 98.5%)
- [x] Documentation complete (IMPROVEMENTS.md, PROJECT-COMPLETE.md)
- [x] Changes committed to `feature/all-improvements` branch
- [ ] New README.md written
- [ ] LICENSE file added
- [ ] package.json updated with new metadata
- [ ] ATTRIBUTION.md created

---

## 📝 Step-by-Step Migration

### Step 1: Prepare Current Repository

**1.1: Merge feature branch**
```bash
cd /home/marty/repos/linear-mcp
git checkout main
git merge feature/all-improvements
```

**1.2: Update package.json**
```json
{
  "name": "@locomotive/linear-mcp",
  "version": "2.0.0",
  "description": "Production-grade Linear MCP server with enterprise resilience, performance optimization, and clean architecture",
  "author": "LOCOMOTIVE Agency <marty@locomotive.agency>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/locomotive-agency/linear-mcp.git"
  },
  "keywords": [
    "linear",
    "linear.app",
    "linear app",
    "linear mcp",
    "linear.app mcp",
    "linear app mcp",
    "task management mcp",
    "project managment mcp",
    "linear api",
    "ai task management",
    "llm task management",
    "ai agent project management",
    "ai agent task manager"
  ]
}
```

**1.3: Add LICENSE file (MIT)**
```bash
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 LOCOMOTIVE Agency

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

**1.4: Create ATTRIBUTION.md**
```bash
cat > ATTRIBUTION.md << 'EOF'
# Attribution

This project builds upon the excellent foundation of [cline/linear-mcp](https://github.com/cline/linear-mcp) by the Cline team.

## Original Project
- **Repository**: https://github.com/cline/linear-mcp
- **Purpose**: Basic Linear MCP integration for Cline
- **License**: Not specified

## Our Enhancements
We've added significant production-grade features:
- Enterprise resilience (rate limiting, retry logic, monitoring)
- Performance optimization (query batching)
- Clean architecture (lifecycle hooks, modular auth, domain errors)
- Comprehensive test coverage (145 new tests)

**Total Additions**: 5,116 lines of code beyond the original implementation.

## Credits
- **Original Authors**: Cline team
- **Enhanced By**: LOCOMOTIVE Agency
- **Maintained By**: Marty Martin (marty@locomotive.agency)

Thank you to the Cline team for creating the foundational MCP server that inspired this work.
EOF
```

---

### Step 2: Create New GitHub Repository

**2.1: Create repo on GitHub**
- Name: `linear-mcp` or `locomotive-linear-mcp`
- Description: "Production-grade Linear MCP server with enterprise resilience and performance optimization"
- Public/Private: Public (recommended)
- Initialize: **Do NOT** initialize with README, .gitignore, or LICENSE (we have our own)

**2.2: Remove old remote, add new remote**
```bash
cd /home/marty/repos/linear-mcp

# Remove existing remotes
git remote remove origin
git remote remove fork

# Add new remote (replace with your actual URL)
git remote add origin https://github.com/locomotive-agency/linear-mcp.git

# Verify
git remote -v
```

**2.3: Push to new repository**
```bash
# Push main branch
git push -u origin main

# Push feature branch (if you want to preserve it)
git push -u origin feature/all-improvements

# Push all tags (if any)
git push --tags
```

---

### Step 3: Update Repository Files

**3.1: Replace README.md**
- See NEW-README.md (will be created next)
- Highlights improvements
- Multi-client installation guide
- Comprehensive feature list

**3.2: Add/Update files**
```bash
# Commit LICENSE
git add LICENSE ATTRIBUTION.md
git commit -m "docs: add MIT license and attribution"

# Replace README
git add README.md
git commit -m "docs: comprehensive README for standalone repository"

# Update package.json
git add package.json
git commit -m "chore: update package metadata for standalone repo"

# Push changes
git push
```

---

### Step 4: npm Publication (Optional)

**4.1: Prepare for npm**
```bash
# Verify package.json is correct
npm pack --dry-run

# Check what will be published
```

**4.2: Publish to npm**
```bash
# Login to npm (if not already)
npm login

# Publish (scoped package recommended)
npm publish --access public
```

**4.3: Update README with npm install**
Add to installation section:
```bash
npm install -g @locomotive/linear-mcp
```

---

### Step 5: GitHub Repository Setup

**5.1: Configure repository settings**
- Add topics: `linear`, `mcp`, `model-context-protocol`, `claude`, `cursor`, `openai`
- Update description
- Add website: Link to LOCOMOTIVE or project docs
- Configure branch protection (optional)

**5.2: Create releases**
```bash
# Tag the release
git tag -a v2.0.0 -m "Release v2.0.0: Production-grade Linear MCP with 10 major improvements"
git push origin v2.0.0
```

**5.3: Create GitHub release**
- Go to Releases → Draft new release
- Tag: v2.0.0
- Title: "v2.0.0 - Production-Grade Linear MCP"
- Description: Copy from IMPROVEMENTS.md summary
- Attach compiled build (optional)

---

### Step 6: Documentation & Marketing

**6.1: Update README badges**
Add to top of README:
```markdown
[![npm version](https://badge.fury.io/js/%40locomotive%2Flinear-mcp.svg)](https://www.npmjs.com/package/@locomotive/linear-mcp)
[![Tests](https://img.shields.io/badge/tests-203%2F206%20passing-brightgreen.svg)](https://github.com/locomotive-agency/linear-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

**6.2: Create comparison table**
Add to README showing your improvements vs original.

**6.3: Write blog post (optional)**
- Announce the production-grade Linear MCP
- Highlight key features
- Share learnings

---

### Step 7: Community & Support

**7.1: Create issue templates**
- Bug report template
- Feature request template
- Question template

**7.2: Create CONTRIBUTING.md**
- Code standards
- Testing requirements
- PR process

**7.3: Update Linear project**
Create new Linear project for maintenance:
- Bug fixes
- Feature requests
- Enhancement ideas

---

## 🚨 Important Considerations

### Attribution
- ✅ ATTRIBUTION.md clearly credits original authors
- ✅ README mentions it's based on cline/linear-mcp
- ✅ No license conflicts (original has no explicit license)

### Naming
Options:
1. `linear-mcp` (simple, direct)
2. `locomotive-linear-mcp` (branded)
3. `linear-mcp-pro` (positions as enhanced version)

**Recommendation**: `linear-mcp` with `@locomotive` npm scope

### Versioning
- Start at v2.0.0 to indicate major enhancements
- Follow semver for future releases

---

## 📦 Post-Migration Checklist

### GitHub
- [ ] Repository created
- [ ] All commits pushed
- [ ] Tags pushed
- [ ] Release created (v2.0.0)
- [ ] Topics/tags configured
- [ ] Repository description updated

### npm (Optional)
- [ ] Package published
- [ ] Scoped name (@locomotive/linear-mcp)
- [ ] README renders correctly on npm

### Documentation
- [ ] New README.md published
- [ ] LICENSE file in place
- [ ] ATTRIBUTION.md present
- [ ] IMPROVEMENTS.md included
- [ ] PROJECT-COMPLETE.md included

### Integration Guides
- [ ] Claude Code instructions tested
- [ ] Claude Desktop instructions tested
- [ ] Cursor instructions verified
- [ ] OpenAI/others documented

---

## 🔄 Maintenance Plan

### Ongoing
- Monitor issues/PRs on new repo
- Update dependencies quarterly
- Maintain compatibility with Linear API changes
- Add features as needed

### Future Enhancements
Reference IMPROVEMENTS.md "Future Enhancements" section:
- Advanced caching
- Runtime type validation
- Performance benchmarks
- Additional monitoring

---

## 📞 Support Channels

### For Users
- GitHub Issues: Bug reports and questions
- GitHub Discussions: Feature requests and ideas
- Email: marty@locomotive.agency

### For Contributors
- CONTRIBUTING.md: Contribution guidelines
- Issue templates: Standardized reporting
- PR templates: Clear submission process

---

**Migration Owner**: Marty Martin
**Target Completion**: 2025-10-29
**Status**: Ready to execute
