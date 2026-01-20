// js/app.js
// 应用状态管理
const AppState = {
    currentUser: null,
    users: JSON.parse(localStorage.getItem('boxUsers')) || [],
    boxes: JSON.parse(localStorage.getItem('boxInventory')) || {
        premium: { total: 10, remaining: 5, cost: 20000, name: '至尊宝箱' },
        regular: { total: 30, remaining: 18, cost: 6000, name: '战功宝箱' }
    },
    exchangeHistory: JSON.parse(localStorage.getItem('exchangeHistory')) || [],
    system: JSON.parse(localStorage.getItem('systemSettings')) || {
        exchangeEnabled: true,
        lastReset: new Date().toISOString(),
        nextPremiumOpen: getNextMonday10AM()
    },
    isLoginModalRegister: false
};

// 初始化应用
function initApp() {
    // 检查默认管理员账号
    if (!AppState.users.find(u => u.id === '5101115')) {
        AppState.users.push({
            id: '5101115',
            password: 'xh1314521..',
            points: 50000,
            isAdmin: true,
            lastPremiumExchange: null,
            lastWeeklyExchange: null,
            registered: new Date().toISOString()
        });
        saveUsers();
    }
    
    // 检查默认管理员账号2
    if (!AppState.users.find(u => u.id === '3523452809')) {
        AppState.users.push({
            id: '3523452809',
            password: 'xh1314521..',
            points: 50000,
            isAdmin: true,
            lastPremiumExchange: null,
            lastWeeklyExchange: null,
            registered: new Date().toISOString()
        });
        saveUsers();
    }
    
    // 初始化兑换历史
    if (AppState.exchangeHistory.length === 0) {
        AppState.exchangeHistory = [
            { userId: '5101115', boxType: 'premium', cost: 20000, date: getFormattedDate(-2), status: '已完成' },
            { userId: '1234567', boxType: 'regular', cost: 6000, date: getFormattedDate(-1), status: '已完成' }
        ];
        saveExchangeHistory();
    }
    
    updateUI();
    updateBoxDisplay();
    updateExchangeHistory();
    updateStats();
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupEventListeners();
    startCountdown();
});

// 设置事件监听器
function setupEventListeners() {
    // 登录/注册按钮
    document.getElementById('login-btn').addEventListener('click', showLoginModal);
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // 登录模态框
    document.getElementById('close-login').addEventListener('click', hideLoginModal);
    document.getElementById('submit-login').addEventListener('click', handleLoginSubmit);
    document.getElementById('switch-register').addEventListener('click', toggleLoginModalMode);
    
    // 兑换按钮
    document.querySelectorAll('.btn-exchange').forEach(btn => {
        btn.addEventListener('click', handleExchangeClick);
    });
    
    // 兑换模态框
    document.getElementById('close-exchange').addEventListener('click', hideExchangeModal);
    document.getElementById('cancel-exchange').addEventListener('click', hideExchangeModal);
    document.getElementById('confirm-exchange').addEventListener('click', confirmExchange);
    
    // GitHub 相关按钮
    document.getElementById('backup-data').addEventListener('click', backupToGitHub);
    document.getElementById('sync-data').addEventListener('click', syncFromGitHub);
    document.getElementById('export-data').addEventListener('click', exportData);
    
    // 账号输入限制
    const accountInput = document.getElementById('account');
    if (accountInput) {
        accountInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length > 7) this.value = this.value.slice(0, 7);
        });
    }
}

// 显示登录模态框
function showLoginModal() {
    document.getElementById('login-modal').classList.add('show');
    resetLoginForm();
}

// 隐藏登录模态框
function hideLoginModal() {
    document.getElementById('login-modal').classList.remove('show');
}

// 切换登录/注册模式
function toggleLoginModalMode() {
    const isRegister = AppState.isLoginModalRegister = !AppState.isLoginModalRegister;
    const confirmGroup = document.getElementById('confirm-password-group');
    const submitBtn = document.getElementById('submit-login');
    const switchBtn = document.getElementById('switch-register');
    
    if (isRegister) {
        confirmGroup.style.display = 'block';
        submitBtn.textContent = '注册';
        submitBtn.className = 'btn btn-success';
        switchBtn.textContent = '返回登录';
    } else {
        confirmGroup.style.display = 'none';
        submitBtn.textContent = '登录';
        submitBtn.className = 'btn btn-primary';
        switchBtn.textContent = '注册新账号';
    }
    
    document.getElementById('login-message').style.display = 'none';
}

