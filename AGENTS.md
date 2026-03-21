# Agents.md

## Code Style
### Structure and Clarity

- Never-nesting: early returns, flat code, minimal indentation. Break complex operations into well-named helpers.
- No dynamic imports unless absolutely necessary.
- Always include an empty line after a function header or a class header.
- Separate consecutive code blocks with a blank line for readability — e.g. after an `if`/early-return block, leave one blank line before the next statement or block.
- An import should not be broken down into multiple lines, no matter how many items are imported from a package.

### DRY

- Extract repeated logic into utility functions.
- Reusable hooks / higher-order components for UI patterns.
- Shared validators, centralized error handling, single source of truth for business rules.
- Shared typing system with interfaces/types extending common base definitions.
- Abstraction layers for external API interactions.
