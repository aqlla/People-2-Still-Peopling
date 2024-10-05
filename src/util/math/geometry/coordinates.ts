export type RadialObject = {
	readonly radius: number;
}

export type Radial<T> = RadialObject & T;

export type Cartesian2D = {
	readonly x: number;
	readonly y: number;
}

export type Cartesian3D = Cartesian2D & {
	readonly z: number;
}

export type Cartesian4D = Cartesian3D & {
	readonly w: number;
}

export type Spherical = Radial<{
	readonly phi: number;
	readonly theta: number;
}>

export type Geographic = {
	readonly lat: number;
	readonly lon: number;
}


export const cartesianToSpherical = 
	({ x, y, z }: Cartesian3D): Spherical => {
		const radius = Math.sqrt(x * x + y * y + z * z);
		const theta = Math.acos(z / radius);
		const phi = Math.atan2(y, x);

		return { radius, theta, phi };
	}


export const cartesianToGeographic = 
	({ x, y, z }: Cartesian3D): Radial<Geographic> => {
		const radius = Math.sqrt(x * x + y * y + z * z);
		const lat = Math.asin(z / radius);
		const lon = Math.atan2(y, x);

		return { lat, lon, radius };
	}


export const sphericalToCartesian = 
	({ radius, theta, phi }: Spherical): Cartesian3D => {
		const x = radius * Math.sin(theta) * Math.cos(phi);
		const y = radius * Math.sin(theta) * Math.sin(phi);
		const z = radius * Math.cos(theta);

		return { x, y, z };
	}