// 星际逃亡游戏主脚本 - 优化版2.0
// 像素风格的太空飞行游戏

// 游戏常量
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_WIDTH = 64;
const PLAYER_HEIGHT = 64;
const OBSTACLE_WIDTH = 48;
const OBSTACLE_HEIGHT = 48;
const RESOURCE_WIDTH = 32;
const RESOURCE_HEIGHT = 32;
const PLAYER_SPEED = 5;
const BASE_OBSTACLE_SPEED = 3;
const MOVEMENT_ENERGY_DRAIN = 0.01; // 移动时能量消耗
const AUTOPILOT_ENERGY_DRAIN = 0.1;
const MAX_HEALTH = 3;
const MAX_ENERGY = 5;
const OBSTACLE_SPAWN_RATE = 0.02;
const ENERGY_RESOURCE_SPAWN_RATE = 0.001; // 原来的1/10
const HEALTH_RESOURCE_SPAWN_RATE = 0.005; // 原来的1/2
const TRANSITION_TIME = 3; // 自动驾驶切换过渡时间（秒）
const SPEED_INCREASE_INTERVAL = 3; // 每3秒增加速度
const SPEED_INCREASE_AMOUNT = 0.1; // 每次增加0.1倍速度
const MAX_SPEED_MULTIPLIER = 3.0; // 最大速度倍数
const MIN_OBSTACLE_DISTANCE = 150; // 障碍物之间的最小距离
const SATELLITE_SIZE_OPTIONS = [0.4, 0.5, 0.6, 0.7]; // 卫星大小选项
const SATELLITE_ORBIT_SPEED_OPTIONS = [0.001, 0.002, 0.003, 0.004, 0.005]; // 卫星公转速度选项

// 游戏变量
let canvas, ctx;
let gameRunning = false;
let gameScore = 0;
let playerHealth = MAX_HEALTH;
let playerEnergy = MAX_ENERGY;
let autopilotEnabled = false; // 初始状态改为手动驾驶
let autopilotTransitioning = false; // 是否正在切换自动驾驶状态
let transitionProgress = 0; // 切换进度 (0-1)
let transitionDirection = 0; // 1=开启自动, -1=关闭自动
let lastTime = 0;
let gameTime = 0; // 游戏时间（秒）
let manualDriveTime = 0; // 手动驾驶累计时间（秒）
let speedMultiplier = 1.0; // 速度倍数
let obstacles = [];
let resources = [];
let stars = [];
let satellites = []; // 卫星数组
let keys = {};
let playerMoving = false; // 玩家是否在移动