// 处理登录/注册提交
function handleLoginSubmit() {
    const account = document.getElementById('account').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    const isRegister = AppState.isLoginModalRegister;
    const messageEl = document.getElementById('login-message');
    
    // 验证账号
    if (account.length !== 7 || !/^\d+$/.test(account)) {
        showMessage(messageEl, '账号必须是7位数字', 'error');
        return;
    }
    
    // 验证密码
    if (password.length < 4) {
        showMessage(messageEl, '密码至少需要4位字符', 'error');
        return;
    }
    
    // 如果是注册，验证确认密码
    if (isRegister && password !== confirmPassword) {
        showMessage(messageEl, '两次输入的密码不一致', 'error');
        return;
    }
    
    if (isRegister) {
        // 注册新用户
        if (AppState.users.find(u => u.id === account)) {
            showMessage(messageEl, '账号已存在，请直接登录', 'error');
            return;
        }
        
        const newUser = {
            id: account,
            password: password,
            points: 0,
            isAdmin: false,
            lastPremiumExchange: null,
            lastWeeklyExchange: null,
            registered: new Date().toISOString()
        };
        
        AppState.users.push(newUser);
        saveUsers();
        AppState.currentUser = newUser;
        showMessage(messageEl, '注册成功！已自动登录', 'success');
        
        setTimeout(() => {
            hideLoginModal();
            updateUI();
            updateStats();
        }, 1500);
    } else {
        // 登录
        const user = AppState.users.find(u => u.id === account && u.password === password);
        if (!user) {
            showMessage(messageEl, '账号或密码错误', 'error');
            return;
        }
        
        AppState.currentUser = user;
        showMessage(messageEl, '登录成功！', 'success');
        
        setTimeout(() => {
            hideLoginModal();
            updateUI();
            updateStats();
        }, 1000);
    }
}

// 登出
function logout() {
    if (confirm('确定要退出登录吗？')) {
        AppState.currentUser = null;
        updateUI();
    }
}

// 处理兑换按钮点击
function handleExchangeClick(e) {
    if (!AppState.currentUser) {
        showLoginModal();
        return;
    }
    
    const boxType = e.currentTarget.getAttribute('data-box');
    const box = AppState.boxes[boxType];
    
    // 检查兑换系统是否开启
    if (!AppState.system.exchangeEnabled && !AppState.currentUser.isAdmin) {
        alert('兑换系统暂时关闭');
        return;
    }
    
    // 检查每周兑换限制
    const lastWeeklyExchange = AppState.currentUser.lastWeeklyExchange ? 
        new Date(AppState.currentUser.lastWeeklyExchange) : null;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    if (lastWeeklyExchange && lastWeeklyExchange > oneWeekAgo) {
        alert('本周已兑换过宝箱，请下周再来');
        return;
    }
    
    // 检查至尊宝箱冷却时间
    if (boxType === 'premium') {
        const lastPremiumExchange = AppState.currentUser.lastPremiumExchange ? 
            new Date(AppState.currentUser.lastPremiumExchange) : null;
        
        if (lastPremiumExchange && lastPremiumExchange > oneWeekAgo) {
            alert('至尊宝箱兑换需间隔一周，请下周再来');
            return;
        }
        
        // 检查至尊宝箱是否已开启
        const nextOpen = new Date(AppState.system.nextPremiumOpen);
        if (now < nextOpen && !AppState.currentUser.isAdmin) {
            alert('至尊宝箱每周一10:00开启，请等待');
            return;
        }
    }
    
    // 检查积分是否足够
    if (AppState.currentUser.points < box.cost) {
        alert('积分不足，无法兑换');
        return;
    }
    
    // 检查宝箱库存
    if (box.remaining <= 0) {
        alert('该宝箱已兑换完，请选择其他宝箱');
        return;
    }
    
    // 显示确认弹窗
    if (confirm(`确定要兑换${box.name}吗？\n需要消耗${box.cost}积分`)) {
        // 执行兑换
        AppState.currentUser.points -= box.cost;
        box.remaining -= 1;
        
        // 更新兑换记录
        const exchangeRecord = {
            userId: AppState.currentUser.id,
            boxType: boxType,
            cost: box.cost,
            date: getFormattedDate(),
            status: '已完成'
        };
        
        AppState.exchangeHistory.unshift(exchangeRecord);
        
        // 更新用户兑换时间
        AppState.currentUser.lastWeeklyExchange = new Date().toISOString();
        if (boxType === 'premium') {
            AppState.currentUser.lastPremiumExchange = new Date().toISOString();
        }
        
        // 保存更改
        saveUsers();
        saveBoxInventory();
        saveExchangeHistory();
        
        // 更新UI
        updateUI();
        updateBoxDisplay();
        updateExchangeHistory();
        updateStats();
        
        alert(`兑换成功！扣除${box.cost}积分`);
        
        // 尝试备份到 GitHub
        backupExchangeToGitHub(exchangeRecord);
    }
}

