import {Tuple} from "../../util/types.ts";


export type Vec<N extends number> = Tuple<N, number>

export type Vec3 = Vec<3>


export type Vertex = Vec<3> | number

export type Polygon<
	N extends number,
	TVertex extends Vertex> = Tuple<N, TVertex>


export type Polyhedron = {
	faces: Polygon<3, number>[],
	vertices: Vec3[]
}

// Helper function to normalize a vector
const normalize = (v: Vec3): Vec3 => {
	const length = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
	return [v[0] / length, v[1] / length, v[2] / length];
};

// Helper function to find the midpoint of two vertices
const midpoint = (v1: Vec3, v2: Vec3): Vec3 => normalize([
	(v1[0] + v2[0]) / 2,
	(v1[1] + v2[1]) / 2,
	(v1[2] + v2[2]) / 2,
]);

const PHI = (1 + Math.sqrt(5)) / 2;
const VERTICES: Vec<3>[] = [
	[-1, PHI, 0],
	[1, PHI, 0],
	[-1, -PHI, 0],
	[1, -PHI, 0],
	[0, -1, PHI],
	[0, 1, PHI],
	[0, -1, -PHI],
	[0, 1, -PHI],
	[PHI, 0, -1],
	[PHI, 0, 1],
	[-PHI, 0, -1],
	[-PHI, 0, 1],
]

const FACES: Polygon<3, number>[] = [
	[0, 11, 5],
	[0, 5, 1],
	[0, 1, 7],
	[0, 7, 10],
	[0, 10, 11],
	[1, 5, 9],
	[5, 11, 4],
	[11, 10, 2],
	[10, 7, 6],
	[7, 1, 8],
	[3, 9, 4],
	[3, 4, 2],
	[3, 2, 6],
	[3, 6, 8],
	[3, 8, 9],
	[4, 9, 5],
	[2, 4, 11],
	[6, 2, 10],
	[8, 6, 7],
	[9, 8, 1],
];

// Function to create an initial icosahedron
const createIcosahedron = (): Polyhedron =>
	({vertices: VERTICES, faces: FACES})

// Function to subdivide the faces of the icosahedron
const subdivide = ({ vertices, faces }: Polyhedron) => {
	const vertexCache = {};
	const newFaces: Polygon<3, number>[] = [];

	const addVertex = (vertex: Vec3) => {
		const key = vertex.toString();
		if (!(key in vertexCache)) {
			vertexCache[key] = vertices.length;
			vertices.push(vertex);
		}
		return vertexCache[key];
	};

	faces.forEach(([v0, v1, v2]) => {
		const a = midpoint(vertices[v0], vertices[v1]);
		const b = midpoint(vertices[v1], vertices[v2]);
		const c = midpoint(vertices[v2], vertices[v0]);

		const aIdx = addVertex(a);
		const bIdx = addVertex(b);
		const cIdx = addVertex(c);

		newFaces.push(
			[v0, aIdx, cIdx], 
			[v1, bIdx, aIdx], 
			[v2, cIdx, bIdx], 
			[aIdx, bIdx, cIdx]
		);
	});

	return {vertices, faces: newFaces};
};

// Function to create a subdivided icosahedron
const createSubdividedIcosahedron = (subdivisions: number) => {
	let { vertices, faces } = createIcosahedron();

	for (let i = 0; i < subdivisions; i++) {
		({ vertices, faces } = subdivide({ vertices, faces }));
	}

	return {vertices, faces};
};

// Example usage
const subdivisions = 2;
const {vertices, faces} = createSubdividedIcosahedron(subdivisions);

console.log("Vertices:", vertices);
console.log("Faces:", faces);
