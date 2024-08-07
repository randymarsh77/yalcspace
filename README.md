# yalcspace

Dynamic VSCode workspaces from yalc links.

## Getting started

In your top-level project directory:

```
$ npx yalcspace
```

Enjoy! See [Usage](#usage) for more information.

## What problems is this solving?

`yalc` is fantastic. Sometimes it needs hand holding. Others, a hammer.

### Duplicate packages in your bundle (AKA broken React Context and other bugs)

`yarn` has a tendency to install multiple package versions when using `yalc`. This is because `file://path/to/package@0.0.0-we-use-semantic-release` is not a compatible version with `package@1.2.3`. If you're building a project (X) with a yalc'd dependency (A), and X also has a dependency (B) that depends on A, then `yarn` might install your local version of A in `node_modules` and the version referenced by B in `node_modules/B/node_modules`. Your build of X might then contain two copies of A. Now, this might make a difference or it might not, depending on X, A, and B.

### Invalid file locations

Let's say you have a project (X) with a yalc'd dependency (A), and X also has a dependency (B) that depends on A (similar to the above example), and you need to build B against your changes to A as well as X. So, you yalc A to X and A to B and B to X. Uh oh. B's package file (in the yalc published output) references A at `.yalc/A`, but, unless you've included the `.yalc` directory in B's distribution, that file doesn't exist relative to X's `node_modules/B`.

### Tedium

Let's say you have a project (X) with a yalc'd dependency (A), and X also has a dependency (B) that depends on A (similar to the above examples). However, you also 10 other packages with interdependencies that you also need to build against some local code in all of them. Your workflow would be some iteration of:
1. Open up workspace for (i)
2. `yarn build`
3. `yalc push`
Repeat in proper order for all dependencies.

## How does it solve them?

Fundamentally, `yalcspace` constructs a dependency graph. It can then perform operations like "add a yalc dependency to all relevant projects" and "build all relevant projects starting from X".

There's also some "magic" where it finds the files in the computer.™

![zoolander](doc/images/zoolander.jpeg)

## But, how does it know what to do?

At this stage, `yalcspace` assumes that every project can be built with `yarn build` and pushed with `yalc push`, all from the project root (package.json file location). If that's not the case, you can add overides to the workspace's settings file. Each workspace includes a `yalcspace` directory. Put anything you want in there. If you put `settings.json`, it can look like this:
```
{
	"my-weird-package": {
		"push": "bash -c \"cd dist && yalc push\""
	},
	"my-unfortunately-out-of-date-package": {
		"build": "nix-shell -p nodejs_18 --command \"export NODE_OPTIONS=--openssl-legacy-provider && yarn build\""
	},
}
```

## Usage

In your top-level project directory, run `npx yalcspace`. This will create a new VSCode workspace including the directory you ran the command with along with all the currently yalc'd packages, and then open that workspace.

You can look at the generated workspace file (in the `yalcspace` directory o the workspace) to see what VSCode commands are available. They're all in the build command group, accessible through `cmd|ctrl+shift+b`.

### Want to add a new dependency?

`yalc` it to the intended project, use the `Regenerate Yalcspace` command.

### Want to ensure you don't have multiple bundled versions?

We do this by linking each project to all transitive dependency projects that connect to the root and building everything. Depending on your dependency graph and what is in your yalcspace, this might be a lot. It's helpful to understand what the upcoming command is doing before running it.

#### Terminology

A yalcspace is "closed" when any dependency of a project in the yalcspace that has a dependency on another in the yalcspace is also part of the yalcspace.
A yalcspace is "complete" if there is no non-linked dependency of any member of the yalcspace which is also in the yalcspace.

#### Example

Consider a scenario where Root, A, and C are packages such that Root depends on A and on C, for another dependency B, A depends on B, and B depends on C.
Now consider a partial (yalc)space: { Root -> A, Root -> C } where A is yalc'd to Root and C is yalc'd to Root (and, the VSCode worksspace contains Root, A, and C).
Closing the space requires we add B to the space and end up with { Root, A, B, C }.
Completing the space requires that C is yalc'd to B, B is yalc'd to A and to Root, and A is yalc'd to Root.

#### Completing the space

`Complete Yalcspace` -- This will both close and complete your current yalcspace.

You need to have all the transitive dependencies on disk. If this command doesn't complete after a while, you might not. They also need to build successfully with your current workspace settings and/or the yalcspace defaults.

### Done with a given package?

`Eject Package` and select which one to remove from the workspace. If you want to reset everything, use `Eject All`.

### Building?

All your pacakges are there. You can build any of them in isolation, or include everything that references them, or, just everything. Activate `cmd|ctrl+shift+b` and Start typing in the name of the package you want to start building from. Select it, and then choose the build mode from the following menu.
- Include Downstream means you build your selection, and everything that depends on it, following the dependency graph to the root of the space.
- Single means you just build that package
- Everything means you start from the lowest dependency in the graph connecterd to your selection and follow the graph to the root off the space.

## License

MIT
