// js/github-api.js
// GitHub API 配置
const GITHUB_CONFIG = {
    owner: '你的GitHub用户名',  // 需要修改
    repo: 'box-exchange',       // 需要修改
    token: '',                  // 可选：GitHub Personal Access Token
    issueLabels: ['box-exchange-data']
};

// 检查 GitHub Token 配置
function checkGitHubConfig() {
    if (!GITHUB_CONFIG.token) {
        console.warn('GitHub Token 未配置，部分功能将不可用');
        console.info('请到 GitHub → Settings → Developer settings → Personal access tokens 创建 token');
        console.info('Token 需要 repo 权限');
        return false;
    }
    return true;
}

// 备份兑换记录到 GitHub Issues
async function backupExchangeToGitHub(exchangeRecord) {
    if (!checkGitHubConfig()) return;
    
    try {
        const issueTitle = `兑换记录备份 ${exchangeRecord.date}`;
        const issueBody = `
## 兑换记录备份

**用户**: ${exchangeRecord.userId}
**宝箱类型**: ${exchangeRecord.boxType === 'premium' ? '至尊宝箱' : '战功宝箱'}
**消耗积分**: ${exchangeRecord.cost}
**兑换日期**: ${exchangeRecord.date}
**状态**: ${exchangeRecord.status}

## 原始数据
\`\`\`json
${JSON.stringify(exchangeRecord, null, 2)}
\`\`\`
        `;
        
        const response = await createGitHubIssue(issueTitle, issueBody);
        
        if (response) {
            console.log('兑换记录已备份到 GitHub Issues:', response.html_url);
            
            // 更新备份计数
            let backupCount = parseInt(localStorage.getItem('githubExchangeBackupCount') || '0');
            backupCount++;
            localStorage.setItem('githubExchangeBackupCount', backupCount.toString());
        }
    } catch (error) {
        console.error('GitHub Issues 备份失败:', error);
    }
}

// 创建 GitHub Issue
async function createGitHubIssue(title, body) {
    if (!checkGitHubConfig()) return null;
    
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                title: title,
                body: body,
                labels: GITHUB_CONFIG.issueLabels
            })
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API 错误: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('创建 GitHub Issue 失败:', error);
        return null;
    }
}

// 获取 GitHub Issues
async function getGitHubIssues() {
    if (!checkGitHubConfig()) return [];
    
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues?labels=${GITHUB_CONFIG.issueLabels.join(',')}`, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API 错误: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('获取 GitHub Issues 失败:', error);
        return [];
    }
}

// 备份完整数据到 GitHub Gist（替代方案）
async function backupToGitHubGist(data) {
    if (!checkGitHubConfig()) return null;
    
    try {
        const gistData = {
            description: `宝箱兑换系统备份 ${new Date().toLocaleString()}`,
            public: false,
            files: {
                'box-exchange-backup.json': {
                    content: JSON.stringify(data, null, 2)
                }
            }
        };
        
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(gistData)
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API 错误: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('数据已备份到 GitHub Gist:', result.html_url);
        return result;
    } catch (error) {
        console.error('GitHub Gist 备份失败:', error);
        return null;
    }
}

// 创建 GitHub 配置文件（在首次部署时运行）
function createGitHubConfigFile() {
    const config = {
        lastUpdated: new Date().toISOString(),
        totalUsers: AppState.users.length,
        totalExchanges: AppState.exchangeHistory.length,
        boxes: AppState.boxes
    };
    
    const configStr = JSON.stringify(config, null, 2);
    const blob = new Blob([configStr], { type: 'application/json' });
    
    // 提供下载
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'github-deploy-config.json';
    link.click();
    
    console.log('GitHub 配置文件已生成，请上传到仓库根目录');
}

// 导出函数供其他文件使用
window.GitHubAPI = {
    backupExchangeToGitHub,
    backupToGitHubGist,
    getGitHubIssues,
    createGitHubConfigFile,
    checkGitHubConfig
};
