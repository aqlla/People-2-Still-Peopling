import * as THREE from "three";
import { Tri } from "../math";

export type TriFace = Tri & {
	normal: THREE.Vector3;
};

export const getFaces = (geo) => {
	const faces: TriFace[] = [];
	const position = geo.getAttribute("position");
	const index = geo.getIndex();

	// console.log(position)
	// console.log(index)
	// index.map((i: number) => {
	// 	const face: TriFace = {
	// 		a: index.getX(i),
	// 		b: index.getX(i + 1),
	// 		c: index.getX(i + 2),
	// 		normal: new THREE.Vector3(),
	// 	};

	// 	const pointA = new THREE.Vector3(
	// 		position.getX(face.a),
	// 		position.getY(face.a),
	// 		position.getZ(face.a)
	// 	);
	// 	const pointB = new THREE.Vector3(
	// 		position.getX(face.b),
	// 		position.getY(face.b),
	// 		position.getZ(face.b)
	// 	);
	// 	const pointC = new THREE.Vector3(
	// 		position.getX(face.c),
	// 		position.getY(face.c),
	// 		position.getZ(face.c)
	// 	);

	// 	(new THREE.Triangle(pointA, pointB, pointC))
	// 		.getNormal(face.normal);
	// })

	for (let i = 0; i < index.count; i += 3) {
		const face: TriFace = {
			a: index.getX(i),
			b: index.getX(i + 1),
			c: index.getX(i + 2),
			normal: new THREE.Vector3(),
		};

		faces.push(face);
	}

	for (let j = 0; j < faces.length; j++) {
        const face = faces[j]
		const pointA = new THREE.Vector3(
			position.getX(face.a),
			position.getY(face.a),
			position.getZ(face.a)
		);
		const pointB = new THREE.Vector3(
			position.getX(face.b),
			position.getY(face.b),
			position.getZ(face.b)
		);
		const pointC = new THREE.Vector3(
			position.getX(face.c),
			position.getY(face.c),
			position.getZ(face.c)
		);

		(new THREE.Triangle(pointA, pointB, pointC))
			.getNormal(face.normal);
	}

	return faces;
}

export const getVertices = (geo) => {
	// console.log(geo)
	// const position = geo.getAttribute("position");
	const position = geo.getAttribute("position");
	const vertices: THREE.Vector3[] = [];

	for (let i = 0; i < position.count / position.itemSize; i++) {
		const vertex = new THREE.Vector3(
			position.getX(i),
			position.getY(i),
			position.getZ(i)
		);

		vertices.push(vertex);
	}

	return vertices;
}
