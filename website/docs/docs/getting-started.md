---
sidebar_position: 2
---

# Getting Started

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [yalc](https://github.com/wclr/yalc) installed globally
- [VSCode](https://code.visualstudio.com/)

## Installation

You can run `yalcspace` directly with `npx`:

```bash
npx yalcspace
```

Or install it globally:

```bash
npm install -g yalcspace
```

## First Steps

1. Navigate to your top-level project directory
2. Ensure you have at least one yalc'd dependency (`yalc add <package>`)
3. Run `npx yalcspace`
4. A VSCode workspace will be generated and opened automatically

The generated workspace includes your project directory and all yalc-linked packages, along with build commands accessible via `Cmd/Ctrl+Shift+B`.
