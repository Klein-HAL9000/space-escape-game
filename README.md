# 星际逃亡游戏 - GitHub Pages部署指南

这个文档将指导您如何将星际逃亡游戏部署到GitHub Pages上，这样您就可以通过一个不含"manus"的网址分享游戏。

## 部署步骤

### 1. 创建GitHub仓库

1. 登录您的GitHub账号
2. 点击右上角的"+"图标，选择"New repository"
3. 在"Repository name"中输入一个名称，例如`space-escape-game`
4. 选择"Public"（如果您希望任何人都能访问游戏）
5. 点击"Create repository"按钮创建仓库

### 2. 上传游戏文件

**方法一：通过GitHub网页界面上传**

1. 在新创建的仓库页面，点击"uploading an existing file"链接
2. 将此文件夹中的所有文件拖拽到上传区域
3. 在页面底部添加提交信息，例如"Initial game upload"
4. 点击"Commit changes"按钮完成上传

**方法二：通过Git命令行上传（适合熟悉Git的用户）**

```bash
# 克隆仓库到本地
git clone https://github.com/您的用户名/space-escape-game.git

# 复制游戏文件到仓库文件夹
# (将此文件夹中的所有文件复制到仓库文件夹中)

# 添加所有文件到Git
cd space-escape-game
git add .

# 提交更改
git commit -m "Initial game upload"

# 推送到GitHub
git push origin main
```

### 3. 启用GitHub Pages

1. 在您的仓库页面，点击"Settings"选项卡
2. 在左侧菜单中，找到并点击"Pages"
3. 在"Source"部分，选择"Deploy from a branch"
4. 在"Branch"下拉菜单中，选择"main"，然后点击"Save"
5. 等待几分钟，GitHub会自动部署您的网站
6. 部署完成后，页面顶部会显示您的网站URL，格式为：`https://您的用户名.github.io/space-escape-game/`

### 4. 访问您的游戏

部署完成后，您可以通过以下URL访问游戏：

```
https://您的用户名.github.io/space-escape-game/
```

您可以将此链接分享给朋友，让他们也能体验游戏。

## 游戏操作说明

- **方向键**：控制飞船上下左右移动
- **空格键**：切换自动/手动驾驶模式
- **ESC键**：暂停游戏

## 更新游戏

如果您想更新游戏，只需重复上述步骤2，上传新版本的游戏文件即可。GitHub Pages会自动更新您的网站。

## 自定义域名（可选）

如果您拥有自己的域名，还可以将其绑定到GitHub Pages：

1. 在仓库的"Settings" > "Pages"页面
2. 在"Custom domain"部分，输入您的域名
3. 点击"Save"
4. 按照GitHub提供的说明，在您的域名注册商处添加相应的DNS记录

完成后，您就可以通过自己的域名访问游戏了。
