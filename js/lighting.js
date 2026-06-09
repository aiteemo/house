// ========== 灯光方案可视化 ==========
class LightingManager {
    constructor(sceneManager) {
        this.sm = sceneManager;
        this.lightsGroup = new THREE.Group();
        this.lightsGroup.name = 'lighting';
        this.sm.scene.add(this.lightsGroup);
        this.lights = [];
        this.enabled = true;
        this.currentMode = 'daily';
    }

    buildAll() {
        this.buildLivingLights();
        this.buildBedroomALights();
        this.buildBedroomBLights();
        this.buildKitchenLights();
        this.buildBathroomLights();
        this.buildHallwayLights();
        this.setMode('daily');
    }

    createLightFixture(pos, type, color, intensity) {
        let fixtureGeo;
        switch (type) {
            case 'ceiling':
                fixtureGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.08, 16);
                break;
            case 'downlight':
                fixtureGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12);
                break;
            case 'strip':
                fixtureGeo = new THREE.BoxGeometry(2.0, 0.02, 0.05);
                break;
            case 'pendant':
                fixtureGeo = new THREE.SphereGeometry(0.12, 16, 16);
                break;
            default:
                fixtureGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.06, 12);
        }
        const fixtureMat = new THREE.MeshStandardMaterial({
            color: 0xfffae6,
            emissive: color,
            emissiveIntensity: 0.8,
            roughness: 0.3,
        });
        const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
        fixture.position.set(...pos);
        this.lightsGroup.add(fixture);

        let light;
        if (type === 'strip') {
            light = new THREE.PointLight(color, intensity, 4, 2);
            light.position.set(...pos);
        } else if (type === 'downlight') {
            light = new THREE.SpotLight(color, intensity, 5, Math.PI / 6, 0.5, 2);
            light.position.set(...pos);
            light.target.position.set(pos[0], 0, pos[2]);
            this.sm.scene.add(light.target);
        } else {
            light = new THREE.PointLight(color, intensity, 8, 2);
            light.position.set(...pos);
        }
        light.castShadow = false;
        this.lightsGroup.add(light);

        const coneGeo = new THREE.ConeGeometry(0.8, 2.5, 16, 1, true);
        const coneMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.06,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set(pos[0], pos[1] - 1.25, pos[2]);
        this.lightsGroup.add(cone);

        this.lights.push({ fixture, light, cone, pos, type, color, intensity });
    }

    buildLivingLights() {
        const ox = 1.127, oz = 0.469;
        // 主灯
        this.createLightFixture([ox, 2.75, oz + 0.5], 'pendant', 0xfff5e6, 1.5);
        // 筒灯
        const downlightPos = [
            [ox - 1.2, 2.78, oz - 1.0],
            [ox - 1.2, 2.78, oz + 1.5],
            [ox + 0.8, 2.78, oz - 1.0],
            [ox + 0.8, 2.78, oz + 1.5],
            [ox, 2.78, oz - 2.0],
            [ox, 2.78, oz + 2.5],
            [ox + 1.2, 2.78, oz - 0.3],
            [ox + 1.2, 2.78, oz + 0.8],
        ];
        downlightPos.forEach(p => this.createLightFixture(p, 'downlight', 0xfff8ee, 0.8));
        // 灯带
        this.createLightFixture([ox, 2.76, oz - 2.5], 'strip', 0xffe4b5, 0.5);
    }

    buildBedroomALights() {
        const ox = -1.845, oz = 1.619;
        this.createLightFixture([ox, 2.75, oz + 0.3], 'ceiling', 0xfff5e6, 1.2);
        // 床头灯
        this.createLightFixture([ox - 0.9, 1.2, oz + 1.0], 'pendant', 0xffd699, 0.4);
        this.createLightFixture([ox + 0.9, 1.2, oz + 1.0], 'pendant', 0xffd699, 0.4);
    }

    buildBedroomBLights() {
        const ox = -1.845, oz = -2.380;
        this.createLightFixture([ox, 2.75, oz + 0.3], 'ceiling', 0xfff5e6, 1.0);
    }

    buildKitchenLights() {
        const ox = -1.845, oz = -0.620;
        this.createLightFixture([ox, 2.75, oz], 'ceiling', 0xffffff, 1.0);
        // 操作台灯
        this.createLightFixture([ox, 2.76, oz + 0.4], 'strip', 0xffffff, 0.6);
    }

    buildBathroomLights() {
        const ox = 2.776, oz = -2.398;
        this.createLightFixture([ox, 2.75, oz], 'ceiling', 0xffffff, 0.8);
        // 镜前灯
        this.createLightFixture([ox - 0.3, 1.6, oz + 0.5], 'strip', 0xfff8ee, 0.4);
    }

    buildHallwayLights() {
        const ox = 1.371, oz = -2.398;
        this.createLightFixture([ox, 2.75, oz - 0.8], 'downlight', 0xfff8ee, 0.6);
        this.createLightFixture([ox, 2.75, oz + 0.5], 'downlight', 0xfff8ee, 0.6);
    }

    setMode(mode) {
        this.currentMode = mode;
        const presets = {
            daily: { ambient: 0.4, lightMul: 1.0, coneOpacity: 0.06 },
            movie: { ambient: 0.1, lightMul: 0.3, coneOpacity: 0.02 },
            party: { ambient: 0.2, lightMul: 0.8, coneOpacity: 0.08 },
        };
        const p = presets[mode] || presets.daily;

        this.sm.scene.children.forEach(c => {
            if (c instanceof THREE.AmbientLight) c.intensity = p.ambient;
        });

        this.lights.forEach(l => {
            l.light.intensity = l.intensity * p.lightMul;
            l.fixture.material.emissiveIntensity = 0.8 * p.lightMul;
            l.cone.material.opacity = p.coneOpacity;
        });
    }

    toggle() {
        this.enabled = !this.enabled;
        this.lightsGroup.visible = this.enabled;
        this.sm.scene.children.forEach(c => {
            if (c instanceof THREE.AmbientLight) c.intensity = this.enabled ? 0.4 : 0.8;
        });
        return this.enabled;
    }

    toggleCones() {
        this.lights.forEach(l => {
            l.cone.visible = !l.cone.visible;
        });
    }
}
