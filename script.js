(function() {
    const session = localStorage.getItem('aksaka_session');
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    try {
        const data = JSON.parse(session);
        if (!data.user) {
            window.location.href = 'login.html';
            return;
        }
    } catch (e) {
        window.location.href = 'login.html';
        return;
    }
})();

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/database.json';
const GITHUB_REPO = 'YOUR_USERNAME/YOUR_REPO';
const GITHUB_BRANCH = 'main';
const GITHUB_PATH = 'database.json';

const state = {
    currentUser: null,
    currentRole: null,
    tokens: [],
    users: [],
    tokenOwners: {}
};

const ROLE_LEVELS = {
    'Reseller': 1,
    'Owner': 2
};

const ROLE_NAMES = ['Reseller', 'Owner'];

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

function generateKey(name) {
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${clean}_${suffix}`;
}

function getGithubToken() {
    return localStorage.getItem('github_token') || '';
}

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
                    { id: 'user_1700000000001', name: 'Reseller 1', key: 'reseller123', role: 'Reseller' },
                ];
            }
            
            if (data.tokens && data.tokens.length > 0) {
                state.tokens = data.tokens.map(t => t.token);
                state.tokenOwners = {};
                data.tokens.forEach(t => {
                    state.tokenOwners[t.token] = t.owner;
                });
            } else {
                state.tokens = [];
                state.tokenOwners = {};
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
    updateUIByRole();
    
    $('tokenBadge').textContent = state.tokens.length;
    $('userBadge').textContent = state.users.length;
    $('tokenCount').textContent = `${state.tokens.length} token`;
    $('userCount').textContent = `${state.users.length} user`;
}

function setDefaultData() {
    state.users = [
        { id: 'user_1700000000000', name: 'Admin AKSAKA', key: 'admin123', role: 'Owner' },
        { id: 'user_1700000000001', name: 'Reseller 1', key: 'reseller123', role: 'Reseller' },
    ];
    state.tokens = [];
    state.tokenOwners = {};
}

function updateUIByRole() {
    const role = state.currentRole;
    const isOwner = role === 'Owner';
    const isReseller = role === 'Reseller';
    
    const navSettings = $('navSettings');
    const btnSyncDb = $('btnSyncDb');
    const btnSaveToGit = $('btnSaveToGit');
    const btnRevokeAll = $('btnRevokeAll');
    const resellerInfo = $('resellerInfo');
    
    if (isReseller) {
        if (navSettings) navSettings.style.display = 'none';
        if (btnSyncDb) btnSyncDb.style.display = 'none';
        if (btnSaveToGit) btnSaveToGit.style.display = 'none';
        if (btnRevokeAll) btnRevokeAll.style.display = 'none';
        if (resellerInfo) resellerInfo.style.display = 'block';
        
        $('quickAddToken').style.display = 'flex';
        $('quickAddUser').style.display = 'flex';
        $('btnAddToken').style.display = 'inline-flex';
        $('btnAddUserPage').style.display = 'inline-flex';
        
        $('roleDisplay').textContent = '🟢 Reseller';
        $('roleDisplay').style.color = '#00C853';
        
        $('allowedRoles').textContent = 'Owner';
        
        const select = $('addUserRole');
        if (select) {
            select.innerHTML = '';
            const opt = document.createElement('option');
            opt.value = 'Owner';
            opt.textContent = 'Owner';
            select.appendChild(opt);
            select.value = 'Owner';
        }
        
    } else if (isOwner) {
        if (navSettings) navSettings.style.display = 'flex';
        if (btnSyncDb) btnSyncDb.style.display = 'inline-flex';
        if (btnSaveToGit) btnSaveToGit.style.display = 'inline-flex';
        if (btnRevokeAll) btnRevokeAll.style.display = 'inline-flex';
        if (resellerInfo) resellerInfo.style.display = 'none';
        
        $('quickAddToken').style.display = 'flex';
        $('quickAddUser').style.display = 'flex';
        $('btnAddToken').style.display = 'inline-flex';
        $('btnAddUserPage').style.display = 'inline-flex';
        
        $('roleDisplay').textContent = '🟡 Owner';
        $('roleDisplay').style.color = '#FFD600';
        
        $('allowedRoles').textContent = 'tidak ada (Anda Owner)';
        
        const select = $('addUserRole');
        if (select) {
            select.innerHTML = '';
            ['Reseller', 'Owner'].forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r;
                select.appendChild(opt);
            });
        }
    } else {
        $('roleDisplay').textContent = '👤 Guest';
        $('roleDisplay').style.color = '#8888A8';
        if (resellerInfo) resellerInfo.style.display = 'none';
    }
}

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
        
        const putUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
        const putRes = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github+json'
            },
            body: JSON.stringify({
                message: 'Update database via panel BUILD AKSAKA',
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

document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
        const input = $('settingGithubToken');
        if (input) input.value = savedToken;
    }
    
    const savedUrl = localStorage.getItem('github_raw_url');
    if (savedUrl) {
        const input = $('settingDbUrl');
        if (input) input.value = savedUrl;
    }
    
    checkLogin();
    setupEventListeners();
    loadData();
});

function checkLogin() {
    const saved = localStorage.getItem('aksaka_session');
    if (saved) {
        try {
            const session = JSON.parse(saved);
            state.currentUser = session.user;
            state.currentRole = session.role;
            updateUserUI();
        } catch (e) {
            localStorage.removeItem('aksaka_session');
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
        
        updateUIByRole();
        updateAccessPage();
    }
}

function updateAccessPage() {
    if (state.currentUser) {
        $('myName').textContent = state.currentUser.name || '-';
        $('myKey').textContent = state.currentUser.key || '-';
        $('myRole').textContent = state.currentRole || '-';
        $('myLevel').textContent = ROLE_LEVELS[state.currentRole] || 0;
        $('myJoined').textContent = state.currentUser.joined || new Date().toISOString().split('T')[0];
        $('myAccessUrl').textContent = window.location.href;
    }
}

function copyAccessUrl() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast('URL akses berhasil dicopy!', 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('URL akses berhasil dicopy!', 'success');
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
    $('roleDisplay').textContent = '👤 Guest';
    $('roleDisplay').style.color = '#8888A8';
    showToast('Logout berhasil', 'info');
    loadData();
}

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
                'settings': 'Pengaturan',
                'myaccess': 'Akses Saya'
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
    
    $('btnLogoutSmall').addEventListener('click', logout);
    $('btnLogoutHeader').addEventListener('click', logout);
    
    // ===== ADD TOKEN (SEMUA ROLE BISA - MANUAL) =====
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
    
    // ===== ADD USER (SEMUA ROLE BISA) =====
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
    
    // ===== SETTINGS (HANYA OWNER) =====
    $('btnSaveToGit').addEventListener('click', async () => {
        if (state.currentRole !== 'Owner') {
            showToast('❌ Hanya Owner!', 'error');
            return;
        }
        
        const token = $('settingGithubToken').value.trim();
        if (token) {
            localStorage.setItem('github_token', token);
        }
        
        const url = $('settingDbUrl').value.trim();
        if (url) {
            localStorage.setItem('github_raw_url', url);
        }
        
        await updateRemoteDb();
    });
    
    $('btnSyncDb').addEventListener('click', async () => {
        if (state.currentRole !== 'Owner') {
            showToast('❌ Hanya Owner!', 'error');
            return;
        }
        await loadData();
        showToast('Database berhasil disinkronisasi dari GitHub!', 'success');
    });
    
    $('btnRevokeAll').addEventListener('click', () => {
        if (state.currentRole !== 'Owner') {
            showToast('❌ Hanya Owner!', 'error');
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
    
    window.copyAccessUrl = copyAccessUrl;
    
    $('modalClose').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
}

function updateStats() {
    $('totalTokens').textContent = state.tokens.length;
    $('totalUsers').textContent = state.users.length;
}

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
    
    const isOwner = state.currentRole === 'Owner';
    
    tbody.innerHTML = state.users.map((u, i) => {
        const roleClass = u.role.toLowerCase();
        const count = tokenCount[u.name] || 0;
        
        let actions = '';
        if (isOwner) {
            actions = `
                <button class="btn-action edit" onclick="editUser('${u.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action delete" onclick="deleteUser('${u.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        } else {
            actions = `<span class="btn-action readonly"><i class="fas fa-lock"></i> Read Only</span>`;
        }
        
        return `
        <tr>
            <td><code>${u.id}</code></td>
            <td><strong>${u.name}</strong></td>
            <td><span class="role-badge ${roleClass}">${u.role}</span></td>
            <td>${count} token</td>
            <td>${actions}</td>
        </tr>
    `}).join('');
}

