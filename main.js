const { app, BrowserWindow, Tray, Menu, ipcMain, shell, screen } = require('electron');
const path = require('path');
const { Notification } = require('electron');
const { autoUpdater } = require("electron-updater");

// 保持对窗口对象的全局引用，否则窗口将被JavaScript垃圾回收自动关闭
// 配置自动更新
autoUpdater.autoDownload = false; // 不自动下载更新

let mainWindow;
let tray = null;
let notificationInterval = null;
let isPaused = false;

// 站立提醒间隔时间（毫秒）- 默认60分钟
let intervalTime = 60 * 60 * 1000;

function createWindow() {
  // 创建浏览器窗口
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 加载应用的 index.html
  mainWindow.loadFile('index.html');

  // 打开开发者工具
  // mainWindow.webContents.openDevTools();

  // 当窗口关闭时触发
  mainWindow.on('closed', function () {
    // 取消对窗口对象的引用，通常会存储窗口在数组中，这是删除相应元素的时候
    mainWindow = null;
  });
}

function createTray() {
  try {
    tray = new Tray(path.join(__dirname, 'assets/icon.png'));
  } catch (error) {
    // 如果图标文件不存在，则创建一个空的托盘对象
    console.log('图标文件不存在，使用默认系统托盘');
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: '暂停提醒',
      click: () => {
        isPaused = true;
        clearInterval(notificationInterval);
        updateTrayContextMenu();
      }
    },
    {
      label: '检查更新',
      click: () => {
        checkForUpdates();
      }
    },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  if (tray) {
    tray.setContextMenu(contextMenu);
    tray.setToolTip('站立提醒系统');
    tray.on('click', () => {
      mainWindow.show();
    });
  }
}

function updateTrayContextMenu() {
  if (!tray) return;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: isPaused ? '恢复提醒' : '暂停提醒',
      click: () => {
        isPaused = !isPaused;
        if (isPaused) {
          clearInterval(notificationInterval);
        } else {
          startNotifications();
        }
        updateTrayContextMenu();
      }
    },
    {
      label: '检查更新',
      click: () => {
        checkForUpdates();
      }
    },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
}

function showNotification() {
  if (isPaused) return;
  
  // 显示桌面通知
  const notification = new Notification({
    title: '站立提醒',
    body: '是时候站起来活动一下了！长时间坐着对健康有害。'
  });
  
  notification.show();
  
  // 点击通知时显示主窗口
  notification.on('click', () => {
    mainWindow.show();
  });
}

function startNotifications() {
  // 清除之前的定时器
  if (notificationInterval) {
    clearInterval(notificationInterval);
  }
  
  // 设置新的定时器
  notificationInterval = setInterval(showNotification, intervalTime);
}

// Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow();
  createTray();
  startNotifications();
  
  // 检查更新（开发环境不检查）
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdates();
  }
  
  app.on('activate', function () {
    // 通常在 macOS 上，当点击 dock 图标且没有其他窗口打开时，会重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', function () {
  // 在 macOS 上，除非用户用 Cmd + Q 确定退出，否则应用和菜单栏会保持运行
  if (process.platform !== 'darwin') app.quit();
});

// 监听渲染进程发送的消息
ipcMain.on('update-interval', (event, minutes) => {
  intervalTime = minutes * 60 * 1000;
  startNotifications();
});

ipcMain.on('show-notification', () => {
  showNotification();
});

ipcMain.on('toggle-pause', (event, pause) => {
  isPaused = pause;
  if (isPaused) {
    clearInterval(notificationInterval);
  } else {
    startNotifications();
  }
  updateTrayContextMenu();
});

// 监听渲染进程发送的消息
ipcMain.on('check-for-updates', () => {
  checkForUpdates();
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

// 自动更新相关函数
function checkForUpdates() {
  if (mainWindow) {
    mainWindow.webContents.send('checking-for-update');
  }
  autoUpdater.checkForUpdates();
}

autoUpdater.on('checking-for-update', () => {
  if (mainWindow) {
    mainWindow.webContents.send('checking-for-update');
  }
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available', info);
  }
});

autoUpdater.on('error', (err) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});