// 更新宝箱显示
function updateBoxDisplay() {
    document.getElementById('premium-stock').textContent = 
        `剩余: ${AppState.boxes.premium.remaining}/${AppState.boxes.premium.total}`;
    
    document.getElementById('regular-stock').textContent = 
        `剩余: ${AppState.boxes.regular.remaining}/${AppState.boxes.regular.total}`;
    
    // 更新库存状态样式
    const premiumStock = document.getElementById('premium-stock');
    const regularStock = document.getElementById('regular-stock');
    
    premiumStock.className = 'box-stock';
    regularStock.className = 'box-stock';
    
    if (AppState.boxes.premium.remaining <= 2) {
        premiumStock.classList.add('low');
    }
    
    if (AppState.boxes.regular.remaining <= 5) {
        regularStock.classList.add('low');
    }
}

// 更新兑换记录
function updateExchangeHistory() {
    const historyBody = document.getElementById('history-body');
    const userHistory = AppState.currentUser ? 
        AppState.exchangeHistory.filter(record => record.userId === AppState.currentUser.id) : [];
    
    if (userHistory.length === 0) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px;">暂无兑换记录</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    userHistory.slice(0, 10).forEach(record => {
        const boxName = record.boxType === 'premium' ? '至尊宝箱' : '战功宝箱';
        html += `
            <tr>
                <td>${record.date}</td>
                <td>${boxName}</td>
                <td>${record.cost}</td>
                <td>${record.status}</td>
            </tr>
        `;
    });
    
    historyBody.innerHTML = html;
}

// 更新UI
function updateUI() {
    const isLoggedIn = AppState.currentUser !== null;
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userIdEl = document.getElementById('user-id');
    const userPointsEl = document.getElementById('user-points');
    const statusText = document.getElementById('status-text');
    const availableText = document.getElementById('available-text');
    const cooldownText = document.getElementById('cooldown-text');
    const exchangedText = document.getElementById('exchanged-text');
    
    if (isLoggedIn) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-flex';
        userIdEl.textContent = AppState.currentUser.id;
        userPointsEl.textContent = AppState.currentUser.points;
        statusText.textContent = AppState.currentUser.isAdmin ? '管理员' : '普通用户';
        statusText.style.color = AppState.currentUser.isAdmin ? 'var(--accent)' : 'var(--secondary)';
        
        // 检查兑换资格
        const lastWeeklyExchange = AppState.currentUser.lastWeeklyExchange ? 
            new Date(AppState.currentUser.lastWeeklyExchange) : null;
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        if (lastWeeklyExchange && lastWeeklyExchange > oneWeekAgo) {
            availableText.textContent = '不可兑换';
            availableText.style.color = 'var(--accent)';
            
            // 计算剩余天数
            const nextExchange = new Date(lastWeeklyExchange.getTime() + 7 * 24 * 60 * 60 * 1000);
            const daysLeft = Math.ceil((nextExchange - now) / (1000 * 60 * 60 * 24));
            exchangedText.textContent = `${daysLeft}天后可兑换`;
        } else {
            availableText.textContent = '可兑换';
            availableText.style.color = 'var(--success)';
            exchangedText.textContent = '无';
        }
        
        // 检查至尊宝箱冷却
        const lastPremiumExchange = AppState.currentUser.lastPremiumExchange ? 
            new Date(AppState.currentUser.lastPremiumExchange) : null;
        
        if (lastPremiumExchange && lastPremiumExchange > oneWeekAgo) {
            const nextPremium = new Date(lastPremiumExchange.getTime() + 7 * 24 * 60 * 60 * 1000);
            const daysLeft = Math.ceil((nextPremium - now) / (1000 * 60 * 60 * 24));
            cooldownText.textContent = `${daysLeft}天`;
            cooldownText.style.color = 'var(--accent)';
        } else {
            cooldownText.textContent = '无冷却';
            cooldownText.style.color = 'var(--success)';
        }
    } else {
        loginBtn.style.display = 'inline-flex';
        logoutBtn.style.display = 'none';
        userIdEl.textContent = '未登录';
        userPointsEl.textContent = '0';
        statusText.textContent = '未登录';
        availableText.textContent = '-';
        cooldownText.textContent = '-';
        exchangedText.textContent = '-';
    }
}

// 更新统计信息
function updateStats() {
    document.getElementById('local-users').textContent = AppState.users.length;
    document.getElementById('total-exchanges').textContent = AppState.exchangeHistory.length;
    
    // 从 localStorage 获取 GitHub 备份计数
    const githubBackups = localStorage.getItem('githubBackupCount') || '0';
    document.getElementById('github-backups').textContent = githubBackups;
}