// ============================================================
// ADD TOKEN - MANUAL (USER KETIK SENDIRI) - FIX
// ============================================================
function showAddTokenModal() {
    const body = `
        <div class="form-group">
            <label>Token Baru</label>
            <input type="text" id="newTokenInput" placeholder="Masukkan token manual..." class="form-control">
            <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">
                Contoh: <code>1234567890:ABCdefGHIjklMNOpqrsTUVwxyz</code>
            </div>
        </div>
        <div class="form-group">
            <label>Pemilik Token</label>
            <select id="tokenOwnerSelect" class="form-control">
                ${state.users.map(u => `<option value="${u.name}">${u.name} (${u.role})</option>`).join('')}
            </select>
        </div>
        <div class="form-hint">
            <i class="fas fa-info-circle"></i>
            Token bisa diisi manual sesuai token dari @BotFather
        </div>
        <button class="btn-primary" id="btnSaveToken" style="width:100%; justify-content:center;">
            <i class="fas fa-save"></i> Simpan Token
        </button>
    `;
    
    openModal('Tambah Token Manual', body);
    
    // Fokus ke input token
    setTimeout(() => {
        const input = document.getElementById('newTokenInput');
        if (input) {
            input.value = ''; // KOSONGKAN - TIDAK ADA AUTO GENERATE
            input.focus();
        }
    }, 100);
    
    // HAPUS SEMUA AUTO GENERATE
    // Token diisi MANUAL oleh user
    
    $('btnSaveToken').addEventListener('click', () => {
        const token = $('newTokenInput').value.trim();
        const owner = $('tokenOwnerSelect').value;
        
        if (!token) {
            showToast('⚠️ Token tidak boleh kosong! Silakan ketik token manual.', 'warning');
            document.getElementById('newTokenInput').focus();
            return;
        }
        
        // Validasi format token Telegram
        if (!/^\d+:[A-Za-z0-9_-]{35,}$/.test(token)) {
            showToast('⚠️ Format token tidak valid! Contoh: 1234567890:ABCdef...', 'warning');
            document.getElementById('newTokenInput').focus();
            return;
        }
        
        // Cek apakah token sudah ada
        if (state.tokens.includes(token)) {
            showToast('⚠️ Token sudah ada! Masukkan token yang berbeda.', 'warning');
            document.getElementById('newTokenInput').focus();
            return;
        }
        
        state.tokens.push(token);
        state.tokenOwners[token] = owner;
        showToast(`✅ Token berhasil ditambahkan untuk ${owner}!`, 'success');
        
        renderTokens();
        updateStats();
        $('tokenBadge').textContent = state.tokens.length;
        $('tokenCount').textContent = `${state.tokens.length} token`;
        updateRemoteDb();
        closeModal();
    });
}

