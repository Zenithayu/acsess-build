// ============================================================
// AKSAKA BOT BUILD - SCRIPT
// AUTO GENERATE - ROLE MANAGEMENT
// TERHUBUNG DENGAN GITHUB RAW & AUTO SAVE
// ============================================================

// ============================================================
// KONFIGURASI GITHUB - GANTI INI!
// ============================================================
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/database.json';
const GITHUB_REPO = 'YOUR_USERNAME/YOUR_REPO';
const GITHUB_BRANCH = 'main';
const GITHUB_PATH = 'database.json';

// ============================================================
// STATE
// ============================================================
const state = {
    currentUser: null,
    currentRole: null,
    tokens: [],
    users: [],
    roleLevel: 0,
    tokenOwners: {}
};

// Role levels
const ROLE_LEVELS = {
    'Full Up': 0,
    'Reseller': 1,
    'Owner': 2,
    'Owner VIP': 3,
    'Developer': 4
};

const ROLE_NAMES = ['Full Up', 'Reseller', 'Owner', 'Owner VIP', 'Developer'];

// ============================================================
// DOM REFS
// ============================================================
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ============================================================
// GENERATE FUNCTIONS
// ============================================================
function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const numbers = Math.floor(10000000 + Math.random() * 90000000);
    return `${numbers}...${token}`;
}

function generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

function generateKey(name) {
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${clean}_${suffix}`;
}

// ============================================================
// GITHUB DATABASE FUNCTIONS
// ============================================================
function getGithubToken() {
    return localStorage.getItem('github_token') || '';
}

// ============================================================
// LOAD DATA - DARI GITHUB RAW
// ============================================================
async function loadData() {
    try {
        const response = await fetch(GITHUB_RAW_URL);
        if (response.ok) {
            const data = await response.json();
            
            if (data.users && data.users.length > 0) {
                state.users = data.users;
            } else {
                state.users = [
                    { id: 'user_1700000000000', name: 'Admin AKSAKA', key: 'admin123', role: 'Owner' },
                ];
            }
            
            if (data.tokens && data.tokens.length > 0) {
                state.tokens = data.tokens.map(t => t.token);
                state.tokenOwners = {};
                data.tokens.forEach(t => {
                    state.tokenOwners[t.token] = t.owner;
                });
            } else {
                const token = generateToken();
                state.tokens = [token];
                state.tokenOwners[token] = 'Admin AKSAKA';
            }
            
            console.log('✅ Data berhasil diambil dari GitHub');
        } else {
            console.log('⚠️ Gagal ambil dari GitHub, pakai default');
            setDefaultData();
        }
    } catch (e) {
        console.log('⚠️ Error fetch GitHub:', e.message);
        setDefaultData();
    }
    
    updateStats();
    renderTokens();
    renderUsers();
    updateAllowedRoles();
    
    $('tokenBadge').textContent = state.tokens.length;
    $('userBadge').textContent = state.users.length;
    $('tokenCount').textContent = `${state.tokens.length} token`;
    $('userCount').textContent = `${state.users.length} user`;
}

function setDefaultData() {
    state.users = [
        { id: 'user_1700000000000', name: 'Admin AKSAKA', key: 'admin123', role: 'Owner' },
    ];
    const token = generateToken();
    state.tokens = [token];
    state.tokenOwners[token] = 'Admin AKSAKA';
}

// ============================================================
// UPDATE DATA KE GITHUB
// ============================================================
async function updateRemoteDb() {
    try {
        const token = getGithubToken();
        if (!token) {
            showToast('Token GitHub tidak ditemukan! Masukkan di Pengaturan.', 'error');
            return false;
        }
        
        const data = {
            users: state.users,
            tokens: state.tokens.map(t => ({
                token: t,
                owner: state.tokenOwners[t] || 'Unknown'
            })),
            lastUpdated: new Date().toISOString()
        };
        
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        
        // Get SHA file
        const getUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}?ref=${GITHUB_BRANCH}`;
        const getRes = await fetch(getUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json'
            }
        });
        
        let sha = null;
        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }
        
        // Update file
        const putUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
        const putRes = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github+json'
            },
            body: JSON.stringify({
                message: 'Update database via panel AKSAKA BOT BUILD',
                content: content,
                branch: GITHUB_BRANCH,
                sha: sha || undefined
            })
        });
        
        if (putRes.ok) {
            showToast('Data berhasil disimpan ke GitHub!', 'success');
            return true;
        } else {
            const err = await putRes.text();
            showToast(`Gagal simpan: ${err}`, 'error');
            return false;
        }
    } catch (e) {
        showToast(`Error: ${e.message}`, 'error');
        return false;
    }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Load GitHub token dari localStorage
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
        const input = $('settingGithubToken');
        if (input) input.value = savedToken;
    }
    
    // Load URL dari localStorage
    const savedUrl = localStorage.getItem('github_raw_url');
    if (savedUrl) {
        const input = $('settingDbUrl');
        if (input) input.value = savedUrl;
    }
    
    checkLogin();
    setupEventListeners();
    loadData();
});

