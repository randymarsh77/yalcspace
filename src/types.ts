export interface Project {
	fullName: string;
	nonScopedName: string;
	path: string;
	links: Project[];
	allDependencies: string[];
}

export interface PackageJson {
	name: string;
	version: string;
	dependencies: { [name: string]: string };
	devDependencies: { [name: string]: string };
}
