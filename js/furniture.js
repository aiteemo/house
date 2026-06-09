// ========== 家具模型 ==========
class FurnitureBuilder {
    constructor(sceneManager) {
        this.sm = sceneManager;
        this.furnitureGroup = new THREE.Group();
        this.furnitureGroup.name = 'furniture';
        this.sm.scene.add(this.furnitureGroup);
        this.visible = true;
    }

    buildAll() {
        this.buildLivingRoom();
        this.buildBedroomA();
        this.buildBedroomB();
        this.buildKitchen();
        this.buildBathroom();
        this.buildBalcony();
        this.buildHallway();
    }

    createBox(w, h, d, color, pos) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    createCylinder(rTop, rBot, h, color, pos) {
        const geo = new THREE.CylinderGeometry(rTop, rBot, h, 16);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...pos);
        mesh.castShadow = true;
        return mesh;
    }

    buildLivingRoom() {
        const g = new THREE.Group();
        const ox = 1.127, oz = 0.469;

        // L型沙发
        g.add(this.createBox(2.4, 0.45, 0.9, 0x4a5568, [ox - 0.3, 0.225, oz + 2.4]));
        g.add(this.createBox(2.4, 0.5, 0.15, 0x3d4555, [ox - 0.3, 0.45, oz + 2.85]));
        g.add(this.createBox(0.9, 0.45, 0.9, 0x4a5568, [ox + 1.0, 0.225, oz + 1.95]));
        g.add(this.createBox(0.15, 0.5, 0.9, 0x3d4555, [ox + 1.45, 0.45, oz + 1.95]));

        // 茶几
        g.add(this.createBox(1.0, 0.4, 0.5, 0x8b6f47, [ox + 0.1, 0.2, oz + 1.6]));

        // 电视柜
        g.add(this.createBox(1.8, 0.5, 0.35, 0x5a4a3a, [ox, 0.25, oz - 1.3]));
        // 电视
        g.add(this.createBox(1.2, 0.7, 0.05, 0x1a1a2e, [ox, 0.85, oz - 1.27]));

        // 餐桌
        g.add(this.createBox(1.2, 0.75, 0.7, 0x8b6f47, [ox - 0.7, 0.375, oz - 0.3]));
        [[-0.4, 0], [0.4, 0], [-0.4, 0.5], [0.4, 0.5]].forEach(([dx, dz]) => {
            g.add(this.createBox(0.35, 0.45, 0.35, 0x6b5a47, [ox - 0.7 + dx, 0.225, oz - 0.3 + dz]));
        });

        // 水吧台（厨房门口附近）
        g.add(this.createBox(1.2, 0.9, 0.5, 0x5a6a7a, [ox - 1.2, 0.45, oz - 1.6]));
        g.add(this.createCylinder(0.15, 0.15, 0.65, 0x6b5a47, [ox - 1.5, 0.325, oz - 1.1]));
        g.add(this.createCylinder(0.15, 0.15, 0.65, 0x6b5a47, [ox - 0.9, 0.325, oz - 1.1]));

        this.furnitureGroup.add(g);
    }

    buildBedroomA() {
        const g = new THREE.Group();
        const ox = -1.845, oz = 1.619;

        // 双人床
        g.add(this.createBox(1.8, 0.35, 2.0, 0xf5f0e8, [ox, 0.175, oz + 0.5]));
        g.add(this.createBox(1.8, 0.1, 2.0, 0x8b6f47, [ox, 0.05, oz + 0.5]));
        g.add(this.createBox(1.8, 0.6, 0.1, 0x6b5a47, [ox, 0.3, oz + 1.5]));

        // 床头柜
        g.add(this.createBox(0.45, 0.5, 0.4, 0x7a6a5a, [ox - 0.9, 0.25, oz + 1.0]));
        g.add(this.createBox(0.45, 0.5, 0.4, 0x7a6a5a, [ox + 0.9, 0.25, oz + 1.0]));

        // 衣柜（后墙）
        g.add(this.createBox(2.0, 2.2, 0.6, 0x5a4a3a, [ox, 1.1, oz - 1.8]));

        // 梳妆台（左侧靠窗）
        g.add(this.createBox(0.8, 0.75, 0.4, 0x8b6f47, [ox - 1.3, 0.375, oz + 0.5]));

        this.furnitureGroup.add(g);
    }

    buildBedroomB() {
        const g = new THREE.Group();
        const ox = -1.845, oz = -2.380;

        // 单人床
        g.add(this.createBox(1.5, 0.35, 1.8, 0xe8e0d8, [ox, 0.175, oz + 0.3]));
        g.add(this.createBox(1.5, 0.1, 1.8, 0x8b6f47, [ox, 0.05, oz + 0.3]));
        g.add(this.createBox(1.5, 0.6, 0.1, 0x6b5a47, [ox, 0.3, oz + 1.2]));

        // 床头柜
        g.add(this.createBox(0.4, 0.5, 0.4, 0x7a6a5a, [ox + 0.8, 0.25, oz + 0.8]));

        // 衣柜
        g.add(this.createBox(1.5, 2.2, 0.6, 0x5a4a3a, [ox, 1.1, oz - 0.9]));

        // 书桌（靠窗侧）
        g.add(this.createBox(1.0, 0.75, 0.5, 0x8b6f47, [ox - 1.2, 0.375, oz + 0.3]));
        g.add(this.createBox(0.4, 0.45, 0.4, 0x6b5a47, [ox - 1.2, 0.225, oz - 0.2]));

        this.furnitureGroup.add(g);
    }

    buildKitchen() {
        const g = new THREE.Group();
        const ox = -1.845, oz = -0.620;

        // L型橱柜
        g.add(this.createBox(2.5, 0.85, 0.55, 0xf5f0e8, [ox, 0.425, oz + 0.45]));
        g.add(this.createBox(2.5, 0.7, 0.3, 0xe8e0d8, [ox, 1.2, oz + 0.55]));
        g.add(this.createBox(0.55, 0.85, 1.2, 0xf5f0e8, [ox - 1.15, 0.425, oz - 0.15]));

        // 台面
        g.add(this.createBox(2.5, 0.04, 0.6, 0xd4d0c8, [ox, 0.87, oz + 0.45]));

        // 冰箱
        g.add(this.createBox(0.6, 1.8, 0.6, 0xc0c0c0, [ox + 1.1, 0.9, oz - 0.4]));

        this.furnitureGroup.add(g);
    }

    buildBathroom() {
        const g = new THREE.Group();
        const ox = 2.776, oz = -2.398;

        // 马桶
        g.add(this.createBox(0.4, 0.4, 0.55, 0xf5f5f5, [ox + 0.35, 0.2, oz - 0.6]));
        g.add(this.createBox(0.35, 0.2, 0.12, 0xf0f0f0, [ox + 0.35, 0.5, oz - 0.85]));

        // 浴室柜
        g.add(this.createBox(0.7, 0.8, 0.45, 0xe8e0d8, [ox - 0.3, 0.4, oz + 0.5]));

        // 淋浴区玻璃隔断
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.2, roughness: 0.1 });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.03), glassMat);
        glass.position.set(ox, 1.0, oz - 0.5);
        g.add(glass);

        this.furnitureGroup.add(g);
    }

    buildBalcony() {
        const g = new THREE.Group();
        const ox = 2.372, oz = 4.518;

        // 洗衣机
        g.add(this.createBox(0.6, 0.85, 0.55, 0xd0d0d0, [ox - 0.6, 0.425, oz]));

        // 洗衣机柜
        g.add(this.createBox(1.0, 0.9, 0.55, 0xe8e0d8, [ox - 0.4, 0.45, oz]));

        // 晾衣架
        g.add(this.createBox(1.2, 0.02, 0.02, 0xaaaaaa, [ox + 0.4, 2.3, oz]));

        this.furnitureGroup.add(g);
    }

    buildHallway() {
        const g = new THREE.Group();
        const ox = 1.371, oz = -2.398;

        // 鞋柜
        g.add(this.createBox(1.0, 1.0, 0.3, 0x7a6a5a, [ox, 0.5, oz - 1.0]));

        this.furnitureGroup.add(g);
    }

    toggle() {
        this.visible = !this.visible;
        this.furnitureGroup.visible = this.visible;
        return this.visible;
    }
}