// ============================================================
// CHECK LOGIN
// ============================================================
function checkLogin() {
    const saved = localStorage.getItem('aksaka_session');
    if (saved) {
        try {
            const session = JSON.parse(saved);
            state.currentUser = session.user;
            state.currentRole = session.role;
            updateUserUI();
            updateAllowedRoles();
        } catch (e) {
            localStorage.removeItem('aksaka_session');
        }
    }
}

function updateAllowedRoles() {
    const role = state.currentRole || 'Full Up';
    const level = ROLE_LEVELS[role] || 0;
    const allowed = ROLE_NAMES.slice(level + 1);
    
    const allowedText = allowed.length > 0 ? allowed.join(', ') : 'tidak ada';
    $('allowedRoles').textContent = allowedText;
    
    const select = $('addUserRole');
    if (select) {
        const currentVal = select.value;
        select.innerHTML = '';
        allowed.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            select.appendChild(opt);
        });
        if (allowed.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Tidak ada role yang bisa ditambah';
            select.appendChild(opt);
        }
        if (allowed.includes(currentVal)) {
            select.value = currentVal;
        }
    }
}

function updateUserUI() {
    if (state.currentUser) {
        const name = state.currentUser.name || state.currentUser.username || 'User';
        $('sidebarUserName').textContent = name;
        $('sidebarUserRole').textContent = state.currentRole || 'User';
        $('btnLogoutSmall').style.display = 'flex';
        $('btnLogoutHeader').style.display = 'flex';
        $('btnLogin').style.display = 'none';
        
        state.roleLevel = ROLE_LEVELS[state.currentRole] || 0;
        $('roleLevel').textContent = state.roleLevel;
        $('roleLevelDisplay').textContent = `Role Level: ${state.roleLevel}`;
    }
}

// ============================================================
// LOGIN
// ============================================================
function showLogin() {
    const body = `
        <div class="form-group">
            <label>Key Login</label>
            <input type="text" id="loginKey" placeholder="Masukkan key login..." class="form-control">
        </div>
        <button class="btn-primary" id="btnLoginSubmit" style="width:100%; justify-content:center;">
            <i class="fas fa-sign-in-alt"></i> Login
        </button>
        <div style="margin-top:12px; text-align:center; font-size:12px; color:var(--text-secondary);">
            <p>Demo Login:</p>
            <p>Owner: <code>admin</code> | Reseller: <code>reseller</code></p>
            <p>Full Up: <code>fullup</code> | Developer: <code>dev</code></p>
            <p>Atau pake key: <code>admin123</code></p>
        </div>
    `;
    
    openModal('Login - AKSAKA BOT BUILD', body);
    
    $('btnLoginSubmit').addEventListener('click', () => {
        const key = $('loginKey').value.trim();
        
        const user = state.users.find(u => u.key === key);
        
        if (user) {
            state.currentUser = user;
            state.currentRole = user.role;
            localStorage.setItem('aksaka_session', JSON.stringify({
                user: user,
                role: user.role
            }));
            closeModal();
            updateUserUI();
            updateAllowedRoles();
            loadData();
            showToast(`Selamat datang, ${user.name}!`, 'success');
        } else {
            const demos = {
                'admin': { name: 'Admin', role: 'Owner' },
                'reseller': { name: 'Reseller 1', role: 'Reseller' },
                'fullup': { name: 'Full Up User', role: 'Full Up' },
                'dev': { name: 'Developer', role: 'Developer' }
            };
            
            if (demos[key]) {
                const demoUser = {
                    id: `user_${Date.now()}`,
                    name: demos[key].name,
                    key: key,
                    role: demos[key].role
                };
                state.currentUser = demoUser;
                state.currentRole = demoUser.role;
                localStorage.setItem('aksaka_session', JSON.stringify({
                    user: demoUser,
                    role: demoUser.role
                }));
                closeModal();
                updateUserUI();
                updateAllowedRoles();
                loadData();
                showToast(`Selamat datang, ${demoUser.name}!`, 'success');
            } else {
                showToast('Key tidak valid!', 'error');
            }
        }
    });
}

