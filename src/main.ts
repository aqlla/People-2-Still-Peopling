import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import Stats from 'three/addons/libs/stats.module.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { getEarth, makeGlowMesh } from './earth.js'

const uni = {
    n: 11,
    r: 25,
    fov: 5,
    scale: 1,
    atmo_scale: 1.0445,
    wireframe: false,
    flat_shading: false,
    outlines: false,
    moveSpeed: .4,
    rotationSpeed: .03,
    zoomSpeed: 12,
    rotateEarth: true,
    axialTiltX: 23.4,
    axialTiltY: 0,
}

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 0, 1);
const Z_AXIS = new THREE.Vector3(0, 1, 0);

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(uni.fov, window.innerWidth / window.innerHeight, 0.1, 5000)
camera.position.z = 150 + uni.r
camera.position.x = 20
camera.position.y = 0

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.listenToKeyEvents(window)
// controls.enableZoom = false

const sunLight = new THREE.DirectionalLight(0xffffff, 2);
sunLight.position.set(900, 0, 900);
sunLight.castShadow = true
scene.add(sunLight);

const helper = new THREE.DirectionalLightHelper(sunLight, 5);
scene.add(helper);

const stats = new Stats()
document.body.appendChild(stats.dom)

const earth = await getEarth(uni.n, uni.r);
const glowMesh = makeGlowMesh(uni.r)
glowMesh.scale.setScalar(uni.atmo_scale)
scene.add(earth!)
scene.add(glowMesh!)


const gui = new GUI()
const cameraFolder = gui.addFolder('Camera')
cameraFolder
    .add(camera, 'fov', 0.1, 100).listen()
    .onChange(() => camera.updateProjectionMatrix())

const camPositionFolder = cameraFolder.addFolder('Position')
camPositionFolder.add(camera.position, 'x', -180, 180).listen()
camPositionFolder.add(camera.position, 'y', -180, 180).listen()
camPositionFolder.add(camera.position, 'z', 0, 1000).listen()

const sunFolder = gui.addFolder('Sun')
sunFolder.add(sunLight, 'intensity', 0, 5).listen()

const sunPosFolder = sunFolder.addFolder('Position')
sunPosFolder.add(sunLight.position, 'x', uni.r + 10, 1000)
sunPosFolder.add(sunLight.position, 'y', uni.r + 10, 1000)
sunPosFolder.add(sunLight.position, 'z', uni.r + 10, 1000)
gui.close()

const earthFolder = gui.addFolder('Earth')
earthFolder.add(uni, 'atmo_scale', 1.0, 1.3).listen()
    .onChange((value: number) => glowMesh.scale.setScalar(value))
const earthRotFolder = earthFolder.addFolder('Rotation')
earthRotFolder.add(uni, 'rotateEarth').name('Enable').listen()
earthRotFolder.add(uni, 'rotationSpeed', -1, 1).name('Speed').listen()
earthRotFolder.add(earth.rotation, 'x', -180, 180).listen()
earthRotFolder.add(earth.rotation, 'y', -180, 180).listen()
earthRotFolder.add(earth.rotation, 'z', -180, 180).listen()


const raycaster = new THREE.Raycaster();
raycaster.layers.set(1)
const pointer = new THREE.Vector2();


const keys: Record<string, boolean> = {}

const fovConfig = {
    max: 50,
    min: 2
}

const radiusConfig = {
    max: 100,
    min: uni.r + 5
}

const viewState = {
    radius: 50,
    fov: uni.fov,
    theta: 90,
    phi: 90,
    target: new THREE.Vector3(0, 0, uni.r)
}


const clock = new THREE.Clock()
let delta: number

function animate() {
    delta = clock.getDelta()

    const zoomDelta = uni.zoomSpeed * delta
    const moveDelta = uni.moveSpeed * delta

    if (keys.a) viewState.theta += moveDelta
    if (keys.d) viewState.theta -= moveDelta
    if (keys.w) viewState.phi -= moveDelta
    if (keys.s) viewState.phi += moveDelta

    if (keys.r) { zoomCamera(zoomDelta, 1) }
    if (keys.f) { zoomCamera(zoomDelta, -1) }

    // Apply the modifier to either reduce or increase the FOV based on zoom direction
    viewState.fov = (viewState.radius - radiusConfig.min) 
        / (radiusConfig.max - radiusConfig.min) 
        // * (fovConfig.min - fovConfig.max) + fovConfig.max
        * (fovConfig.max - fovConfig.min) + fovConfig.min

    // camera.fov = fov + fovModifier * (maxFOV - fov);
    camera.fov = viewState.fov;

    const x = viewState.radius * Math.sin(viewState.phi) * Math.cos(viewState.theta);
    const y = viewState.radius * Math.cos(viewState.phi); // Y-axis for up/down tilt
    const z = viewState.radius * Math.sin(viewState.phi) * Math.sin(viewState.theta);

    camera.position.set(x, y, z);
    camera.lookAt(viewState.target)
    renderer.render(scene, camera)
    stats.update()
    camera.updateProjectionMatrix();

    requestAnimationFrame(animate)
}


animate()


const zoomCamera = (deltaZoom: number, direction: number) => {
    // Adjust the camera distance (radius) based on user input
    viewState.radius = Math.max(radiusConfig.min, 
        Math.min(radiusConfig.max, viewState.radius + (deltaZoom * direction)));
}

const locateCursorIntersects = () => {
    raycaster.setFromCamera(pointer, camera);
    // calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children)
    return intersects[0].point
}

window.addEventListener('click', () => {
    const target = locateCursorIntersects()

    for (let prop of ['x', 'y', 'z']) {
        viewState.target[prop] = target[prop]
    }
    console.log(target)
})

window.addEventListener('pointermove', (event: PointerEvent) => {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('keydown', (event) => {
    keys[event.key.toLowerCase()] = true;
}); 

document.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
