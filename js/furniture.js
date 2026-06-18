// ========== 家具模型（等距视角风格） ==========
class FurnitureBuilder {
    constructor(sceneManager) {
        this.sm = sceneManager;
        this.furnitureGroup = new THREE.Group();
        this.furnitureGroup.name = 'furniture';
        this.sm.scene.add(this.furnitureGroup);
        this.visible = true;
        this.sceneOrigin = { x: 4400, y: 5000 };
    }

    buildAll() {
        this.buildLivingRoom();
        this.buildBedroomA();
        this.buildBedroomB();
        this.buildKitchen();
        this.buildBathroom();
        this.buildBalcony();
        this.buildDining();
        this.buildEntrance();
    }

    toScene(x, y) {
        return {
            x: (x - this.sceneOrigin.x) / 1000,
            z: (y - this.sceneOrigin.y) / 1000,
        };
    }

    createBox(w, h, d, color, pos) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.6,
            metalness: 0.1,
            transparent: true,
            opacity: 0.9,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    createCylinder(rTop, rBot, h, color, pos) {
        const geo = new THREE.CylinderGeometry(rTop, rBot, h, 16);
        const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.5,
            metalness: 0.1,
            transparent: true,
            opacity: 0.9,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...pos);
        mesh.castShadow = true;
        return mesh;
    }

    buildLivingRoom() {
        const g = new THREE.Group();
        // 客厅中心：x:3200~8800, y:3200~8800 → 场景坐标约 (0, 0) 到 (4.4, 3.8)
        const ox = 1.5, oz = 0.5;

        // L型沙发
        g.add(this.createBox(2.2, 0.4, 0.8, 0x5a6a7a, [ox, 0.2, oz + 2.0]));
        g.add(this.createBox(2.2, 0.45, 0.12, 0x4a5a6a, [ox, 0.4, oz + 2.4]));
        g.add(this.createBox(0.8, 0.4, 0.8, 0x5a6a7a, [ox + 0.9, 0.2, oz + 1.6]));
        g.add(this.createBox(0.12, 0.45, 0.8, 0x4a5a6a, [ox + 1.3, 0.4, oz + 1.6]));

        // 茶几
        g.add(this.createBox(0.9, 0.35, 0.5, 0x8b7355, [ox + 0.1, 0.175, oz + 1.5]));

        // 电视柜
        g.add(this.createBox(1.6, 0.45, 0.35, 0x6b5a4a, [ox, 0.225, oz - 1.0]));
        // 电视
        g.add(this.createBox(1.1, 0.65, 0.04, 0x1a1a2e, [ox, 0.75, oz - 0.98]));

        this.furnitureGroup.add(g);
    }

    buildBedroomA() {
        const g = new THREE.Group();
        // 主卧中心：x:0~3200, y:4000~8800 → 场景坐标约 (-4.4, -1) 到 (-1.2, 3.8)
        const ox = -2.6, oz = 1.2;

        // 双人床
        g.add(this.createBox(1.8, 0.3, 2.0, 0xf5f0e8, [ox, 0.15, oz + 0.3]));
        g.add(this.createBox(1.8, 0.08, 2.0, 0x8b7355, [ox, 0.04, oz + 0.3]));
        g.add(this.createBox(1.8, 0.55, 0.1, 0x6b5a4a, [ox, 0.275, oz + 1.3]));

        // 床头柜
        g.add(this.createBox(0.4, 0.45, 0.35, 0x7a6a5a, [ox - 0.95, 0.225, oz + 0.8]));
        g.add(this.createBox(0.4, 0.45, 0.35, 0x7a6a5a, [ox + 0.95, 0.225, oz + 0.8]));

        // 衣柜（后墙）
        g.add(this.createBox(2.0, 2.2, 0.55, 0x5a4a3a, [ox, 1.1, oz - 1.5]));

        this.furnitureGroup.add(g);
    }

    buildBedroomB() {
        const g = new THREE.Group();
        // 次卧中心：x:0~3200, y:0~3200 → 场景坐标约 (-4.4, -5) 到 (-1.2, -1.8)
        const ox = -2.6, oz = -3.6;

        // 单人床
        g.add(this.createBox(1.5, 0.3, 1.8, 0xe8e0d8, [ox, 0.15, oz + 0.2]));
        g.add(this.createBox(1.5, 0.08, 1.8, 0x8b7355, [ox, 0.04, oz + 0.2]));
        g.add(this.createBox(1.5, 0.55, 0.1, 0x6b5a4a, [ox, 0.275, oz + 1.1]));

        // 床头柜
        g.add(this.createBox(0.35, 0.45, 0.35, 0x7a6a5a, [ox + 0.85, 0.225, oz + 0.7]));

        // 衣柜
        g.add(this.createBox(1.4, 2.2, 0.55, 0x5a4a3a, [ox, 1.1, oz - 0.8]));

        // 书桌（靠窗侧）
        g.add(this.createBox(0.9, 0.72, 0.45, 0x8b7355, [ox - 1.1, 0.36, oz + 0.2]));
        g.add(this.createBox(0.35, 0.42, 0.35, 0x6b5a47, [ox - 1.1, 0.21, oz - 0.3]));

        this.furnitureGroup.add(g);
    }

    buildKitchen() {
        const g = new THREE.Group();
        // 厨房中心：x:0~3200, y:3200~4000 → 场景坐标约 (-4.4, -1.8) 到 (-1.2, -1)
        const ox = -2.6, oz = -1.4;

        // L型橱柜
        g.add(this.createBox(2.4, 0.82, 0.52, 0xf5f0e8, [ox, 0.41, oz + 0.35]));
        g.add(this.createBox(2.4, 0.65, 0.28, 0xe8e0d8, [ox, 1.15, oz + 0.45]));
        g.add(this.createBox(0.52, 0.82, 1.0, 0xf5f0e8, [ox - 1.1, 0.41, oz - 0.1]));

        // 台面
        g.add(this.createBox(2.4, 0.035, 0.55, 0xd4d0c8, [ox, 0.84, oz + 0.35]));

        // 冰箱
        g.add(this.createBox(0.55, 1.75, 0.55, 0xc0c0c0, [ox + 1.05, 0.875, oz - 0.35]));

        this.furnitureGroup.add(g);
    }

    buildBathroom() {
        const g = new THREE.Group();
        // 卫生间中心：x:6800~8800, y:0~3200 → 场景坐标约 (2.4, -5) 到 (4.4, -1.8)
        const ox = 3.4, oz = -3.6;

        // 马桶
        g.add(this.createBox(0.38, 0.38, 0.52, 0xf5f5f5, [ox + 0.3, 0.19, oz - 0.5]));
        g.add(this.createBox(0.32, 0.18, 0.1, 0xf0f0f0, [ox + 0.3, 0.45, oz - 0.75]));

        // 浴室柜
        g.add(this.createBox(0.65, 0.75, 0.42, 0xe8e0d8, [ox - 0.25, 0.375, oz + 0.4]));

        // 淋浴区玻璃隔断
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.2,
            roughness: 0.1,
        });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.025), glassMat);
        glass.position.set(ox, 0.95, oz - 0.45);
        g.add(glass);

        this.furnitureGroup.add(g);
    }

    buildBalcony() {
        const g = new THREE.Group();
        // 客厅阳台中心：x:3200~8800, y:8800~10000 → 场景坐标约 (-1.2, 3.8) 到 (4.4, 5)
        const ox = 1.5, oz = 4.2;

        // 洗衣机
        g.add(this.createBox(0.55, 0.82, 0.52, 0xd0d0d0, [ox - 0.5, 0.41, oz]));

        // 洗衣机柜
        g.add(this.createBox(0.9, 0.85, 0.52, 0xe8e0d8, [ox - 0.35, 0.425, oz]));

        // 晾衣架
        g.add(this.createBox(1.1, 0.018, 0.018, 0xaaaaaa, [ox + 0.4, 2.2, oz]));

        this.furnitureGroup.add(g);
    }

    buildDining() {
        const g = new THREE.Group();
        // 餐厅中心：x:3200~6800, y:0~3200 → 场景坐标约 (-1.2, -5) 到 (2.4, -1.8)
        const ox = 0.5, oz = -3.4;

        // 餐桌
        g.add(this.createBox(1.1, 0.72, 0.65, 0x8b7355, [ox, 0.36, oz]));
        // 餐椅
        [[-0.35, 0], [0.35, 0], [-0.35, 0.45], [0.35, 0.45]].forEach(([dx, dz]) => {
            g.add(this.createBox(0.32, 0.42, 0.32, 0x6b5a47, [ox + dx, 0.21, oz + dz]));
        });

        this.furnitureGroup.add(g);
    }

    buildEntrance() {
        const g = new THREE.Group();
        // 玄关中心：x:6800~8800, y:3200~4200 → 场景坐标约 (2.4, -1.8) 到 (4.4, -0.8)
        const ox = 3.4, oz = -1.3;

        // 鞋柜
        g.add(this.createBox(0.9, 0.95, 0.28, 0x7a6a5a, [ox, 0.475, oz - 0.8]));

        this.furnitureGroup.add(g);
    }

    toggle() {
        this.visible = !this.visible;
        this.furnitureGroup.visible = this.visible;
        return this.visible;
    }
}
