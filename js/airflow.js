// ========== 暖通气流粒子系统 ==========
class AirflowManager {
    constructor(sceneManager) {
        this.sm = sceneManager;
        this.airflowGroup = new THREE.Group();
        this.airflowGroup.name = 'airflow';
        this.sm.scene.add(this.airflowGroup);
        this.particles = [];
        this.enabled = true;
        this.sceneOrigin = { x: 4400, y: 5000 };
        this.systems = {
            floorHeat: true,
            ac: true,
            freshAir: true,
        };
    }

    toScene(x, y) {
        return {
            x: (x - this.sceneOrigin.x) / 1000,
            z: (y - this.sceneOrigin.y) / 1000,
        };
    }

    buildAll() {
        this.buildFloorHeatParticles();
        this.buildACParticles();
        this.buildFreshAirParticles();
    }

    createParticleSystem(config) {
        const { count, color, size, bounds, velocity, type } = config;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const lifetimes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            this.resetParticle(i, positions, velocities, lifetimes, bounds, velocity);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color,
            size,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
        });

        const points = new THREE.Points(geometry, material);
        this.airflowGroup.add(points);

        this.particles.push({
            points,
            positions,
            velocities,
            lifetimes,
            bounds,
            velocity,
            type,
            count,
            maxLife: 120,
        });
    }

    resetParticle(i, positions, velocities, lifetimes, bounds, velocity) {
        const i3 = i * 3;
        positions[i3] = bounds.x + Math.random() * bounds.w;
        positions[i3 + 1] = bounds.y;
        positions[i3 + 2] = bounds.z + Math.random() * bounds.d;
        velocities[i3] = (Math.random() - 0.5) * velocity.spread;
        velocities[i3 + 1] = velocity.y;
        velocities[i3 + 2] = (Math.random() - 0.5) * velocity.spread;
        lifetimes[i] = Math.random() * 120;
    }

    buildFloorHeatParticles() {
        // 为每个房间创建地暖粒子
        const rooms = [
            { id: 'bedroom_b', x: 0, y: 0, w: 3200, h: 3200 },
            { id: 'kitchen', x: 0, y: 3200, w: 3200, h: 800 },
            { id: 'bedroom_a', x: 0, y: 4000, w: 3200, h: 4800 },
            { id: 'dining', x: 3200, y: 0, w: 3600, h: 3200 },
            { id: 'living_room', x: 3200, y: 3200, w: 5600, h: 5600 },
            { id: 'bathroom', x: 6800, y: 0, w: 2000, h: 3200 },
            { id: 'entrance', x: 6800, y: 3200, w: 2000, h: 1000 },
        ];

        rooms.forEach(room => {
            const pos = this.toScene(room.x + room.w / 2, room.y + room.h / 2);
            const widthM = room.w / 1000;
            const heightM = room.h / 1000;

            this.createParticleSystem({
                count: 50,
                color: 0xff6b35,
                size: 0.06,
                bounds: {
                    x: pos.x - widthM / 2 + 0.15,
                    y: 0.05,
                    z: pos.z - heightM / 2 + 0.15,
                    w: Math.max(widthM - 0.3, 0.2),
                    d: Math.max(heightM - 0.3, 0.2),
                },
                velocity: { y: 0.012, spread: 0.004 },
                type: 'floorHeat',
            });
        });
    }

    buildACParticles() {
        // 空调位置（客厅、主卧、次卧）
        const acPositions = [
            { x: 6000, y: 3200, room: 'living_room' },
            { x: 1600, y: 4200, room: 'bedroom_a' },
            { x: 1600, y: 200, room: 'bedroom_b' },
        ];

        acPositions.forEach(pos => {
            const scenePos = this.toScene(pos.x, pos.y);
            this.createParticleSystem({
                count: 35,
                color: 0x4fc3f7,
                size: 0.05,
                bounds: {
                    x: scenePos.x - 0.35,
                    y: 2.5,
                    z: scenePos.z - 0.35,
                    w: 0.7,
                    d: 0.7,
                },
                velocity: { y: -0.018, spread: 0.008 },
                type: 'ac',
            });
        });
    }

    buildFreshAirParticles() {
        // 新风系统位置
        const freshAirPositions = [
            { x: 7000, y: 6000, dir: 1 },   // 客厅进风
            { x: 4000, y: 6000, dir: -1 },  // 客厅出风
            { x: 1600, y: 8000, dir: 1 },   // 主卧进风
        ];

        freshAirPositions.forEach(pos => {
            const scenePos = this.toScene(pos.x, pos.y);
            this.createParticleSystem({
                count: 25,
                color: 0x66bb6a,
                size: 0.04,
                bounds: {
                    x: scenePos.x - 0.25,
                    y: 2.3,
                    z: scenePos.z - 0.25,
                    w: 0.5,
                    d: 0.5,
                },
                velocity: { y: -0.01 * pos.dir, spread: 0.006 },
                type: 'freshAir',
            });
        });
    }

    update() {
        this.particles.forEach(sys => {
            const { positions, velocities, lifetimes, count, maxLife } = sys;
            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                lifetimes[i]++;

                positions[i3] += velocities[i3];
                positions[i3 + 1] += velocities[i3 + 1];
                positions[i3 + 2] += velocities[i3 + 2];

                positions[i3] += (Math.random() - 0.5) * 0.002;
                positions[i3 + 2] += (Math.random() - 0.5) * 0.002;

                if (lifetimes[i] > maxLife || positions[i3 + 1] < 0 || positions[i3 + 1] > 3.0) {
                    this.resetParticle(i, positions, velocities, lifetimes,
                        { x: sys.bounds.x, y: sys.bounds.y, z: sys.bounds.z, w: sys.bounds.w, d: sys.bounds.d },
                        sys.velocity);
                }
            }
            sys.points.geometry.attributes.position.needsUpdate = true;
        });
    }

    toggleSystem(type) {
        this.systems[type] = !this.systems[type];
        this.particles.forEach(sys => {
            if (sys.type === type) {
                sys.points.visible = this.systems[type] && this.enabled;
            }
        });
        return this.systems[type];
    }

    toggle() {
        this.enabled = !this.enabled;
        this.airflowGroup.visible = this.enabled;
        return this.enabled;
    }
}
