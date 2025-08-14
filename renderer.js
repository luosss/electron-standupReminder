// 渲染进程主模块
const { ipcRenderer } = require('electron');

// 获取DOM元素
const intervalInput = document.getElementById('interval');
const updateIntervalBtn = document.getElementById('updateInterval');
const showNotificationBtn = document.getElementById('showNotification');
const pauseNotificationsBtn = document.getElementById('pauseNotifications');
const resumeNotificationsBtn = document.getElementById('resumeNotifications');
const statusText = document.getElementById('statusText');

// 创建检查更新按钮
const checkUpdatesBtn = document.createElement('button');
checkUpdatesBtn.id = 'checkUpdates';
checkUpdatesBtn.textContent = '检查更新';
checkUpdatesBtn.style.marginLeft = '10px';
checkUpdatesBtn.style.backgroundColor = '#9c27b0';
document.querySelector('.controls').appendChild(checkUpdatesBtn);

// 状态变量
let isPaused = false;

// =====================
// 事件监听器
// =====================

// 更新提醒间隔
updateIntervalBtn.addEventListener('click', () => {
    const minutes = parseInt(intervalInput.value);
    if (minutes && minutes > 0 && minutes <= 180) {
        ipcRenderer.send('update-interval', minutes);
        statusText.textContent = `状态：提醒间隔已更新为 ${minutes} 分钟`;
    } else {
        alert('请输入1-180之间的有效数字');
    }
});

// 立即显示提醒
showNotificationBtn.addEventListener('click', () => {
    ipcRenderer.send('show-notification');
});

// 暂停提醒
pauseNotificationsBtn.addEventListener('click', () => {
    isPaused = true;
    ipcRenderer.send('toggle-pause', true);
    statusText.textContent = '状态：提醒功能已暂停';
    pauseNotificationsBtn.style.display = 'none';
    resumeNotificationsBtn.style.display = 'inline-block';
});

// 恢复提醒
resumeNotificationsBtn.addEventListener('click', () => {
    isPaused = false;
    ipcRenderer.send('toggle-pause', false);
    statusText.textContent = '状态：提醒功能运行中';
    pauseNotificationsBtn.style.display = 'inline-block';
    resumeNotificationsBtn.style.display = 'none';
});

// 检查更新
checkUpdatesBtn.addEventListener('click', () => {
    statusText.textContent = '状态：正在检查更新...';
    ipcRenderer.send('check-for-updates');
});

// =====================
// 更新相关事件处理
// =====================

// 正在检查更新
ipcRenderer.on('checking-for-update', () => {
    statusText.textContent = '状态：正在检查更新...';
});

// 发现新版本
ipcRenderer.on('update-available', (event, info) => {
    statusText.innerHTML = `状态：发现新版本 ${info.version}<br>
      <div style="margin-top: 10px; text-align: left; font-size: 14px;">
        <strong>更新内容：</strong><br>
        <pre style="white-space: pre-wrap;">${info.releaseNotes || '无更新说明'}</pre>
        <button id="downloadUpdateBtn" style="background-color: #4CAF50; color: white; border: none; padding: 8px 16px; margin-top: 10px; cursor: pointer;">下载更新</button>
      </div>`;
    
    // 添加下载更新按钮事件
    setTimeout(() => {
        const downloadBtn = document.getElementById('downloadUpdateBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                statusText.innerHTML = '状态：正在下载更新...';
                ipcRenderer.send('download-update');
            });
        }
    }, 100);
});

// 没有可用更新
ipcRenderer.on('update-not-available', (event, info) => {
    statusText.textContent = '状态：当前已是最新版本';
    console.log('没有可用更新:', info);
});

// 更新错误
ipcRenderer.on('update-error', (event, err) => {
    statusText.textContent = '状态：检查更新失败';
    console.error('更新错误:', err);
});

// 下载进度
ipcRenderer.on('download-progress', (event, progressObj) => {
    statusText.textContent = `状态：正在下载更新 ${Math.round(progressObj.percent)}%`;
    console.log('下载进度:', progressObj);
});

// 更新已下载完成
ipcRenderer.on('update-downloaded', (event, info) => {
    statusText.innerHTML = `状态：新版本已下载完成，<button id="restartButton" style="background-color: #FF9800; color: white; border: none; padding: 8px 16px; cursor: pointer;">重启应用以完成更新</button>`;
    
    // 添加重启更新按钮事件
    setTimeout(() => {
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                ipcRenderer.send('quit-and-install');
            });
        }
    }, 100);
    
    console.log('更新下载完成:', info);
});