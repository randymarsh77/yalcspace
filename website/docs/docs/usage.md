---
sidebar_position: 3
---

# Usage

## Building Packages

All packages in the workspace have associated build commands. Activate `Cmd/Ctrl+Shift+B` and start typing the name of the package you want to build. Select it, then choose the build mode:

- **Single** — Build only the selected package
- **IncludeDownstreamDependents** — Build your selection and everything that depends on it, following the dependency graph to the root
- **Everything** — Start from the lowest dependency connected to your selection and follow the graph to the root

You can also select **Build Everything** which builds from the lowest dependency in your entire graph to the root.

## Adding Dependencies

To add a new dependency to your workspace:

1. Use `yalc` to link it to the intended project: `yalc add <package>`
2. Run the **Regenerate Yalcspace** command

## Completing the Space

To ensure you don't have multiple bundled versions of any package, use the **Complete Yalcspace** command. This will close and complete your current yalcspace.

### Terminology

- A yalcspace is **closed** when any dependency of a project in the yalcspace that has a dependency on another in the yalcspace is also part of the yalcspace.
- A yalcspace is **complete** if there is no non-linked dependency of any member of the yalcspace which is also in the yalcspace.

## Custom Build Commands

By default, `yalcspace` assumes every project can be built with `yarn build` and pushed with `yalc push`. You can customize this in the workspace's `yalcspace/settings.json`:

```json
{
  "my-weird-package": {
    "push": "bash -c \"cd dist && yalc push\""
  },
  "my-legacy-package": {
    "build": "nix-shell -p nodejs_18 --command \"export NODE_OPTIONS=--openssl-legacy-provider && yarn build\""
  }
}
```

## Ejecting Packages

- **Eject Package** — Remove a specific package from the workspace
- **Eject All** — Reset the entire workspace