function deleteToken(index) {
    if (!state.currentUser) {
        showToast('Silakan login!', 'error');
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
    
    const newUser = {
        id: generateUserId(),
        name: name,
        key: key,
        role: role,
        joined: new Date().toISOString().split('T')[0]
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
    showToast(`✅ User ${name} (${role}) berhasil ditambahkan!`, 'success');
}

function editUser(id) {
    if (state.currentRole !== 'Owner') {
        showToast('❌ Hanya Owner yang bisa mengedit user!', 'error');
        return;
    }
    const user = state.users.find(u => u.id === id);
    if (!user) {
        showToast('User tidak ditemukan!', 'error');
        return;
    }
    
    const body = `
        <div class="form-group">
            <label>Nama User</label>
            <input type="text" id="editUserName" value="${user.name}" class="form-control">
        </div>
        <div class="form-group">
            <label>Key Login</label>
            <input type="text" id="editUserKey" value="${user.key}" class="form-control">
        </div>
        <div class="form-group">
            <label>Role</label>
            <select id="editUserRole" class="form-control">
                <option value="Reseller" ${user.role === 'Reseller' ? 'selected' : ''}>Reseller</option>
                <option value="Owner" ${user.role === 'Owner' ? 'selected' : ''}>Owner</option>
            </select>
        </div>
        <button class="btn-primary" id="btnEditUserSubmit" style="width:100%; justify-content:center;">
            <i class="fas fa-save"></i> Simpan Perubahan
        </button>
    `;
    
    openModal(`Edit User: ${user.name}`, body);
    
    $('btnEditUserSubmit').addEventListener('click', () => {
        const newName = $('editUserName').value.trim();
        const newKey = $('editUserKey').value.trim();
        const newRole = $('editUserRole').value;
        
        if (!newName) {
            showToast('Nama tidak boleh kosong!', 'error');
            return;
        }
        if (!newKey) {
            showToast('Key tidak boleh kosong!', 'error');
            return;
        }
        
        const oldName = user.name;
        user.name = newName;
        user.key = newKey;
        user.role = newRole;
        
        if (newName !== oldName) {
            Object.keys(state.tokenOwners).forEach(t => {
                if (state.tokenOwners[t] === oldName) {
                    state.tokenOwners[t] = newName;
                }
            });
        }
        
        renderUsers();
        renderTokens();
        updateRemoteDb();
        closeModal();
        showToast(`✅ User ${newName} berhasil diupdate!`, 'success');
    });
}

function deleteUser(id) {
    if (state.currentRole !== 'Owner') {
        showToast('❌ Hanya Owner yang bisa menghapus user!', 'error');
        return;
    }
    
    if (!confirm('⚠️ Yakin ingin menghapus user ini?\n\nSemua token milik user ini juga akan dihapus!')) return;
    
    const user = state.users.find(u => u.id === id);
    if (!user) {
        showToast('User tidak ditemukan!', 'error');
        return;
    }
    
    if (state.currentUser && state.currentUser.id === id) {
        showToast('❌ Anda tidak bisa menghapus akun sendiri!', 'error');
        return;
    }
    
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
    showToast(`✅ User ${user.name} berhasil dihapus!`, 'success');
}

function openModal(title, body) {
    $('modalTitle').textContent = title;
    $('modalBody').innerHTML = body;
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

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

window.deleteToken = deleteToken;
window.deleteUser = deleteUser;
window.editUser = editUser;
window.showToast = showToast;
window.closeModal = closeModal;
window.openModal = openModal;
window.loadData = loadData;
window.updateRemoteDb = updateRemoteDb;
window.copyAccessUrl = copyAccessUrl;

console.log('🏗️ BUILD AKSAKA - Panel loaded');
console.log('📌 Login: admin123 (Owner) | reseller123 (Reseller)');
console.log('📌 Total: token 0, user 2');
console.log('📌 Tambah Token: MANUAL (ketik sendiri, TIDAK auto generate)');
