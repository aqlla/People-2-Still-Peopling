import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js'
import { groupFaces, toJson, Tile } from './util/math/geometry/goldberg.ts';
import { saveAs } from 'file-saver';
import { Cartesian3D, cartesianToGeographic, cartesianToSpherical, Geographic, sphericalToCartesian } from './util/math/geometry/coordinates.ts';
import { TODO } from './util/types.ts';
import { toIndexed } from './util/three-tools/BufferGeometryToIndexed.js'


const setVertexHeight = (height: number) => (vert: Cartesian3D) => {
	const { radius, theta, phi } = cartesianToSpherical(vert);
	const { x, y, z } = sphericalToCartesian({
		radius: radius + height,
		theta,
		phi
	})
	return new THREE.Vector3(x, y, z)
}

const generateWorld = async (n: number, r: number) => {
	console.log(`Generating Goldberg... n=${n}, r=${r}`)
	const ico = toIndexed(new THREE.IcosahedronGeometry(r, n))(true, 6);
	const tiles = groupFaces(ico);
	const blob = new Blob([toJson(tiles)], { type: 'application/json' })
	await saveAs(blob, `/people-2-still-peopling/geometries/goldberg_${n}_${r}.json`)
	return tiles
}

const createFresnelMaterial = ({rimHex = 0x0088ff, facingHex = 0x000000} = {}) => {
	const uniforms = {
		color1: { value: new THREE.Color(rimHex) },
		color2: { value: new THREE.Color(facingHex) },
		fresnelBias: { value: 0.1 },
		fresnelScale: { value: 1.0 },
		fresnelPower: { value: 4.0 },
	};

	const vs = `
		uniform float fresnelBias;
		uniform float fresnelScale;
		uniform float fresnelPower;
		
		varying float vReflectionFactor;
		
		void main() {
		  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
		
		  vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
		
		  vec3 I = worldPosition.xyz - cameraPosition;
		
		  vReflectionFactor = fresnelBias + fresnelScale * pow( 1.0 + dot( normalize( I ), worldNormal ), fresnelPower );
		
		  gl_Position = projectionMatrix * mvPosition;
		}`

	const fs = `
		uniform vec3 color1;
		uniform vec3 color2;
		
		varying float vReflectionFactor;
		
		void main() {
		  float f = clamp( vReflectionFactor, 0.0, 1.0 );
		  gl_FragColor = vec4(mix(color2, color1, vec3(f)), f);
		}`
		
	return new THREE.ShaderMaterial({
		uniforms: uniforms,
		vertexShader: vs,
		fragmentShader: fs,
		transparent: true,
		blending: THREE.AdditiveBlending,
	})
}

export const makeGlowMesh = (radius: number) => {
	const sphere = new THREE.SphereGeometry(radius, 80, 80); 
	const fresnelMat = createFresnelMaterial();
	return new THREE.Mesh(sphere, fresnelMat);
}

const getEarthColor = ({ lat, lon }: Geographic, ctx: TODO) => {
    const u = 1 - (lon + Math.PI) / (2 * Math.PI);
    const v = (lat + Math.PI / 2) / Math.PI;
    const x = Math.floor(u * ctx.canvas.width);
    const y = Math.floor(v * ctx.canvas.height);
    const pixel = ctx.getImageData(x, y, 1, 1).data;
	const r = pixel[0];
	const g = pixel[1];
	const b = pixel[2];
    // const raw = (r << 16) | (g << 8) | b
	return (r << 16) | (g << 8) | b
}

const rotateGeometry = (geo: ConvexGeometry & TODO) => {
	const rotMat1 = new THREE.Matrix4().makeRotationX(Math.PI / 2)
	geo.applyMatrix4(rotMat1)
	geo.vertsNeedUpdate = true
	return geo
}

const makeTileGeometry = (tile: Tile) => {
	const verts = 
		// TODO: for some reason this is required to prevent some hexes
		// from rendering from having too few vertices ??
		tile.vertices.map(setVertexHeight(1))
	const geo = rotateGeometry(new ConvexGeometry(verts))
	geo.computeVertexNormals()
	geo.castShadow = true
	geo.receiveShadow = true
	return geo 
}

const makeEarthMesh = (tiles: Array<Tile>): THREE.Object3D => {
	const img = document.getElementById("projection") as HTMLImageElement
	const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

	canvas.width = img.width;
    canvas.height = img.height;
	ctx?.drawImage(img, 0, 0, img.width, img.height)

	const earth = new THREE.Object3D()

	tiles.forEach((tile: Tile) => {
		const geo = makeTileGeometry(tile)
		const coord = cartesianToGeographic(tile.centroid)
		const color = getEarthColor(coord, ctx)
		const material = new THREE.MeshStandardMaterial({
			color, flatShading: true
		});
	
		const mesh = new THREE.Mesh(geo, material)
		mesh.castShadow = true
		mesh.layers.enable(1)
		earth.add(mesh)
	})

	return earth
}

export const getEarth = 
	(n: number, r: number): Promise<THREE.Object3D> =>
		fetch(`/people-2-still-peopling/geometries/goldberg_${n}_${r}.json`)
			.then(res => res.json())
			.then(data => data.map(({ center, vertices, facet, centroid }: Tile) => ({ 
				facet, center, centroid,
				vertices: vertices.map(v => new THREE.Vector3(...v)) 
			})))
			.catch(async () => await generateWorld(n, r))
			.then(tiles => makeEarthMesh(tiles))
			.catch(error => {
				console.log(error)
				return {} as THREE.Object3D
			})