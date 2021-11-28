import {View} from "./view";
import {
    Color,
    DirectionalLight, Mesh, MeshPhysicalMaterial, PlaneBufferGeometry,
    PMREMGenerator, Raycaster, ShadowMaterial, SphereBufferGeometry,
    UnsignedByteType,
    Vector2,
    WebGLRenderer
} from "three";
import {RGBELoader} from "three/examples/jsm/loaders/RGBELoader";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader";

export default class ProductView extends View {
    controls: OrbitControls;
    raycaster: Raycaster;
    mouse: Vector2;
    light: DirectionalLight;

    shadowPlaneGeometry: PlaneBufferGeometry;
    shadowPlaneMaterial: ShadowMaterial;
    shadowPlaneMesh: Mesh;

    colors : Color[] = [
        new Color("rgb(255,0,0)"),
        new Color("rgb(242,122,16)"),
        new Color( "rgb(255,235,0)"),
        new Color("rgb(0,255,0)"),
        new Color("rgb(0,0,255)"),
        new Color("rgb(94,15,215)"),
        new Color( "rgb(224,109,231)")];
    colorPickerGeometry: SphereBufferGeometry;

    constructor(renderer: WebGLRenderer, gltfPath: string) {
        super(renderer);

        this._renderer.shadowMap.enabled = true;

        this.raycaster = new Raycaster();
        this.mouse = new Vector2(0,0);

        this.light = new DirectionalLight(0xffffff);
        this.light.add(this.light.target);
        this.light.position.set(0, 0, 0);
        this.light.target.position.set(10, -12, -12);

        this.light.shadow.mapSize.set(1024,1024);
        this.light.shadow.camera.near = -5;
        this.light.shadow.camera.far = 8;
        this.light.castShadow = true;

        this.shadowPlaneGeometry = new PlaneBufferGeometry(100,100);
        this.shadowPlaneMaterial = new ShadowMaterial();
        this.shadowPlaneMesh = new Mesh(this.shadowPlaneGeometry, new ShadowMaterial());
        this.shadowPlaneMesh.position.set(0, -2,0);
        this.shadowPlaneMesh.rotation.x =  - Math.PI / 2;
        this.shadowPlaneMesh.name = "Shadow"
        this.shadowPlaneMesh.receiveShadow = true;

        this.colorPickerGeometry = new SphereBufferGeometry(0.4)

        for (let idx = 0; idx < 7; idx++) {
            let mesh = new Mesh(this.colorPickerGeometry, new MeshPhysicalMaterial({metalness: 0.2, roughness: 0.1}))
            mesh.position.set(5, idx, 0)
            mesh.material.color.set(this.colors[idx])
            mesh.name = "Picker"
            this._scene.add(mesh)
        }

        //TODO remove
        gltfPath = 'assets/models/LittlestTokyo.glb';

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( 'lib/draco/' );

        const loaderGLTF = new GLTFLoader();
        loaderGLTF.setDRACOLoader(dracoLoader);
        loaderGLTF.load(
            gltfPath,
            (gltf) => {
                const model = gltf.scene;
                model.position.set(0,0,0)
                model.scale.set( 0.01, 0.01, 0.01 )
                model.castShadow = true

                model.traverse((child) => {
                    if (child instanceof Mesh) {
                        child.material.color = this.colors[0];
                        child.castShadow = true;
                    }
                });

                this._scene.add(model)
            },
            undefined,
            (err) => console.error(err)
        );

        this.controls = new OrbitControls(this._cam, this._renderer.domElement) as OrbitControls;

        const pmremGenerator = new PMREMGenerator(this._renderer);
        pmremGenerator.compileEquirectangularShader();
        const hdrTexture = new RGBELoader()
            .setDataType(UnsignedByteType)
            .load('assets/env/market.hdr', () => {
                const target = pmremGenerator.fromEquirectangular(hdrTexture);
                this._scene.environment = target.texture;
                this._scene.background = target.texture;
            });

        this._scene.add( this.shadowPlaneMesh, this.light)

        //TODO arrow left tight to change mesh

    }

    public initialize() {
        super.initialize()

        const catalogButton = document.getElementById('catalog');
        if (catalogButton) {
            catalogButton.style.visibility = 'visible'
        }
        const previousButton = document.getElementById('previous');
        if (previousButton) {
            previousButton.style.visibility = 'visible'
        }
        const nextButton = document.getElementById('next');
        if (nextButton) {
            nextButton.style.visibility = 'visible'
        }

        this._renderer.domElement.addEventListener( 'click', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this._cam)
            const intersection = this.raycaster.intersectObject(this._scene, true)
            if (intersection && intersection.length > 0) {
                if (intersection[0].object instanceof Mesh && intersection[0].object.name == "Picker") {
                    const newColor = intersection[0].object.material.color;
                    this.traverseScene(newColor);
                }
            }

        });

        const itemTitle = document.getElementById('item_title');
        if (itemTitle) {
            itemTitle.style.visibility = 'hidden'
        }

        this._gui.hide()
    }

    public destroy() {
        super.destroy();

        this.light.dispose()
        this.shadowPlaneGeometry.dispose()
        this.shadowPlaneMaterial.dispose()

        this.colorPickerGeometry.dispose()
    }

    public update(delta: number, elapsed: number) {

        this.controls.update();
    }

    public traverseScene(color: Color) {
        this._scene.traverse((object) => {
            if (object instanceof Mesh && object.name != "Picker" && object.name != "Shadow") {
                object.material.color = color;
            }
        });
    }
}