// 启动倒计时
function startCountdown() {
    function updateCountdown() {
        const now = new Date();
        const nextOpen = new Date(AppState.system.nextPremiumOpen);
        
        // 如果已经过了下次开启时间，计算下下周
        if (now > nextOpen) {
            nextOpen.setDate(nextOpen.getDate() + 7);
            AppState.system.nextPremiumOpen = nextOpen.toISOString();
            saveSystemSettings();
        }
        
        const diff = nextOpen - now;
        
        if (diff <= 0) {
            document.getElementById('countdown-timer').textContent = '已开启';
            return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('countdown-timer').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// 备份数据到 GitHub Issues
async function backupToGitHub() {
    const statusEl = document.getElementById('sync-status');
    
    try {
        // 创建备份数据
        const backupData = {
            timestamp: new Date().toISOString(),
            users: AppState.users,
            boxes: AppState.boxes,
            exchangeHistory: AppState.exchangeHistory,
            system: AppState.system
        };
        
        // 保存到 localStorage（作为本地备份）
        localStorage.setItem('boxBackup_' + Date.now(), JSON.stringify(backupData));
        
        // 更新备份计数
        let backupCount = parseInt(localStorage.getItem('githubBackupCount') || '0');
        backupCount++;
        localStorage.setItem('githubBackupCount', backupCount.toString());
        
        // 显示成功消息
        statusEl.innerHTML = '<span class="message success">数据已备份到本地！</span>';
        updateStats();
        
        // 尝试使用 GitHub API（需要 GitHub Token）
        await backupToGitHubIssues(backupData);
        
        setTimeout(() => {
            statusEl.innerHTML = '';
        }, 3000);
        
    } catch (error) {
        console.error('备份失败:', error);
        statusEl.innerHTML = '<span class="message error">本地备份成功，GitHub备份失败（需要配置Token）</span>';
    }
}

// 从 GitHub 同步数据
async function syncFromGitHub() {
    const statusEl = document.getElementById('sync-status');
    
    try {
        // 从 localStorage 获取最新备份
        const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('boxBackup_'));
        if (backupKeys.length === 0) {
            statusEl.innerHTML = '<span class="message info">没有找到本地备份数据</span>';
            return;
        }
        
        // 获取最新的备份
        backupKeys.sort().reverse();
        const latestBackup = JSON.parse(localStorage.getItem(backupKeys[0]));
        
        // 确认是否恢复
        if (confirm('确定要从备份恢复数据吗？当前数据将被覆盖。')) {
            AppState.users = latestBackup.users || AppState.users;
            AppState.boxes = latestBackup.boxes || AppState.boxes;
            AppState.exchangeHistory = latestBackup.exchangeHistory || AppState.exchangeHistory;
            AppState.system = latestBackup.system || AppState.system;
            
            // 保存到 localStorage
            saveAllData();
            
            // 更新UI
            updateUI();
            updateBoxDisplay();
            updateExchangeHistory();
            updateStats();
            
            statusEl.innerHTML = '<span class="message success">数据恢复成功！</span>';
        }
        
        setTimeout(() => {
            statusEl.innerHTML = '';
        }, 3000);
        
    } catch (error) {
        console.error('同步失败:', error);
        statusEl.innerHTML = '<span class="message error">数据恢复失败</span>';
    }
}

// 导出数据
function exportData() {
    const exportData = {
        users: AppState.users,
        boxes: AppState.boxes,
        exchangeHistory: AppState.exchangeHistory,
        system: AppState.system,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // 创建下载链接
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(dataBlob);
    downloadLink.download = `box-exchange-backup-${getFormattedDate()}.json`;
    
    // 触发下载
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    alert('数据导出成功！');
}

// 工具函数
function showMessage(element, text, type) {
    element.textContent = text;
    element.className = `message ${type}`;
    element.style.display = 'block';
}

function getNextMonday10AM() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    const nextMonday = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
    nextMonday.setHours(10, 0, 0, 0);
    
    if (now > nextMonday) {
        nextMonday.setDate(nextMonday.getDate() + 7);
    }
    
    return nextMonday.toISOString();
}

function getFormattedDate(daysOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
}

function resetLoginForm() {
    document.getElementById('account').value = '';
    document.getElementById('password').value = '';
    document.getElementById('confirm-password').value = '';
    document.getElementById('login-message').style.display = 'none';
    AppState.isLoginModalRegister = false;
    toggleLoginModalMode();
}

// 数据存储函数
function saveUsers() {
    localStorage.setItem('boxUsers', JSON.stringify(AppState.users));
}

function saveBoxInventory() {
    localStorage.setItem('boxInventory', JSON.stringify(AppState.boxes));
}

function saveExchangeHistory() {
    localStorage.setItem('exchangeHistory', JSON.stringify(AppState.exchangeHistory));
}

function saveSystemSettings() {
    localStorage.setItem('systemSettings', JSON.stringify(AppState.system));
}

function saveAllData() {
    saveUsers();
    saveBoxInventory();
    saveExchangeHistory();
    saveSystemSettings();
}
