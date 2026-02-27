---
sidebar_position: 1
slug: /
---

# Introduction

**yalcspace** generates dynamic VSCode workspaces from yalc links, streamlining multi-package local development.

## What is yalcspace?

When working with multiple local packages linked via [yalc](https://github.com/wclr/yalc), managing builds, dependencies, and workspace configurations becomes tedious and error-prone. `yalcspace` solves this by:

- **Constructing dependency graphs** from your yalc links
- **Generating VSCode workspaces** that include all linked packages
- **Providing build commands** that respect dependency ordering
- **Eliminating duplicate packages** in your bundles

## Quick Start

In your top-level project directory:

```bash
npx yalcspace
```

This creates a VSCode workspace including your project and all currently yalc'd packages, then opens it.

## Problems Solved

### Duplicate packages in your bundle

`yarn` can install multiple versions of a package when using `yalc`, because `file://path/to/package@0.0.0` isn't compatible with `package@1.2.3`. This leads to broken React Context and other subtle bugs.

### Invalid file locations

When yalc'd packages reference other yalc'd packages, the `.yalc` directory paths can become invalid relative to the consuming project's `node_modules`.

### Development tedium

Without `yalcspace`, building a chain of interdependent local packages requires manually opening each workspace, building, and pushing — in the correct order.
