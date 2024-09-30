import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import Stats from 'three/addons/libs/stats.module.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { getEarth, getTileMap } from './earth.js'
import { Tile } from './goldberg.js'

const uni = {
    n: 89,
    r: 25,
    fov: 5,
    scale: 1,
    atmo_scale: 1.0445,
    wireframe: false,
    flat_shading: false,
    outlines: false,
    moveSpeed: .01,
    rotationSpeed: .03,
    zoomSpeed: .5,
    rotateEarth: true,
    axialTiltX: 23.4,
    axialTiltY: 0,
}

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(uni.fov, window.innerWidth / window.innerHeight, 0.1, 5000)
camera.position.z = 344 + uni.r
camera.position.x = -69
camera.position.y = 15

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
// controls.screenSpacePanning = true
controls.listenToKeyEvents(window)

const sunLight = new THREE.DirectionalLight(0xffffff, 2);
sunLight.position.set(900, 0, 900);
sunLight.castShadow = true
scene.add(sunLight);

const helper = new THREE.DirectionalLightHelper(sunLight, 5);
scene.add(helper);

const stats = new Stats()
document.body.appendChild(stats.dom)

const gui = new GUI()

// const ocFolder = gui.addFolder('Orbital Controls')
// ocFolder.add(uni, 'moveSpeed', 0.01, 0.5).listen()
// const cPosFolder = ocFolder.addFolder('Target')
// cPosFolder.add(controls.target, 'x', -uni.r, uni.r).listen()
// cPosFolder.add(controls.target, 'y', -uni.r, uni.r).listen()
// cPosFolder.add(controls.target, 'z', -uni.r, uni.r).listen()

const cameraFolder = gui.addFolder('Camera')
cameraFolder.add(camera, 'fov', 0.1, 100).listen().onChange(() => {
    camera.updateProjectionMatrix()
})

const camPositionFolder = cameraFolder.addFolder('Position')
camPositionFolder.add(camera.position, 'x', -180, 180).listen()
camPositionFolder.add(camera.position, 'y', -180, 180).listen()
camPositionFolder.add(camera.position, 'z', 0, 1000).listen()

// cameraFolder.open()

const sunFolder = gui.addFolder('Sun')
sunFolder.add(sunLight, 'intensity', 0, 5).listen()
const sunPosFolder = sunFolder.addFolder('Position')
sunPosFolder.add(sunLight.position, 'x', uni.r + 10, 1000)
sunPosFolder.add(sunLight.position, 'y', uni.r + 10, 1000)
sunPosFolder.add(sunLight.position, 'z', uni.r + 10, 1000)
gui.close()

const raycaster = new THREE.Raycaster();
raycaster.layers.set(1)
const pointer = new THREE.Vector2();


const onPointerMove = (event: PointerEvent) => {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}


let tileMap
let prevIntersect: THREE.Mesh
let prevSelected: string


const onclick = (event: MouseEvent) => {
    console.log(event)
    if (!!prevSelected) {
        console.log(tileMap.get(prevSelected))
    }
}

const keys: Record<string, boolean> = { w: false, a: false, s: false, d: false };
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 0, 1);
const Z_AXIS = new THREE.Vector3(0, 1, 0);


getEarth(uni.n, uni.r)
    .then(({ earth, outlines, glowMesh }) => {
        let curAxialTiltX = uni.axialTiltX
        let curAxialTiltY = uni.axialTiltY
        glowMesh.scale.setScalar(uni.atmo_scale)

        tileMap = getTileMap()

        scene.add(earth!)
        scene.add(glowMesh!)

        const earthFolder = gui.addFolder('Earth')
        earthFolder
            .add(uni, 'axialTiltX', -23.4, 23.4)
            .listen()
            .onChange((value: number) => {
                const delta = curAxialTiltX - value
                earth.rotateOnAxis(X_AXIS, delta * Math.PI / 180)
                outlines.rotateOnAxis(X_AXIS, delta * Math.PI / 180)
                curAxialTiltX = uni.axialTiltX
            })
        earthFolder
            .add(uni, 'axialTiltY', -23.4, 23.4)
            .listen()
            .onChange((value: number) => {
                const delta = curAxialTiltY - value
                earth.rotateOnWorldAxis(Y_AXIS, delta * Math.PI / 180)
                outlines.rotateOnWorldAxis(Y_AXIS, delta * Math.PI / 180)
                curAxialTiltY = uni.axialTiltY
            })

        earthFolder
            .add(uni, 'outlines')
            .listen()
            .onChange((value: boolean) => {
                if (value) {
                    scene.add(outlines)
                } else {
                    scene.remove(outlines)
                }
            })
        earthFolder.add(uni, 'atmo_scale', 1.0, 1.3)
            .listen()
            .onChange((value: number) => glowMesh.scale.setScalar(value))

        const earthRotFolder = earthFolder.addFolder('Rotation')
        earthRotFolder.add(uni, 'rotateEarth').name('Enable').listen()
        earthRotFolder.add(uni, 'rotationSpeed', -1, 1).name('Speed').listen()
        earthRotFolder.add(earth.rotation, 'x', -180, 180).listen()
        earthRotFolder.add(earth.rotation, 'y', -180, 180).listen()
        earthRotFolder.add(earth.rotation, 'z', -180, 180).listen()


        const clock = new THREE.Clock()
        let delta

        function animate() {
            delta = clock.getDelta()

            if (uni.rotateEarth) {
                earth.rotation.y += uni.rotationSpeed * delta

                if (uni.outlines) {
                    outlines.rotation.y += uni.rotationSpeed * delta
                }
            }

            if (keys.a) camera.position.applyAxisAngle(camera.up, -uni.moveSpeed)
            if (keys.d) camera.position.applyAxisAngle(camera.up, uni.moveSpeed)
            if (keys.w) camera.position.applyAxisAngle(X_AXIS, -uni.moveSpeed)
            if (keys.s) camera.position.applyAxisAngle(X_AXIS, uni.moveSpeed)

            // raycaster.setFromCamera(pointer, camera);

            // // calculate objects intersecting the picking ray
            // const intersects = raycaster.intersectObjects(scene.children)

            // if (tileMap && intersects.length) {
            //     const prevVal = tileMap.get(prevIntersect?.uuid)
            //     if (prevVal) {
            //         prevIntersect.material.color.set(prevVal.color)
            //     }

            //     const uuid = intersects[0].object.uuid
            //     if (tileMap.has(uuid)) {
            //         if (uuid !== prevSelected) {
            //             prevSelected = uuid
            //         }
            //         (intersects[0].object as THREE.Mesh).material. //.color.set(0xff0000)
            //     }
            //     prevIntersect = intersects[0].object as THREE.Mesh
            // }

            camera.lookAt(0, 0, 0)
            renderer.render(scene, camera)
            stats.update()
            requestAnimationFrame(animate)
        }

        animate()
    })


window.addEventListener('click', onclick)
window.addEventListener('pointermove', onPointerMove);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
        uni.rotateEarth = !uni.rotateEarth
    }
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

