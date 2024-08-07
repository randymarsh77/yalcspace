# yalcspace

Dynamic VSCode workspaces from yalc links.

## Usage

In your top-level project directory:

```
$ npx yalcspace
```

Enjoy!

## What problems is this solving?

### Duplicate packages

`yalc` is fantastic. However, `yarn` has a tendency to install multiple package versions when using `yalc`. This is because `file://path/to/package@0.0.0-we-use-semantic-release` is not a compatible version with `package@1.2.3`. If you're building a project (X) with a yalc'd dependency (A), and X also has a dependency (B) that depends on A, then `yarn` might install your local version of A in `node_modules` and the version referenced by B in `node_modules/B/node_modules`. Your build of X might then contain two copies of A. Now, this might make a difference or it might not, depending on X, A, and B.

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

## More useful stuff

You can look at the generated workspace file to see what commands are available. They're all in the build command group, accessibly through `cmd|ctrl+shift+b`.

### Want to add a new dependency?

`yalc` it to the intended project, use the `Regenerate Yalcspace` command.

### Want to ensure you don't have multiple bundled versions?

`Complete Yalcspace` ... hope you have all the transitive dependencies on disk. If this command doesn't complete after a while, you might not.

### Done with a given package?

`Eject Package`.

### Building?

All your pacakges are there. You can build any of them in isolation, or include everything that references them, or, just everything.

## License

MIT
