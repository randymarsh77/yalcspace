export interface Project {
	name: string;
	path: string;
	links: Project[];
}

export interface PackageJson {
	name: string;
	version: string;
	dependencies: { [name: string]: string };
	devDependencies: { [name: string]: string };
}