function logout() {
    localStorage.removeItem('aksaka_session');
    state.currentUser = null;
    state.currentRole = null;
    $('sidebarUserName').textContent = 'Guest';
    $('sidebarUserRole').textContent = 'Belum Login';
    $('btnLogoutSmall').style.display = 'none';
    $('btnLogoutHeader').style.display = 'none';
    $('btnLogin').style.display = 'block';
    $('roleLevel').textContent = '0';
    $('roleLevelDisplay').textContent = 'Role Level: 0';
    showToast('Logout berhasil', 'info');
    loadData();
}

// ============================================================
// SETUP EVENT LISTENERS
// ============================================================
function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            const page = item.dataset.page;
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const target = document.getElementById(`page-${page}`);
            if (target) target.classList.add('active');
            
            const titleMap = {
                'dashboard': 'Dashboard',
                'tokens': 'Daftar Token',
                'users': 'Kelola User',
                'adduser': 'Tambah User',
                'settings': 'Pengaturan'
            };
            $('pageTitle').textContent = titleMap[page] || page;
            
            if (window.innerWidth <= 768) {
                $('sidebar').classList.remove('open');
            }
        });
    });
    
    $('btnMenuToggle').addEventListener('click', () => {
        $('sidebar').classList.toggle('open');
    });
    
    $('btnRefresh').addEventListener('click', () => {
        loadData();
        showToast('Data diperbarui', 'success');
    });
    $('btnRefreshUsers').addEventListener('click', () => {
        loadData();
        showToast('Data user diperbarui', 'success');
    });
    
    $('btnLogin').addEventListener('click', showLogin);
    $('btnLogoutSmall').addEventListener('click', logout);
    $('btnLogoutHeader').addEventListener('click', logout);
    
    $('btnAddToken').addEventListener('click', () => {
        if (!state.currentUser) {
            showToast('Silakan login terlebih dahulu!', 'error');
            return;
        }
        showAddTokenModal();
    });
    $('quickAddToken').addEventListener('click', () => {
        if (!state.currentUser) {
            showToast('Silakan login terlebih dahulu!', 'error');
            return;
        }
        showAddTokenModal();
    });
    
    $('btnAddUserPage').addEventListener('click', () => {
        if (!state.currentUser) {
            showToast('Silakan login terlebih dahulu!', 'error');
            return;
        }
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector('[data-page="adduser"]').classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-adduser').classList.add('active');
        $('pageTitle').textContent = 'Tambah User';
    });
    $('quickAddUser').addEventListener('click', () => {
        if (!state.currentUser) {
            showToast('Silakan login terlebih dahulu!', 'error');
            return;
        }
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector('[data-page="adduser"]').classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-adduser').classList.add('active');
        $('pageTitle').textContent = 'Tambah User';
    });
    
    $('btnAddUserSubmit').addEventListener('click', () => {
        if (!state.currentUser) {
            showToast('Silakan login terlebih dahulu!', 'error');
            return;
        }
        addUser();
    });
    
    $('addUserName').addEventListener('input', () => {
        const name = $('addUserName').value.trim();
        if (name) {
            $('addUserKey').value = generateKey(name);
        }
    });
    
    // === SAVE TO GITHUB ===
    $('btnSaveToGit').addEventListener('click', async () => {
        if (state.currentRole !== 'Owner') {
            showToast('Hanya Owner!', 'error');
            return;
        }
        
        // Simpan token GitHub
        const token = $('settingGithubToken').value.trim();
        if (token) {
            localStorage.setItem('github_token', token);
        }
        
        // Simpan URL
        const url = $('settingDbUrl').value.trim();
        if (url) {
            localStorage.setItem('github_raw_url', url);
        }
        
        await updateRemoteDb();
    });
    
    // === SYNC DB ===
    $('btnSyncDb').addEventListener('click', async () => {
        if (state.currentRole !== 'Owner') {
            showToast('Hanya Owner!', 'error');
            return;
        }
        await loadData();
        showToast('Database berhasil disinkronisasi dari GitHub!', 'success');
    });
    
    // === REVOKE ALL ===
    $('btnRevokeAll').addEventListener('click', () => {
        if (state.currentRole !== 'Owner') {
            showToast('Hanya Owner!', 'error');
            return;
        }
        if (confirm('Yakin ingin merevoke semua token?')) {
            state.tokens = [];
            state.tokenOwners = {};
            renderTokens();
            updateStats();
            updateRemoteDb();
            showToast('Semua token telah direvoke!', 'warning');
        }
    });
    
    // === SAVE GITHUB TOKEN ON CHANGE ===
    $('settingGithubToken').addEventListener('change', () => {
        const token = $('settingGithubToken').value.trim();
        if (token) {
            localStorage.setItem('github_token', token);
        }
    });
    
    $('settingDbUrl').addEventListener('change', () => {
        const url = $('settingDbUrl').value.trim();
        if (url) {
            localStorage.setItem('github_raw_url', url);
        }
    });
    
    $('modalClose').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
}

