---
name: to-prd
description: Turn the current conversation context into a PRD and publish it to the project issue tracker. Use when user wants to create a PRD from the current context.
---

This skill helps you convert the current conversation context and codebase status into a structured Product Requirement Document (PRD).

> [!IMPORTANT]
> **Do not interview the user for requirements.** Synthesize them from the conversation history and codebase. The only check-in is the module breakdown in step 2.

---

## 📋 Steps to Follow

### 1. Research and Explore
- Explore the repository to understand the current state of the codebase.
- Use the project's **domain glossary** terms throughout the PRD (`artifacts/{project_id}/docs/CONTEXT.md` or `src/{context}/CONTEXT.md`, if present).
- Follow and respect any **Architecture Decision Records (ADRs)** in the codebase areas you are modifying.

### 2. Design the Architecture
- Plan the major modules to build or modify.
- Design **deep modules** (modules that hide complex details behind simple, stable, and testable interfaces) that can be tested in isolation.
- Show the user the proposed modules and which ones need tests, and adjust before writing.

### 3. Write the PRD
Draft the PRD using the template structure below.

### 4. Publish
- If the project tracks work in GitHub issues and `gh` is available, show the user the title and ask before creating the issue (`gh issue create`) with the PRD as its body. Posting is visible to others.
- Otherwise save it to `artifacts/{project_id}/analyst/{YYYY-MM-DD}-prd-<slug>.md`.
- Report the issue URL or file path.

---

## 📄 PRD Template

Use the following sections to write the PRD:

### 🔍 Problem Statement
Explain the problem from the user's perspective. What pain point does this address?

### 💡 Solution
Describe the solution and how it resolves the problem from the user's perspective.

### 👥 User Stories
Provide a detailed, numbered list of user stories. Cover all aspects of the feature.
Format:
> **[Number]. As an [actor], I want [feature], so that [benefit].**
*Example: 1. As a bank customer, I want to see my account balances, so that I can make informed spending decisions.*

### 🛠️ Implementation Decisions
List the technical decisions for the solution:
- Modules to be built or modified.
- Interfaces/APIs for those modules.
- Schema or database changes.
- Technical/architectural clarifications and interactions.

> [!WARNING]
> Do **not** include specific file paths or code snippets (they get outdated quickly).
> *Exception:* You may inline a code snippet if it is a prototype that explains a decision (like a state machine, schema, or type shape) better than text. Keep it brief and mention it is from a prototype.

### 🧪 Testing Decisions
List the testing strategies:
- What makes a good test (focus on testing external behavior, not implementation details).
- Which modules will be tested.
- Existing tests in the codebase to use as a reference (prior art).

### 🚫 Out of Scope
Clearly list features or tasks that will **not** be covered by this PRD.

### 📝 Further Notes
Add any other relevant details or notes.