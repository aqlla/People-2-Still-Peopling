import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js'
import { groupFaces, toJson, OVec3, Tile } from './goldberg.ts';
import { saveAs } from 'file-saver';
import { toIndexed } from './BufferGeometryToIndexed.js'

const sizes = [
	2, 5, 8, 11, 14, 17, 23, 29, 32, 35, 44, 56, 68, 89
]

type SphericalCoord = {
	r: number,
	phi: number,
	theta: number
}

type LatLon = {
	lat: number,
	lon: number
}

type TODO = any

const WIREFRAME = false
const FLAT_SHADING = false


const makeEdgeGeometry = (geo: THREE.BufferGeometry) => new THREE.LineSegments(
	new THREE.EdgesGeometry(geo), 
	new THREE.LineBasicMaterial({ color: 0x080808 }));

	
const cartesianToSpherical = ({ x, y, z }: OVec3) => {
	const r = Math.sqrt(x * x + y * y + z * z);
    const theta = Math.acos(z / r);
    const phi = Math.atan2(y, x);
    return { r, theta, phi };
}

const sphericalToCartesian = ({ r, theta, phi }: SphericalCoord) => {
	const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);
    return { x, y, z };
}

const cartesianToLatLon = ({ x, y, z }: OVec3) => {
    const r = Math.sqrt(x * x + y * y + z * z);
    const lat = Math.asin(z / r);
    const lon = Math.atan2(y, x);
    return { lat, lon };
}

const setVertexHeight = (height: number) => (vert: OVec3) => {
	const spherical = cartesianToSpherical(vert);
	spherical.r += height
	const { x, y, z } = sphericalToCartesian(spherical)
	return new THREE.Vector3(x, y, z)
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


const generateWorld = async (n: number, r: number) => {
	console.log(`Generating Goldberg... n=${n}, r=${r}`)
	const ico = toIndexed(new THREE.IcosahedronGeometry(r, n))(true, 6)
	// ico.computeVertexNormals()
	console.log(ico)
	const tiles = groupFaces(ico);
	const blob = new Blob([toJson(tiles)], { type: 'application/json' })
	await saveAs(blob, `./geometries/goldberg_${n}_${r}.json`)
	return tiles
}



const isWater = (hexValue: number): boolean => {
	const threshG = 5
	const threshR = 9
    // Ensure the hex value is a valid number
    if (hexValue < 0x000000 || hexValue > 0xFFFFFF) {
        return false
    }

    // Extract the red, green, and blue components
    const r = (hexValue >> 16) & 0xFF;
    const g = (hexValue >> 8) & 0xFF;
    const b = hexValue & 0xFF;

    return hexValue < 200000 || (b - r > threshR && b - g > threshG)
	// return (b - r > threshR && b - g > threshG)
}



const getEarthColor = ({ lat, lon }: LatLon, ctx: TODO) => {
    const u = 1 - (lon + Math.PI) / (2 * Math.PI);
    const v = (lat + Math.PI / 2) / Math.PI;
    const x = Math.floor(u * ctx.canvas.width);
    const y = Math.floor(v * ctx.canvas.height);
    const pixel = ctx.getImageData(x, y, 1, 1).data;
	const r = pixel[0];
	const g = pixel[1];
	const b = pixel[2];

    const raw = (r << 16) | (g << 8) | b
	// return isWater(raw)? 0x0040cc : raw
	return (r << 16) | (g << 8) | b
}

const rotateGeometry = (geo: ConvexGeometry & TODO) => {
	const rotMat1 = new THREE.Matrix4().makeRotationX(Math.PI / 2)
	geo.applyMatrix4(rotMat1)
	geo.vertsNeedUpdate = true
	return geo
}

const makeTileGeometry = (tile: Tile) => {
	const height = 1; //Math.random() * 1.5
	const verts = tile.vertices.map(setVertexHeight(height))
	const geo = rotateGeometry(new ConvexGeometry(verts))
	geo.computeVertexNormals()
	geo.castShadow = true
	geo.receiveShadow = true
	return geo 
}


const tileMap = new Map<string, { tile: Tile, color: number }>()

export const getTileMap = () => tileMap


const makeEarthMeshes = (tiles: Array<Tile>, radius: number) => {
	const img = document.getElementById("projection") as HTMLImageElement
	const canvas = document.createElement('canvas')
	canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
	ctx?.drawImage(img, 0, 0, img.width, img.height)

	const earth = new THREE.Object3D()
	const outlines = new THREE.Object3D()

	tiles.forEach(tile => {
		const geo = makeTileGeometry(tile)
		const coord = cartesianToLatLon(tile.centroid)
		const color = getEarthColor(coord, ctx)
		const material = new THREE.MeshStandardMaterial({
			color,
			flatShading: FLAT_SHADING,
			wireframe: WIREFRAME,
		});
	
		const mesh = new THREE.Mesh(geo, material)
		tileMap.set(mesh.uuid, { tile, color })
		mesh.castShadow = true
		mesh.layers.enable(1)
		earth.add(mesh)
	
		outlines.add(makeEdgeGeometry(geo))
	})

	const geo2 = new THREE.SphereGeometry(radius, 80, 80); 
	const fresnelMat = createFresnelMaterial();
	const glowMesh = new THREE.Mesh(geo2, fresnelMat);
	

	return {
		glowMesh, earth, outlines
	}
}


type EarthMeshes = Record<string, THREE.Object3D>

export const getEarth = (n: number, r: number): Promise<EarthMeshes> =>
	fetch(`/orsons-beetles/geometries/goldberg_${n}_${r}.json`)
		.then(res => res.json())
		.then(data => data.map(({ center, vertices, facet, centroid }: Tile) => ({ 
			facet, center, centroid,
			vertices: vertices.map(v => new THREE.Vector3(...v)) 
		})))
		.catch(async () => await generateWorld(n, r))
		.then(tiles => makeEarthMeshes(tiles, r))
		.catch(error => {
			console.log(error)
			return {}
		})
