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
        this.sceneOrigin = { x: 4400, y: 5000 };
    }

    toScene(x, y) {
        return {
            x: (x - this.sceneOrigin.x) / 1000,
            z: (y - this.sceneOrigin.y) / 1000,
        };
    }

    buildAll() {
        this.buildLivingLights();
        this.buildBedroomALights();
        this.buildBedroomBLights();
        this.buildKitchenLights();
        this.buildBathroomLights();
        this.buildDiningLights();
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
                fixtureGeo = new THREE.BoxGeometry(1.8, 0.02, 0.04);
                break;
            case 'pendant':
                fixtureGeo = new THREE.SphereGeometry(0.1, 16, 16);
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

        const coneGeo = new THREE.ConeGeometry(0.7, 2.2, 16, 1, true);
        const coneMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set(pos[0], pos[1] - 1.1, pos[2]);
        this.lightsGroup.add(cone);

        this.lights.push({ fixture, light, cone, pos, type, color, intensity });
    }

    buildLivingLights() {
        // 客厅中心：x:6000, y:6000 → 场景 (1.6, 1.0)
        const ox = 1.6, oz = 1.0;
        // 主灯
        this.createLightFixture([ox, 2.7, oz], 'pendant', 0xfff5e6, 1.4);
        // 筒灯
        const downlightPos = [
            [ox - 1.2, 2.75, oz - 1.0],
            [ox - 1.2, 2.75, oz + 1.2],
            [ox + 1.2, 2.75, oz - 1.0],
            [ox + 1.2, 2.75, oz + 1.2],
            [ox, 2.75, oz - 1.8],
            [ox, 2.75, oz + 1.8],
        ];
        downlightPos.forEach(p => this.createLightFixture(p, 'downlight', 0xfff8ee, 0.7));
        // 灯带
        this.createLightFixture([ox, 2.72, oz - 2.2], 'strip', 0xffe4b5, 0.4);
    }

    buildBedroomALights() {
        // 主卧中心：x:1600, y:6400 → 场景 (-2.8, 1.4)
        const ox = -2.8, oz = 1.4;
        this.createLightFixture([ox, 2.7, oz], 'ceiling', 0xfff5e6, 1.1);
        // 床头灯
        this.createLightFixture([ox - 0.85, 1.15, oz + 0.8], 'pendant', 0xffd699, 0.35);
        this.createLightFixture([ox + 0.85, 1.15, oz + 0.8], 'pendant', 0xffd699, 0.35);
    }

    buildBedroomBLights() {
        // 次卧中心：x:1600, y:1600 → 场景 (-2.8, -3.4)
        const ox = -2.8, oz = -3.4;
        this.createLightFixture([ox, 2.7, oz], 'ceiling', 0xfff5e6, 0.9);
    }

    buildKitchenLights() {
        // 厨房中心：x:1600, y:3600 → 场景 (-2.8, -1.4)
        const ox = -2.8, oz = -1.4;
        this.createLightFixture([ox, 2.7, oz], 'ceiling', 0xffffff, 0.9);
        // 操作台灯
        this.createLightFixture([ox, 2.72, oz + 0.35], 'strip', 0xffffff, 0.5);
    }

    buildBathroomLights() {
        // 卫生间中心：x:7800, y:1600 → 场景 (3.4, -3.4)
        const ox = 3.4, oz = -3.4;
        this.createLightFixture([ox, 2.7, oz], 'ceiling', 0xffffff, 0.7);
        // 镜前灯
        this.createLightFixture([ox - 0.25, 1.55, oz + 0.4], 'strip', 0xfff8ee, 0.35);
    }

    buildDiningLights() {
        // 餐厅中心：x:5000, y:1600 → 场景 (0.6, -3.4)
        const ox = 0.6, oz = -3.4;
        this.createLightFixture([ox, 2.7, oz], 'pendant', 0xfff5e6, 0.8);
    }

    setMode(mode) {
        this.currentMode = mode;
        const presets = {
            daily: { ambient: 0.45, lightMul: 1.0, coneOpacity: 0.05 },
            movie: { ambient: 0.12, lightMul: 0.3, coneOpacity: 0.02 },
            party: { ambient: 0.22, lightMul: 0.8, coneOpacity: 0.07 },
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
            if (c instanceof THREE.AmbientLight) c.intensity = this.enabled ? 0.45 : 0.8;
        });
        return this.enabled;
    }

    toggleCones() {
        this.lights.forEach(l => {
            l.cone.visible = !l.cone.visible;
        });
    }
}
