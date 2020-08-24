# lark node-red 节点模板

本节点可用于设备数据格式化后转发与设备模拟

* ## windows
1. 在d盘或其他你经常放置配置文件的目录内执行`mkdir delos-nodered-nodes`
2. 在该项目文件目录内执行`copy config.js D:\delos-nodered-nodes\config.js`
3. 将项目内nodered-config文件下的两个文件复制替换到`$HOME/.node-red`目录中,`$HOME`是你的用户目录
4. 安装依赖，在该项目目录内运行`npm install`
5. 安装节点，跳转至node-red目录运行`npm install <path to location of node module>`

* ## Mac和linux
1. 执行`sudo mkdir /etc/delos-nodered-nodes`
2. 在该项目文件目录内执行`sudo cp config.js /etc/delos-nodered-nodes`
3. 在该项目文件目录内执行`sudo cp -r userDir/. $HOME/.node-red`
4. 安装依赖，在该项目目录内运行`npm install`
5. 安装节点，依次执行`cd $HOME/.node-red`,`npm install <path to location of node module>`