// ============================================================
// UPDATE STATS
// ============================================================
function updateStats() {
    $('totalTokens').textContent = state.tokens.length;
    $('totalUsers').textContent = state.users.length;
}

// ============================================================
// RENDER TOKENS
// ============================================================
function renderTokens() {
    const grid = $('tokenGrid');
    if (state.tokens.length === 0) {
        grid.innerHTML = `<div class="empty-state">Belum ada token</div>`;
        return;
    }
    
    grid.innerHTML = state.tokens.map((t, i) => {
        const owner = state.tokenOwners[t] || 'Unknown';
        return `
        <div class="token-row">
            <span class="token-text">${t}</span>
            <span style="font-size:11px; color:var(--text-secondary);">👤 ${owner}</span>
            <div class="token-actions">
                <button class="btn-delete-token" onclick="deleteToken(${i})" title="Hapus token">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `}).join('');
    
    const recent = $('recentTokenList');
    const last3 = state.tokens.slice(-3);
    if (last3.length === 0) {
        recent.innerHTML = `<div class="empty-state">Belum ada token</div>`;
    } else {
        recent.innerHTML = last3.map(t => `
            <div class="token-item">
                <span class="token-code">${t}</span>
                <span class="token-status">● Aktif</span>
                <span style="font-size:11px; color:var(--text-secondary);">👤 ${state.tokenOwners[t] || 'Unknown'}</span>
            </div>
        `).join('');
    }
}

