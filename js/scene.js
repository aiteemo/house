// ========== Three.js 场景管理 ==========
class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.roomMeshes = {};
        this.roomLabels = {};
        this.labelContainer = null;
        this.toggles = {
            walls: false,
            light: true,
            airflow: true,
            labels: true,
            furniture: true,
        };
        this.init();
    }

    init() {
        // 场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c12);
        this.scene.fog = new THREE.FogExp2(0x0a0c12, 0.012);

        // 相机
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
        this.camera.position.set(0, 15, -14);
        this.camera.lookAt(0, 0, 0);

        // WebGL渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // 标签容器
        this.labelContainer = document.createElement('div');
        this.labelContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;';
        this.container.appendChild(this.labelContainer);

        // 轨道控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.maxPolarAngle = Math.PI * 0.48;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
        this.controls.target.set(0, 0, 0.3);

        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // 主方向光
        const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
        dirLight.position.set(10, 15, 8);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        this.scene.add(dirLight);

        // 补光
        const fillLight = new THREE.DirectionalLight(0xb4c6ff, 0.3);
        fillLight.position.set(-8, 10, -5);
        this.scene.add(fillLight);

        // 地面网格
        const gridHelper = new THREE.GridHelper(40, 40, 0x1a1d27, 0x1a1d27);
        gridHelper.position.y = -0.01;
        this.scene.add(gridHelper);

        // 地面平面
        const groundGeo = new THREE.PlaneGeometry(40, 40);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f1117, roughness: 1 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.02;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // 事件
        this.container.addEventListener('click', (e) => this.onClick(e));
        this.container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('resize', () => this.onResize());

        this.animate();
    }

    projectToScreen(pos3d) {
        const vec = pos3d.clone();
        vec.project(this.camera);
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        return {
            x: (vec.x * 0.5 + 0.5) * w,
            y: (-vec.y * 0.5 + 0.5) * h,
            behind: vec.z > 1,
        };
    }

    updateLabels() {
        Object.entries(this.roomLabels).forEach(([id, label]) => {
            if (!label.visible) {
                label.element.style.display = 'none';
                return;
            }
            const screen = this.projectToScreen(label.position);
            if (screen.behind) {
                label.element.style.display = 'none';
                return;
            }
            label.element.style.display = 'block';
            label.element.style.left = screen.x + 'px';
            label.element.style.top = screen.y + 'px';
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.updateLabels();
    }

    onResize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    onClick(event) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const meshes = Object.values(this.roomMeshes).map(r => r.floor);
        const intersects = this.raycaster.intersectObjects(meshes);
        if (intersects.length > 0) {
            const roomId = intersects[0].object.userData.roomId;
            this.highlightRoom(roomId);
            if (this.onRoomClick) this.onRoomClick(roomId);
        }
    }

    onMouseMove(event) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const meshes = Object.values(this.roomMeshes).map(r => r.floor);
        const intersects = this.raycaster.intersectObjects(meshes);
        if (intersects.length > 0) {
            this.container.style.cursor = 'pointer';
            const roomId = intersects[0].object.userData.roomId;
            if (this.onRoomHover) this.onRoomHover(roomId, event.clientX, event.clientY);
        } else {
            this.container.style.cursor = 'default';
            if (this.onRoomHover) this.onRoomHover(null);
        }
    }

    highlightRoom(roomId) {
        Object.entries(this.roomMeshes).forEach(([id, room]) => {
            const isSelected = id === roomId;
            room.walls.forEach(w => {
                w.material.emissive.setHex(isSelected ? 0x6c8cff : 0x000000);
                w.material.emissiveIntensity = isSelected ? 0.15 : 0;
            });
            room.floor.material.emissive.setHex(isSelected ? 0x6c8cff : 0x000000);
            room.floor.material.emissiveIntensity = isSelected ? 0.1 : 0;
        });
    }

    setCameraView(viewName) {
        let pos, target;
        switch (viewName) {
            case 'top':
                pos = [0, 22, 0.3];
                target = [0, 0, 0.3];
                break;
            case 'living':
                pos = [1.270, 4, -3];
                target = [1.270, 1.2, 1.359];
                break;
            case 'bedroom':
                pos = [-2.164, 4, -2];
                target = [-2.164, 1.2, 1.513];
                break;
            case 'kitchen':
                pos = [-2.164, 4, -4.5];
                target = [-2.164, 1.2, -1.200];
                break;
            default:
                pos = [0, 15, -14];
                target = [0, 0, 0.3];
        }
        this.animateCamera(pos, target);
    }

    animateCamera(pos, target) {
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const endPos = new THREE.Vector3(...pos);
        const endTarget = new THREE.Vector3(...target);
        let t = 0;
        const step = () => {
            t += 0.03;
            if (t > 1) t = 1;
            const ease = 1 - Math.pow(1 - t, 3);
            this.camera.position.lerpVectors(startPos, endPos, ease);
            this.controls.target.lerpVectors(startTarget, endTarget, ease);
            if (t < 1) requestAnimationFrame(step);
        };
        step();
    }

    addLabel(id, text, x, z) {
        const div = document.createElement('div');
        div.textContent = text;
        div.style.cssText = `
            position:absolute; transform:translate(-50%,-50%);
            background:rgba(26,29,39,0.85); color:#e4e6f0;
            padding:4px 12px; border-radius:6px; font-size:13px; font-weight:500;
            border:1px solid rgba(108,140,255,0.3); white-space:nowrap;
            pointer-events:none;
        `;
        this.labelContainer.appendChild(div);
        this.roomLabels[id] = {
            element: div,
            position: new THREE.Vector3(x, 0.1, z),
            visible: true,
        };
    }

    toggleWalls() {
        this.toggles.walls = !this.toggles.walls;
        Object.values(this.roomMeshes).forEach(room => {
            room.walls.forEach(w => {
                w.material.transparent = true;
                w.material.opacity = this.toggles.walls ? 0.15 : 0.85;
            });
        });
        return this.toggles.walls;
    }

    toggleLabels() {
        this.toggles.labels = !this.toggles.labels;
        Object.entries(this.roomLabels).forEach(([id, label]) => {
            label.visible = this.toggles.labels;
            if (!this.toggles.labels) label.element.style.display = 'none';
        });
        return this.toggles.labels;
    }
}
