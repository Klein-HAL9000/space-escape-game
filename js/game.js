// 星际逃亡游戏主脚本
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
const OBSTACLE_SPEED = 3;
const RESOURCE_SPEED = 2;
const AUTOPILOT_ENERGY_DRAIN = 0.1;
const MAX_HEALTH = 3;
const MAX_ENERGY = 5;
const OBSTACLE_SPAWN_RATE = 0.02;
const RESOURCE_SPAWN_RATE = 0.01;

// 游戏变量
let canvas, ctx;
let gameRunning = false;
let gameScore = 0;
let playerHealth = MAX_HEALTH;
let playerEnergy = MAX_ENERGY;
let autopilotEnabled = true;
let lastTime = 0;
let obstacles = [];
let resources = [];
let stars = [];
let keys = {};

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
        
        // 如果自动驾驶开启，绘制蓝色光环
        if (autopilotEnabled) {
            ctx.strokeStyle = '#0af';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + 30, this.y + 30, 35, 0, Math.PI * 2);
            ctx.stroke();
        }
    },
    update: function() {
        // 手动控制
        if (!autopilotEnabled) {
            if (keys['ArrowUp'] && this.y > 0) {
                this.y -= PLAYER_SPEED;
            }
            if (keys['ArrowDown'] && this.y < GAME_HEIGHT - PLAYER_HEIGHT) {
                this.y += PLAYER_SPEED;
            }
            if (keys['ArrowLeft'] && this.x > 0) {
                this.x -= PLAYER_SPEED;
            }
            if (keys['ArrowRight'] && this.x < GAME_WIDTH - PLAYER_WIDTH) {
                this.x += PLAYER_SPEED;
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
            
            // 消耗能量
            playerEnergy -= AUTOPILOT_ENERGY_DRAIN / 60;
            if (playerEnergy <= 0) {
                playerEnergy = 0;
                autopilotEnabled = false;
                updateUI();
            }
        }
    }
};

// 障碍物类
class Obstacle {
    constructor() {
        this.width = OBSTACLE_WIDTH;
        this.height = OBSTACLE_HEIGHT;
        this.x = GAME_WIDTH;
        this.y = Math.random() * (GAME_HEIGHT - this.height);
        this.speed = OBSTACLE_SPEED + Math.random() * 2;
        this.type = Math.floor(Math.random() * 3); // 0: 小行星, 1: 太空碎片, 2: 敌舰
    }
    
    draw() {
        ctx.fillStyle = '#aaa';
        
        if (this.type === 0) {
            // 小行星
            ctx.fillStyle = '#a87';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // 添加一些陨石表面细节
            ctx.fillStyle = '#765';
            ctx.beginPath();
            ctx.arc(this.x + this.width/3, this.y + this.height/3, this.width/6, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 1) {
            // 太空碎片
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height/3);
            ctx.lineTo(this.x + this.width/2, this.y + this.height);
            ctx.closePath();
            ctx.fill();
        } else {
            // 敌舰
            ctx.fillStyle = '#c33';
            ctx.fillRect(this.x, this.y + this.height/3, this.width, this.height/3);
            ctx.fillRect(this.x + this.width/4, this.y, this.width/2, this.height);
            
            // 敌舰窗口
            ctx.fillStyle = '#ff0';
            ctx.fillRect(this.x + this.width - 15, this.y + this.height/3 + 5, 5, 5);
        }
    }
    
    update() {
        this.x -= this.speed;
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

// 资源类
class Resource {
    constructor() {
        this.width = RESOURCE_WIDTH;
        this.height = RESOURCE_HEIGHT;
        this.x = GAME_WIDTH;
        this.y = Math.random() * (GAME_HEIGHT - this.height);
        this.speed = RESOURCE_SPEED;
        this.type = Math.floor(Math.random() * 2); // 0: 能量, 1: 生命
    }
    
    draw() {
        if (this.type === 0) {
            // 能量晶体
            ctx.fillStyle = '#0f0';
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height/2);
            ctx.lineTo(this.x + this.width/2, this.y + this.height);
            ctx.lineTo(this.x, this.y + this.height/2);
            ctx.closePath();
            ctx.fill();
            
            // 晶体内部
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, this.y + this.height/4);
            ctx.lineTo(this.x + this.width*3/4, this.y + this.height/2);
            ctx.lineTo(this.x + this.width/2, this.y + this.height*3/4);
            ctx.lineTo(this.x + this.width/4, this.y + this.height/2);
            ctx.closePath();
            ctx.fill();
        } else {
            // 生命修复
            ctx.fillStyle = '#f00';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // 十字标记
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.x + this.width/3, this.y + this.height/6, this.width/3, this.height*2/3);
            ctx.fillRect(this.x + this.width/6, this.y + this.height/3, this.width*2/3, this.height/3);
        }
    }
    
    update() {
        this.x -= this.speed;
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
        this.speed = Math.random() * 3 + 1;
        this.brightness = Math.random();
    }
    
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
    
    update() {
        this.x -= this.speed;
        if (this.x < 0) {
            this.x = GAME_WIDTH;
            this.y = Math.random() * GAME_HEIGHT;
        }
    }
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
        if (e.key === ' ' && gameRunning && playerEnergy > 0) {
            autopilotEnabled = !autopilotEnabled;
            updateUI();
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
    playerHealth = MAX_HEALTH;
    playerEnergy = MAX_ENERGY;
    autopilotEnabled = true;
    obstacles = [];
    resources = [];
    player.x = 100;
    player.y = GAME_HEIGHT / 2 - PLAYER_HEIGHT / 2;
    
    document.getElementById('gameMenu').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    
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
          '3. 自动驾驶会消耗能量\n' + 
          '4. 收集绿色能量晶体补充能量\n' + 
          '5. 收集红色修复组件恢复生命\n' + 
          '6. 避开障碍物和敌舰\n' + 
          '7. 生存时间越长，得分越高');
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = Math.floor(gameScore);
    document.getElementById('gameOver').style.display = 'flex';
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
    
    document.getElementById('autopilot').textContent = '自动驾驶: ' + (autopilotEnabled ? '开启' : '关闭');
}

// 游戏主循环
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    // 计算时间差
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // 清空画布
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // 更新和绘制星星
    for (let star of stars) {
        star.update();
        star.draw();
    }
    
    // 生成障碍物
    if (Math.random() < OBSTACLE_SPAWN_RATE) {
        obstacles.push(new Obstacle());
    }
    
    // 生成资源
    if (Math.random() < RESOURCE_SPAWN_RATE) {
        resources.push(new Resource());
    }
    
    // 更新和绘制障碍物
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const isOutOfScreen = obstacles[i].update();
        
        // 检查碰撞
        if (obstacles[i].checkCollision(player)) {
            playerHealth--;
            updateUI();
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
    
    // 更新和绘制资源
    for (let i = resources.length - 1; i >= 0; i--) {
        const isOutOfScreen = resources[i].update();
        
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
    player.update();
    player.draw();
    
    // 更新得分
    gameScore += deltaTime * 0.01;
    if (Math.floor(gameScore) % 10 === 0) {
        updateUI();
    }
    
    // 继续游戏循环
    requestAnimationFrame(gameLoop);
}

// 初始化游戏
window.onload = init;
