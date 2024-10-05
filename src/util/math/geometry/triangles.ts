import { Optional, Tup } from "../../types";
import { Cartesian3D } from "./coordinates";

export type Tri = {
	readonly a: number;
	readonly b: number;
	readonly c: number;
}

export const Cartesian3dToArr = 
	({ x, y, z }: Cartesian3D): Tup<3> => [x, y, z];

// Triangles
export const getVertTup = 
	({ a, b, c }: Tri): Tup<3> => 
		[a, b, c];

// Apex of triangle: the point opposite the base
export const getApex = (base: Tup<2>) =>
	({ a, b, c }: Tri): Optional<number> => 
		[a, b, c].find(v => v !== base[0] && v !== base[1]);

export const getBase = (apex: number, { a, b, c }: Tri): Tup<2> => 
	[a, b, c].filter(v => v !== apex) as Tup<2>;

export const getEdges = 
	({ a, b, c }: Tri): Tup<3, Tup<2>> => 
		[ [a, b], [b, c], [c, a] ];
		


export const hasVertIndex = 
	(i: number, { a, b, c }: Tri): boolean =>
		a === i || b === i || c === i;

export const faceHasEdge = 
	(edge: Tup<2>, face: Tri): boolean =>
		hasVertIndex(edge[0], face) && hasVertIndex(edge[1], face);