// 玩家飞船
const player = {
    x: 100,
    y: GAME_HEIGHT / 2 - PLAYER_HEIGHT / 2,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    color: '#0af',
    draw: function() {
        // 绘制像素风格的飞船
        ctx.fillStyle = this.color;
        
        // 飞船主体
        ctx.fillRect(this.x + 20, this.y + 20, 30, 20);
        
        // 飞船头部
        ctx.fillRect(this.x + 50, this.y + 25, 10, 10);
        
        // 飞船尾部
        ctx.fillRect(this.x + 10, this.y + 15, 10, 30);
        
        // 飞船引擎
        ctx.fillStyle = '#f70';
        ctx.fillRect(this.x, this.y + 20, 10, 5);
        ctx.fillRect(this.x, this.y + 35, 10, 5);
        
        // 飞船窗口
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 35, this.y + 25, 5, 10);
        
        // 如果自动驾驶开启或正在切换，绘制蓝色光环
        if (autopilotEnabled || autopilotTransitioning) {
            let alpha = autopilotEnabled ? 1.0 : transitionProgress;
            if (transitionDirection < 0) alpha = 1.0 - transitionProgress;
            
            ctx.strokeStyle = `rgba(0, 170, 255, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + 30, this.y + 30, 35, 0, Math.PI * 2);
            ctx.stroke();
        }
    },
    update: function(deltaTime) {
        // 重置移动状态
        playerMoving = false;
        
        // 处理自动驾驶切换
        if (autopilotTransitioning) {
            transitionProgress += (deltaTime / 1000) / TRANSITION_TIME;
            if (transitionProgress >= 1) {
                transitionProgress = 0;
                autopilotTransitioning = false;
                if (transitionDirection > 0) {
                    // 完成切换到自动驾驶
                    autopilotEnabled = true;
                } else {
                    // 完成切换到手动驾驶
                    autopilotEnabled = false;
                }
                updateUI();
            }
        }
        
        // 手动控制
        if (!autopilotEnabled) {
            if (keys['ArrowUp'] && this.y > 0) {
                this.y -= PLAYER_SPEED;
                playerMoving = true;
            }
            if (keys['ArrowDown'] && this.y < GAME_HEIGHT - PLAYER_HEIGHT) {
                this.y += PLAYER_SPEED;
                playerMoving = true;
            }
            if (keys['ArrowLeft'] && this.x > 0) {
                this.x -= PLAYER_SPEED;
                playerMoving = true;
            }
            if (keys['ArrowRight'] && this.x < GAME_WIDTH - PLAYER_WIDTH) {
                this.x += PLAYER_SPEED;
                playerMoving = true;
            }
            
            // 只有在手动移动时消耗能量
            if (playerMoving) {
                playerEnergy -= MOVEMENT_ENERGY_DRAIN / 60 * deltaTime / 16;
                if (playerEnergy <= 0) {
                    playerEnergy = 0;
                    // 能量耗尽不会自动切换到自动驾驶
                    updateUI();
                }
            }
        } else {
            // 自动驾驶逻辑
            // 寻找最近的障碍物并尝试避开
            let nearestObstacle = null;
            let minDistance = Infinity;
            
            for (let obstacle of obstacles) {
                if (obstacle.x > this.x) {  // 只考虑前方的障碍物
                    const distance = Math.sqrt(
                        Math.pow(obstacle.x - this.x, 2) + 
                        Math.pow(obstacle.y - this.y, 2)
                    );
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestObstacle = obstacle;
                    }
                }
            }
            
            // 如果有障碍物且距离较近，尝试避开
            if (nearestObstacle && minDistance < 200) {
                if (nearestObstacle.y < this.y + PLAYER_HEIGHT / 2) {
                    // 障碍物在上方，向下移动
                    if (this.y < GAME_HEIGHT - PLAYER_HEIGHT) {
                        this.y += PLAYER_SPEED / 2;
                    }
                } else {
                    // 障碍物在下方，向上移动
                    if (this.y > 0) {
                        this.y -= PLAYER_SPEED / 2;
                    }
                }
            } else {
                // 没有障碍物时，尝试回到中间位置
                if (Math.abs(this.y - (GAME_HEIGHT / 2 - PLAYER_HEIGHT / 2)) > 5) {
                    if (this.y > GAME_HEIGHT / 2 - PLAYER_HEIGHT / 2) {
                        this.y -= PLAYER_SPEED / 4;
                    } else {
                        this.y += PLAYER_SPEED / 4;
                    }
                }
            }
            
            // 自动驾驶消耗能量
            playerEnergy -= AUTOPILOT_ENERGY_DRAIN / 60 * deltaTime / 16;
            if (playerEnergy <= 0) {
                playerEnergy = 0;
                // 开始切换到手动驾驶
                startAutopilotTransition(false);
                updateUI();
            }
        }
    }
};

// 障碍物类
class Obstacle {
    constructor() {
        // 随机选择障碍物大小倍数 (1x, 2x, 3x)
        this.sizeMultiplier = Math.floor(Math.random() * 3) + 1;
        this.width = OBSTACLE_WIDTH * this.sizeMultiplier;
        this.height = OBSTACLE_HEIGHT * this.sizeMultiplier;
        this.x = GAME_WIDTH;
        this.y = Math.random() * (GAME_HEIGHT - this.height);
        this.speed = BASE_OBSTACLE_SPEED * getCurrentSpeedMultiplier();
        this.type = Math.floor(Math.random() * 3); // 0: 小行星, 1: 太空碎片, 2: 恒星
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        this.satellites = []; // 存储该障碍物的卫星引用
        
        // 检查是否与现有障碍物重叠
        let overlapping = true;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (overlapping && attempts < maxAttempts) {
            overlapping = false;
            for (let obstacle of obstacles) {
                const dx = this.x - obstacle.x;
                const dy = this.y - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < MIN_OBSTACLE_DISTANCE) {
                    overlapping = true;
                    // 重新生成位置
                    this.y = Math.random() * (GAME_HEIGHT - this.height);
                    break;
                }
            }
            attempts++;
        }
        
        // 如果是恒星且大小足够，创建卫星
        if (this.type === 2 && this.sizeMultiplier > 1) {
            // 随机决定卫星数量 (1-2个)
            const satelliteCount = this.sizeMultiplier === 3 ? (Math.random() < 0.5 ? 2 : 1) : 1;
            
            for (let i = 0; i < satelliteCount; i++) {
                const satellite = createSatellite(this, i);
                this.satellites.push(satellite);
                satellites.push(satellite);
            }
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        if (this.type === 0) {
            // 小行星
            ctx.fillStyle = '#a87';
            ctx.beginPath();
            ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // 添加一些陨石表面细节
            ctx.fillStyle = '#765';
            ctx.beginPath();
            ctx.arc(-this.width/6, -this.height/6, this.width/6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#654';
            ctx.beginPath();
            ctx.arc(this.width/5, this.height/5, this.width/8, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 1) {
            // 太空碎片
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.moveTo(-this.width/2, -this.height/2);
            ctx.lineTo(this.width/2, -this.height/6);
            ctx.lineTo(0, this.height/2);
            ctx.closePath();
            ctx.fill();
            
            // 添加一些碎片细节
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.moveTo(-this.width/4, -this.height/4);
            ctx.lineTo(this.width/4, -this.height/8);
            ctx.lineTo(0, this.height/4);
            ctx.closePath();
            ctx.fill();
        } else {
            // 恒星
            // 绘制恒星光晕
            const gradient = ctx.createRadialGradient(0, 0, this.width/4, 0, 0, this.width/2);
            gradient.addColorStop(0, '#ff5');
            gradient.addColorStop(0.7, '#f70');
            gradient.addColorStop(1, 'rgba(255, 70, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // 恒星核心
            ctx.fillStyle = '#ff5';
            ctx.beginPath();
            ctx.arc(0, 0, this.width/3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    update(deltaTime) {
        this.x -= this.speed;
        this.rotation += this.rotationSpeed;
        
        // 如果超出屏幕，移除所有关联的卫星
        if (this.x + this.width < 0) {
            // 移除所有关联的卫星
            for (let satellite of this.satellites) {
                const index = satellites.indexOf(satellite);
                if (index !== -1) {
                    satellites.splice(index, 1);
                }
            }
            return true; // 返回是否超出屏幕
        }
        
        return false;
    }
    
    checkCollision(entity) {
        // 简化的圆形碰撞检测
        const dx = (this.x + this.width/2) - (entity.x + entity.width/2);
        const dy = (this.y + this.height/2) - (entity.y + entity.height/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (this.width + entity.width) / 2 * 0.8; // 0.8是为了使碰撞更宽容
        
        return distance < minDistance;
    }
}

// 卫星类
class Satellite {
    constructor(parent, orbitIndex = 0) {
        this.parent = parent;
        // 随机选择卫星大小
        const sizeMultiplier = SATELLITE_SIZE_OPTIONS[Math.floor(Math.random() * SATELLITE_SIZE_OPTIONS.length)];
        this.width = OBSTACLE_WIDTH * sizeMultiplier;
        this.height = OBSTACLE_HEIGHT * sizeMultiplier;
        
        // 如果是第二个卫星，轨道半径要更大
        const orbitMultiplier = orbitIndex === 0 ? 1.2 : 1.8;
        this.orbitRadius = parent.width * orbitMultiplier;
        
        // 随机选择公转速度
        this.orbitSpeed = SATELLITE_ORBIT_SPEED_OPTIONS[Math.floor(Math.random() * SATELLITE_ORBIT_SPEED_OPTIONS.length)];
        
        // 随机初始角度，如果是第二个卫星，错开初始位置
        this.orbitAngle = Math.random() * Math.PI * 2 + (orbitIndex * Math.PI);
        
        // 随机颜色
        const colors = ['#aaa', '#bbb', '#999', '#ccc'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    
    draw() {
        // 只有当父恒星在屏幕上时才绘制
        if (this.parent.x + this.parent.width < 0) return;
        
        // 计算卫星位置
        const x = this.parent.x + this.parent.width/2 + Math.cos(this.orbitAngle) * this.orbitRadius;
        const y = this.parent.y + this.parent.height/2 + Math.sin(this.orbitAngle) * this.orbitRadius;
        
        // 绘制卫星轨道
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.parent.x + this.parent.width/2, this.parent.y + this.parent.height/2, 
                this.orbitRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制卫星
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // 卫星表面细节
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(x - this.width/5, y - this.height/5, this.width/6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    update(deltaTime) {
        this.orbitAngle += this.orbitSpeed * deltaTime;
        
        // 如果父恒星超出屏幕，返回true以移除卫星
        // 注意：实际移除操作已在父恒星的update方法中处理
        return false;
    }
    
    checkCollision(entity) {
        // 如果父恒星不在屏幕上，不检测碰撞
        if (this.parent.x + this.parent.width < 0) return false;
        
        // 计算卫星位置
        const x = this.parent.x + this.parent.width/2 + Math.cos(this.orbitAngle) * this.orbitRadius;
        const y = this.parent.y + this.parent.height/2 + Math.sin(this.orbitAngle) * this.orbitRadius;
        
        // 简化的圆形碰撞检测
        const dx = x - (entity.x + entity.width/2);
        const dy = y - (entity.y + entity.height/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (this.width + entity.width) / 2 * 0.7;
        
        return distance < minDistance;
    }
}

// 为恒星创建卫星
function createSatellite(star, orbitIndex = 0) {
    return new Satellite(star, orbitIndex);
}

// 资源类
class Resource {
    constructor(type) {
        this.width = RESOURCE_WIDTH;
        this.height = RESOURCE_HEIGHT;
        this.x = GAME_WIDTH;
        this.y = Math.random() * (GAME_HEIGHT - this.height);
        this.speed = BASE_OBSTACLE_SPEED * getCurrentSpeedMultiplier(); // 与障碍物保持相同速度
        this.type = type !== undefined ? type : Math.floor(Math.random() * 2); // 0: 能量, 1: 生命
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.03;
        
        // 检查是否与现有障碍物重叠
        let overlapping = true;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (overlapping && attempts < maxAttempts) {
            overlapping = false;
            for (let obstacle of obstacles) {
                const dx = this.x - obstacle.x;
                const dy = this.y - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < MIN_OBSTACLE_DISTANCE / 2) {
                    overlapping = true;
                    // 重新生成位置
                    this.y = Math.random() * (GAME_HEIGHT - this.height);
                    break;
                }
            }
            attempts++;
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        if (this.type === 0) {
            // 能量晶体
            ctx.fillStyle = '#0f0';
            ctx.beginPath();
            ctx.moveTo(0, -this.height/2);
            ctx.lineTo(this.width/2, 0);
            ctx.lineTo(0, this.height/2);
            ctx.lineTo(-this.width/2, 0);
            ctx.closePath();
            ctx.fill();
            
            // 晶体内部
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(0, -this.height/4);
            ctx.lineTo(this.width/4, 0);
            ctx.lineTo(0, this.height/4);
            ctx.lineTo(-this.width/4, 0);
            ctx.closePath();
            ctx.fill();
        } else {
            // 生命修复
            ctx.fillStyle = '#f00';
            ctx.beginPath();
            ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // 十字标记
            ctx.fillStyle = '#fff';
            ctx.fillRect(-this.width/6, -this.height/3, this.width/3, this.height*2/3);
            ctx.fillRect(-this.width/3, -this.height/6, this.width*2/3, this.height/3);
        }
        
        ctx.restore();
    }
    
    update(deltaTime) {
        this.x -= this.speed;
        this.rotation += this.rotationSpeed;
        return this.x + this.width < 0; // 返回是否超出屏幕
    }
    
    checkCollision(entity) {
        return (
            this.x < entity.x + entity.width &&
            this.x + this.width > entity.x &&
            this.y < entity.y + entity.height &&
            this.y + this.height > entity.y
        );
    }
}

// 星星背景
class Star {
    constructor() {
        this.x = Math.random() * GAME_WIDTH;
        this.y = Math.random() * GAME_HEIGHT;
        this.size = Math.random() * 3 + 1;
        this.baseSpeed = Math.random() * 3 + 1;
        this.brightness = Math.random();
    }
    
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
    
    update(deltaTime) {
        // 星星移动速度也受当前速度倍数影响
        this.x -= this.baseSpeed * getCurrentSpeedMultiplier();
        if (this.x < 0) {
            this.x = GAME_WIDTH;
            this.y = Math.random() * GAME_HEIGHT;
        }
    }
}

// 获取当前速度倍数
function getCurrentSpeedMultiplier() {
    // 自动驾驶或切换过程中使用基础速度
    if (autopilotEnabled || autopilotTransitioning) {
        return 1.0;
    }
    return speedMultiplier;
}

// 开始自动驾驶切换过程
function startAutopilotTransition(enable) {
    // 如果已经在切换中，不做任何事
    if (autopilotTransitioning) return;
    
    // 如果要开启自动驾驶但能量不足，不做任何事
    if (enable && playerEnergy <= 0) return;
    
    autopilotTransitioning = true;
    transitionProgress = 0;
    transitionDirection = enable ? 1 : -1;
    
    // 如果是关闭自动驾驶，立即设置状态但保持过渡动画
    if (!enable) {
        autopilotEnabled = false;
    }
    
    updateUI();
}

// 初始化游戏
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // 创建星星背景
    for (let i = 0; i < 100; i++) {
        stars.push(new Star());
    }
    
    // 事件监听
    window.addEventListener('keydown', function(e) {
        keys[e.key] = true;
        
        // 空格键切换自动驾驶
        if (e.key === ' ' && gameRunning && !autopilotTransitioning) {
            if (!autopilotEnabled && playerEnergy > 0) {
                startAutopilotTransition(true);
            } else if (autopilotEnabled) {
                startAutopilotTransition(false);
            }
        }
    });
    
    window.addEventListener('keyup', function(e) {
        keys[e.key] = false;
    });
    
    // 按钮事件
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('instructionsButton').addEventListener('click', showInstructions);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    
    // 初始UI更新
    updateUI();
}

// 开始游戏
function startGame() {
    gameRunning = true;
    gameScore = 0;
    gameTime = 0;
    manualDriveTime = 0;
    speedMultiplier = 1.0;
    playerHealth = MAX_HEALTH;
    playerEnergy = MAX_ENERGY;
    autopilotEnabled = false; // 初始状态改为手动驾驶
    autopilotTransitioning = false;
    obstacles = [];
    resources = [];
    satellites = [];
    player.x = 100;
    player.y = GAME_HEIGHT / 2 - PLAYER_HEIGHT / 2;
    
    document.getElementById('gameMenu').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    
    lastTime = performance.now();
    updateUI();
    requestAnimationFrame(gameLoop);
}

// 重新开始游戏
function restartGame() {
    startGame();
}

// 显示游戏说明
function showInstructions() {
    alert('游戏说明：\n\n' + 
          '1. 使用方向键控制飞船移动\n' + 
          '2. 按空格键切换自动/手动驾驶\n' + 
          '3. 自动驾驶会消耗能量，且不会得分\n' + 
          '4. 手动移动飞船也会消耗能量\n' + 
          '5. 收集绿色能量晶体补充能量\n' + 
          '6. 收集红色修复组件恢复生命\n' + 
          '7. 手动驾驶时间越长，游戏难度越高\n' +
          '8. 切换自动/手动驾驶需要3秒过渡时间');
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = Math.floor(gameScore);
    document.getElementById('gameOver').style.display = 'flex';
}

// 格式化时间为分:秒格式
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// 更新UI
function updateUI() {
    document.getElementById('score').textContent = '得分: ' + Math.floor(gameScore);
    
    let healthBar = '';
    for (let i = 0; i < MAX_HEALTH; i++) {
        healthBar += i < playerHealth ? '■' : '□';
    }
    document.getElementById('health').textContent = '生命值: ' + healthBar;
    
    let energyBar = '';
    for (let i = 0; i < MAX_ENERGY; i++) {
        energyBar += i < playerEnergy ? '■' : '□';
    }
    document.getElementById('energy').textContent = '能量: ' + energyBar;
    
    let autopilotStatus = autopilotEnabled ? '开启' : '关闭';
    if (autopilotTransitioning) {
        autopilotStatus = transitionDirection > 0 ? '正在开启...' : '正在关闭...';
    }
    document.getElementById('autopilot').textContent = '自动驾驶: ' + autopilotStatus;
    
    // 添加游戏时间显示
    document.getElementById('gameTime').textContent = '游戏时间: ' + formatTime(gameTime);
    
    // 添加速度倍数显示
    document.getElementById('speedMultiplier').textContent = '速度: ' + speedMultiplier.toFixed(1) + 'x';
}

// 游戏主循环
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    // 计算时间差
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // 更新游戏时间
    if (!autopilotEnabled && !autopilotTransitioning) {
        gameTime += deltaTime / 1000;
        manualDriveTime += deltaTime / 1000;
        
        // 每3秒增加速度，最高3倍
        const newSpeedMultiplier = 1.0 + Math.min(Math.floor(manualDriveTime / SPEED_INCREASE_INTERVAL) * SPEED_INCREASE_AMOUNT, MAX_SPEED_MULTIPLIER - 1);
        if (newSpeedMultiplier !== speedMultiplier) {
            speedMultiplier = newSpeedMultiplier;
            updateUI();
        }
    }
    
    // 清空画布
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // 更新和绘制星星
    for (let star of stars) {
        star.update(deltaTime);
        star.draw();
    }
    
    // 生成障碍物
    if (Math.random() < OBSTACLE_SPAWN_RATE * getCurrentSpeedMultiplier()) {
        obstacles.push(new Obstacle());
    }
    
    // 生成能量资源 (减少生成率)
    if (Math.random() < ENERGY_RESOURCE_SPAWN_RATE * getCurrentSpeedMultiplier()) {
        resources.push(new Resource(0)); // 0 = 能量
    }
    
    // 生成生命资源 (减少生成率)
    if (Math.random() < HEALTH_RESOURCE_SPAWN_RATE * getCurrentSpeedMultiplier()) {
        resources.push(new Resource(1)); // 1 = 生命
    }
    
    // 更新和绘制障碍物
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const isOutOfScreen = obstacles[i].update(deltaTime);
        
        // 检查碰撞
        if (obstacles[i].checkCollision(player)) {
            playerHealth--;
            updateUI();
            
            // 移除所有关联的卫星
            for (let satellite of obstacles[i].satellites) {
                const index = satellites.indexOf(satellite);
                if (index !== -1) {
                    satellites.splice(index, 1);
                }
            }
            
            obstacles.splice(i, 1);
            
            if (playerHealth <= 0) {
                gameOver();
                return;
            }
            
            continue;
        }
        
        // 如果超出屏幕则移除
        if (isOutOfScreen) {
            obstacles.splice(i, 1);
            continue;
        }
        
        obstacles[i].draw();
    }
    
    // 更新和绘制卫星
    for (let i = satellites.length - 1; i >= 0; i--) {
        satellites[i].update(deltaTime);
        
        // 检查碰撞
        if (satellites[i].checkCollision(player)) {
            playerHealth--;
            updateUI();
            satellites.splice(i, 1);
            
            if (playerHealth <= 0) {
                gameOver();
                return;
            }
            
            continue;
        }
        
        satellites[i].draw();
    }
    
    // 更新和绘制资源
    for (let i = resources.length - 1; i >= 0; i--) {
        const isOutOfScreen = resources[i].update(deltaTime);
        
        // 检查碰撞
        if (resources[i].checkCollision(player)) {
            if (resources[i].type === 0) {
                // 能量晶体
                playerEnergy = Math.min(MAX_ENERGY, playerEnergy + 2);
            } else {
                // 生命修复
                playerHealth = Math.min(MAX_HEALTH, playerHealth + 1);
            }
            updateUI();
            resources.splice(i, 1);
            gameScore += 50;
            continue;
        }
        
        // 如果超出屏幕则移除
        if (isOutOfScreen) {
            resources.splice(i, 1);
            continue;
        }
        
        resources[i].draw();
    }
    
    // 更新和绘制玩家
    player.update(deltaTime);
    player.draw();
    
    // 更新得分 (只在手动驾驶且非过渡状态时增加)
    if (!autopilotEnabled && !autopilotTransitioning) {
        gameScore += deltaTime * 0.01;
    }
    
    // 每秒更新一次UI
    if (Math.floor(timestamp / 1000) !== Math.floor(lastTime / 1000)) {
        updateUI();
    }
    
    // 继续游戏循环
    requestAnimationFrame(gameLoop);
}

// 初始化游戏
window.onload = init;