// ============================================================
// RENDER USERS
// ============================================================
function renderUsers() {
    const tbody = $('userTableBody');
    if (state.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada user</td></tr>`;
        return;
    }
    
    const tokenCount = {};
    state.tokens.forEach(t => {
        const owner = state.tokenOwners[t] || 'Unknown';
        tokenCount[owner] = (tokenCount[owner] || 0) + 1;
    });
    
    tbody.innerHTML = state.users.map((u, i) => {
        const roleClass = u.role.toLowerCase().replace(' ', '');
        const count = tokenCount[u.name] || 0;
        return `
        <tr>
            <td><code>${u.id}</code></td>
            <td><strong>${u.name}</strong></td>
            <td><span class="role-badge ${roleClass}">${u.role}</span></td>
            <td>${count} token</td>
            <td>
                <button class="btn-action edit" onclick="editUser('${u.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action delete" onclick="deleteUser('${u.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

// ============================================================
// ADD TOKEN
// ============================================================
function showAddTokenModal() {
    const body = `
        <div class="form-group">
            <label>Token Baru</label>
            <input type="text" id="newTokenInput" placeholder="Token akan digenerate otomatis..." class="form-control" readonly>
        </div>
        <div class="form-group">
            <label>Pemilik Token</label>
            <select id="tokenOwnerSelect" class="form-control">
                ${state.users.map(u => `<option value="${u.name}">${u.name} (${u.role})</option>`).join('')}
            </select>
        </div>
        <div class="form-hint">
            <i class="fas fa-info-circle"></i>
            Full Up: hanya bisa memiliki 1 token (akan otomatis replace)
        </div>
        <button class="btn-primary" id="btnSaveToken" style="width:100%; justify-content:center;">
            <i class="fas fa-plus"></i> Tambah
        </button>
    `;
    
    openModal('Tambah Token', body);
    
    const newToken = generateToken();
    $('newTokenInput').value = newToken;
    
    if (state.currentUser) {
        const select = $('tokenOwnerSelect');
        for (let opt of select.options) {
            if (opt.value === state.currentUser.name) {
                select.value = opt.value;
                break;
            }
        }
    }
    
    $('btnSaveToken').addEventListener('click', () => {
        const token = $('newTokenInput').value.trim();
        const owner = $('tokenOwnerSelect').value;
        
        if (!token) {
            showToast('Token tidak boleh kosong!', 'error');
            return;
        }
        
        if (state.currentRole === 'Full Up' && state.tokens.length >= 1) {
            const oldToken = state.tokens[0];
            state.tokens[0] = token;
            delete state.tokenOwners[oldToken];
            state.tokenOwners[token] = owner;
            showToast('Token direplace (Full Up hanya 1 token)', 'warning');
        } else {
            state.tokens.push(token);
            state.tokenOwners[token] = owner;
            showToast(`Token berhasil ditambahkan untuk ${owner}!`, 'success');
        }
        
        renderTokens();
        updateStats();
        $('tokenBadge').textContent = state.tokens.length;
        $('tokenCount').textContent = `${state.tokens.length} token`;
        updateRemoteDb();
        closeModal();
    });
}

function deleteToken(index) {
    if (state.currentRole === 'Full Up' && state.tokens.length <= 1) {
        showToast('Full Up tidak bisa menghapus token terakhir', 'error');
        return;
    }
    
    if (!confirm('Hapus token ini?')) return;
    const token = state.tokens[index];
    state.tokens.splice(index, 1);
    delete state.tokenOwners[token];
    renderTokens();
    updateStats();
    $('tokenBadge').textContent = state.tokens.length;
    $('tokenCount').textContent = `${state.tokens.length} token`;
    updateRemoteDb();
    showToast('Token dihapus', 'success');
}

// ============================================================
// ADD USER
// ============================================================
function addUser() {
    const name = $('addUserName').value.trim();
    const key = $('addUserKey').value.trim();
    const role = $('addUserRole').value;
    
    if (!name) {
        showToast('Nama user tidak boleh kosong!', 'error');
        return;
    }
    if (!key) {
        showToast('Key login tidak boleh kosong!', 'error');
        return;
    }
    
    const currentLevel = ROLE_LEVELS[state.currentRole] || 0;
    const selectedLevel = ROLE_LEVELS[role] || 0;
    
    if (selectedLevel <= currentLevel) {
        showToast(`Anda tidak bisa menambah role ${role} (level ${selectedLevel})`, 'error');
        return;
    }
    
    const newUser = {
        id: generateUserId(),
        name: name,
        key: key,
        role: role
    };
    
    state.users.push(newUser);
    renderUsers();
    renderTokens();
    updateStats();
    $('userBadge').textContent = state.users.length;
    $('userCount').textContent = `${state.users.length} user`;
    
    $('addUserName').value = '';
    const newKey = generateKey('');
    $('addUserKey').value = newKey;
    
    updateRemoteDb();
    showToast(`User ${name} berhasil ditambahkan!`, 'success');
}

// ============================================================
// USER ACTIONS
// ============================================================
function editUser(id) {
    const user = state.users.find(u => u.id === id);
    if (!user) return;
    showToast(`Edit user: ${user.name}`, 'info');
}

function deleteUser(id) {
    if (state.currentRole !== 'Owner') {
        showToast('Hanya Owner yang bisa menghapus user!', 'error');
        return;
    }
    if (!confirm('Hapus user ini?')) return;
    const user = state.users.find(u => u.id === id);
    state.users = state.users.filter(u => u.id !== id);
    if (user) {
        const toRemove = Object.keys(state.tokenOwners).filter(t => state.tokenOwners[t] === user.name);
        toRemove.forEach(t => {
            const idx = state.tokens.indexOf(t);
            if (idx > -1) state.tokens.splice(idx, 1);
            delete state.tokenOwners[t];
        });
    }
    renderUsers();
    renderTokens();
    updateStats();
    $('userBadge').textContent = state.users.length;
    $('userCount').textContent = `${state.users.length} user`;
    updateRemoteDb();
    showToast('User dihapus', 'success');
}

// ============================================================
// MODAL
// ============================================================
function openModal(title, body) {
    $('modalTitle').textContent = title;
    $('modalBody').innerHTML = body;
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast-container');
    if (existing) existing.remove();
    
    const container = document.createElement('div');
    container.className = 'toast-container';
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    container.innerHTML = `
        <div class="toast ${type}">
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(container);
    
    setTimeout(() => {
        if (container.parentElement) container.remove();
    }, 4000);
}

// ============================================================
// EXPOSE GLOBALS
// ============================================================
window.deleteToken = deleteToken;
window.deleteUser = deleteUser;
window.editUser = editUser;
window.showToast = showToast;
window.closeModal = closeModal;
window.openModal = openModal;
window.loadData = loadData;
window.generateToken = generateToken;
window.generateKey = generateKey;
window.updateRemoteDb = updateRemoteDb;

console.log('🏗️ AKSAKA BOT BUILD - Panel loaded');
console.log('📌 Login: admin | reseller | fullup | dev');
console.log('📌 Total: 1 token, 1 user');
console.log('📌 Terhubung dengan GitHub: ' + GITHUB_RAW_URL);
