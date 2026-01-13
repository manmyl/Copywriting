// 全局状态管理
const state = {
  allContent: [],
  filteredContent: [],
  currentCategory: 'all',
  searchKeyword: '',
  categories: []
};

// DOM 元素引用
const elements = {
  searchInput: null,
  clearSearchBtn: null,
  categoryButtons: null,
  contentGrid: null,
  emptyState: null,
  categoryContainer: null,
  uploadBtn: null,
  fileInput: null
};

// 用户认证管理器
const authManager = {
  users: JSON.parse(localStorage.getItem('cp_users') || '{}'),
  currentUser: localStorage.getItem('cp_current_user') || null,

  init() {
    this.renderAuthUI();
    this.updateDataSourceLabel('local');
    this.updateUserStatusLabel();
  },

  isLoggedIn() {
    return !!this.currentUser;
  },

  login(username, password) {
    const user = this.users[username];
    if (user && user.password === password) {
      this.currentUser = username;
      localStorage.setItem('cp_current_user', username);
      this.renderAuthUI();
      this.updateUserStatusLabel();
      loadData();
      renderCategories();
      state.searchKeyword = '';
      if(elements.searchInput) elements.searchInput.value = '';
      toggleClearButton();
      
      state.filteredContent = [...state.allContent];
      renderContent();
      showNotification(`欢迎回来，${username}`, 'success');
      return true;
    }
    return false;
  },

  register(username, password) {
    if (this.users[username]) {
      return { success: false, message: '用户名已存在' };
    }
    this.users[username] = { password };
    localStorage.setItem('cp_users', JSON.stringify(this.users));
    
    this.currentUser = username;
    localStorage.setItem('cp_current_user', username);
    this.renderAuthUI();
    this.updateUserStatusLabel();
    
    this.saveUserData({
      categories: [...state.categories],
      content: [...state.allContent]
    });
    
    showNotification(`注册成功，欢迎 ${username}`, 'success');
    return { success: true };
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('cp_current_user');
    this.renderAuthUI();
    this.updateUserStatusLabel();
    
    loadData();
    renderCategories();
    state.searchKeyword = '';
    if(elements.searchInput) elements.searchInput.value = '';
    toggleClearButton();
    state.filteredContent = [...state.allContent];
    renderContent();
    showNotification('已退出登录', 'success');
  },

  getUserData() {
    if (!this.currentUser) return null;
    const key = `cp_data_${this.currentUser}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },

  saveUserData(data) {
    if (!this.currentUser) return;
    const key = `cp_data_${this.currentUser}`;
    localStorage.setItem(key, JSON.stringify(data));
  },

  updateDataSourceLabel(source = 'local') {
    const label = document.getElementById('dataSourceLabel');
    if (label) {
      label.textContent = source === 'online' ? '在线' : '本地';
      label.className = source === 'online'
        ? 'ml-2 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium animate-pulse'
        : 'ml-2 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium';
      label.classList.remove('hidden');
      if (source === 'online') {
        setTimeout(() => label.classList.remove('animate-pulse'), 2000);
      }
    }
  },

  updateUserStatusLabel() {
    const label = document.getElementById('userStatusLabel');
    if (label) {
      const isLoggedIn = this.isLoggedIn();
      label.textContent = isLoggedIn ? '私自' : '访客';
      label.className = isLoggedIn 
        ? 'ml-2 px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700 font-medium'
        : 'ml-2 px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 font-medium';
      label.classList.remove('hidden');
    }
  },

  renderAuthUI() {
    const headerBtnContainer = document.querySelector('header .flex.gap-3');
    if (!headerBtnContainer) return;

    const oldContainer = document.getElementById('authContainer');
    if (oldContainer) oldContainer.remove();

    const container = document.createElement('div');
    container.id = 'authContainer';
    container.className = 'flex items-center gap-2 border-l border-gray-200 pl-4 ml-2';

    if (this.currentUser) {
      container.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="flex flex-col items-end">
            <span class="text-xs text-gray-500">当前用户</span>
            <span class="text-sm font-bold text-cocoa max-w-[100px] truncate">${this.currentUser}</span>
          </div>
          <button id="logoutBtn" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 hover:text-red-600 transition-colors text-sm font-medium">
            退出
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button id="loginTriggerBtn" class="px-5 py-2.5 bg-cocoa text-white rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          登录 / 注册
        </button>
      `;
    }

    headerBtnContainer.appendChild(container);

    if (this.currentUser) {
      document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
    } else {
      document.getElementById('loginTriggerBtn')?.addEventListener('click', createAuthModal);
    }
  }
};

// 初始化应用
function initApp() {
  try {
    elements.searchInput = document.getElementById('searchInput');
    elements.clearSearchBtn = document.getElementById('clearSearchBtn');
    elements.categoryContainer = document.getElementById('categoryContainer');
    elements.contentGrid = document.getElementById('contentGrid');
    elements.emptyState = document.getElementById('emptyState');
    elements.uploadBtn = document.getElementById('uploadBtn');
    elements.fileInput = document.getElementById('fileInput');

    window.authManager = authManager;
    authManager.init();
    loadData();
    renderCategories();
    renderContent();
    bindEvents();
    initBackToTop();
    removeDuplicateDownloadButton();
    
    window.addEventListener('remoteDataLoaded', (e) => {
      if (!authManager.isLoggedIn()) {
        const remoteContent = e.detail;
        const parsedData = parseCopywritingData(remoteContent);
        if (parsedData && parsedData.content && parsedData.content.length > 0) {
          state.allContent = parsedData.content;
          state.categories = parsedData.categories;
          state.filteredContent = [...state.allContent];
          renderCategories();
          renderContent();
        }
      }
    });
  } catch (error) {
    console.error('初始化失败:', error);
    showError('加载失败，请刷新页面重试');
  }
}

function removeDuplicateDownloadButton() {
  const duplicateButton = document.getElementById('downloadDataBtn');
  if (duplicateButton) {
    duplicateButton.remove();
  }
}

function parseCopywritingData(dataText) {
  const lines = dataText.split('\n');
  const result = { categories: [], content: [] };
  let currentCategory = '';
  let idCounter = state.allContent.length + 1;

  lines.forEach(line => {
    line = line.trim();
    if (line.startsWith('//') || line.startsWith('#') || line === '') {
      return;
    }
    if (line.startsWith('[') && line.endsWith(']')) {
      currentCategory = line.slice(1, -1);
      if (!result.categories.includes(currentCategory)) {
        result.categories.push(currentCategory);
      }
    } else if (currentCategory && line) {
      result.content.push({
        id: idCounter++,
        text: line,
        category: currentCategory
      });
    }
  });
  return result;
}

function loadData() {
  try {
    if (authManager.isLoggedIn()) {
      const userData = authManager.getUserData();
      if (userData && userData.content && userData.content.length > 0) {
        console.log(`✅ 加载用户 [${authManager.currentUser}] 的私有数据`);
        state.allContent = userData.content;
        state.categories = userData.categories;
        state.filteredContent = [...state.allContent];
        state.currentCategory = 'all';
        return;
      }
    }

    if (typeof COPYWRITING_DATA === 'undefined') {
      throw new Error('数据文件未加载，请检查 data.js 是否正确引入');
    }
    
    console.log('✅ 加载默认全局数据');
    const data = parseCopywritingData(COPYWRITING_DATA);
    
    if (data && data.content) {
      state.allContent = data.content || [];
      state.filteredContent = [...state.allContent];
      state.categories = data.categories || [];
      state.currentCategory = 'all';
    } else {
      throw new Error('数据格式不正确，无法解析内容');
    }
  } catch (error) {
    console.error('❌ 数据加载错误:', error);
    showError(`数据加载失败: ${error.message}<br>请确保 data.js 文件正确引入且格式正确`);
  }
}

function renderCategories() {
  if (!elements.categoryContainer) return;
  
  elements.categoryContainer.innerHTML = '';
  
  const allButton = createCategoryButton('全部', 'all', state.currentCategory === 'all');
  elements.categoryContainer.appendChild(allButton);
  
  state.categories.forEach(category => {
    const button = createCategoryButton(category, category, state.currentCategory === category);
    elements.categoryContainer.appendChild(button);
  });
}

function createCategoryButton(label, value, isActive) {
  const button = document.createElement('button');
  button.textContent = label;
  button.dataset.category = value;
  button.className = `px-6 py-2 rounded-full font-medium transition-all tag-hover ${
    isActive
      ? 'bg-blue-500 text-white shadow-md'
      : 'bg-white text-gray-700 hover:bg-blue-50'
  }`;
  return button;
}

function renderContent() {
  if (!elements.contentGrid) return;
  
  elements.contentGrid.innerHTML = '';
  
  if (state.filteredContent.length === 0) {
    showEmptyState();
    return;
  }
  
  hideEmptyState();
  
  state.filteredContent.forEach(item => {
    const card = createContentCard(item);
    elements.contentGrid.appendChild(card);
  });
}

function createContentCard(item) {
  const card = document.createElement('div');
  card.className = 'bg-white rounded-2xl p-5 shadow-sm card-hover relative';
  
  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'inline-block px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full mb-1';
  categoryBadge.textContent = item.category;
  
  const textContent = document.createElement('p');
  textContent.className = 'text-gray-800 leading-relaxed min-h-[60px] mt-[10px]';
  textContent.textContent = item.text;
  
  const copyButton = document.createElement('button');
  copyButton.className = 'absolute top-4 right-4 bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 transition-colors duration-100 focus:outline-none shadow-md';
  copyButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>';
  copyButton.title = '点击复制文案';
  copyButton.setAttribute('aria-label', '复制文案到剪贴板');
  copyButton.onclick = () => copyText(item.text, copyButton);
  
  card.appendChild(categoryBadge);
  card.appendChild(textContent);
  card.appendChild(copyButton);
  
  return card;
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    showCopySuccess(button);
  } catch (error) {
    console.error('复制失败:', error);
    fallbackCopy(text);
    showCopySuccess(button);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function showCopySuccess(button) {
  const originalHTML = button.innerHTML;
  const originalClass = button.className;
  
  button.innerHTML = '<div class="flex items-center gap-1.5"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg><span class="text-xs font-semibold whitespace-nowrap">已复制</span></div>';
  button.className = 'absolute top-4 right-4 bg-blue-500 text-white p-3 rounded-xl transition-colors duration-100 focus:outline-none shadow-md';
  button.disabled = true;
  
  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.className = originalClass;
    button.disabled = false;
  }, 1200);
}

function bindEvents() {
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', handleSearch);
  }
  
  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.addEventListener('click', handleClearSearch);
  }
  
  if (elements.categoryContainer) {
    elements.categoryContainer.addEventListener('click', handleCategoryClick);
  }

  if (elements.uploadBtn) {
    elements.uploadBtn.addEventListener('click', handleUploadClick);
  }

  if (elements.fileInput) {
    elements.fileInput.addEventListener('change', handleFileUpload);
  }

  setupModalEvents('helpBtn', 'helpModal', ['closeHelpBtn', 'closeHelpBtnBottom']);
  setupModalEvents('aboutBtn', 'aboutModal', ['closeAboutBtn']);
}

function setupModalEvents(triggerId, modalId, closeBtnIds) {
  const trigger = document.getElementById(triggerId);
  const modal = document.getElementById(modalId);
  
  if (trigger && modal) {
    trigger.addEventListener('click', () => {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
    
    closeBtnIds.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        });
      }
    });
  }
}

function createAuthModal() {
  let modal = document.getElementById('authModal');
  if (modal) {
    modal.remove();
  }

  modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] auth-backdrop p-4';
  
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative transform transition-all scale-100">
      <button id="closeAuthModal" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
      
      <div class="p-8">
        <h3 class="text-2xl font-bold text-cocoa mb-2 text-center" id="authTitle">欢迎回来</h3>
        <p class="text-gray-500 text-center mb-6 text-sm" id="authSubtitle">登录以管理您的专属文案库</p>
        
        <form id="authForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input type="text" id="authUsername" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" placeholder="请输入用户名" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input type="password" id="authPassword" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" placeholder="请输入密码" required>
          </div>
          
          <button type="submit" id="authSubmitBtn" class="w-full py-3 bg-cocoa text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition-transform active:scale-95 shadow-md mt-4">
            立即登录
          </button>
        </form>
        
        <div class="mt-6 text-center">
          <button id="toggleAuthMode" class="text-sm text-blue-600 font-medium hover:underline">
            没有账号？点击注册
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const form = document.getElementById('authForm');
  const toggleBtn = document.getElementById('toggleAuthMode');
  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const submitBtn = document.getElementById('authSubmitBtn');
  const closeBtn = document.getElementById('closeAuthModal');
  
  let isLoginMode = true;

  closeBtn.onclick = () => modal.remove();
  
  toggleBtn.onclick = (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    title.textContent = isLoginMode ? '欢迎回来' : '创建账号';
    subtitle.textContent = isLoginMode ? '登录以管理您的专属文案库' : '注册即刻拥有私有文案空间';
    submitBtn.textContent = isLoginMode ? '立即登录' : '立即注册';
    toggleBtn.textContent = isLoginMode ? '没有账号？点击注册' : '已有账号？点击登录';
    
    document.getElementById('authUsername').value = '';
    document.getElementById('authPassword').value = '';
  };

  form.onsubmit = (e) => {
    e.preventDefault();
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value.trim();

    if (!username || !password) return;

    if (isLoginMode) {
      if (!authManager.login(username, password)) {
        showNotification('用户名或密码错误', 'error');
        form.classList.add('shake');
        setTimeout(() => form.classList.remove('shake'), 500);
      } else {
        modal.remove();
      }
    } else {
      const result = authManager.register(username, password);
      if (result.success) {
        modal.remove();
      } else {
        showNotification(result.message, 'error');
      }
    }
  };
}

function handleUploadClick() {
  if (elements.fileInput) {
    elements.fileInput.click();
  }
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileExtension = file.name.split('.').pop().toLowerCase();
  
  if (fileExtension !== 'txt' && fileExtension !== 'js') {
    showNotification('请上传 .txt 或 .js 格式的文件', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      let parsedData;

      if (fileExtension === 'js') {
        parsedData = parseJSFile(content);
      } else if (fileExtension === 'txt') {
        parsedData = parseCopywritingData(content);
      }

      if (parsedData && parsedData.content && parsedData.content.length > 0) {
        if (state.allContent.length > 0) {
          showUploadModeDialog(parsedData);
        } else {
          mergeUploadedData(parsedData);
          showNotification(`成功上传 ${parsedData.content.length} 条文案`, 'success');
        }
      } else {
        showNotification('文件格式不正确或内容为空', 'error');
      }
    } catch (error) {
      console.error('文件解析失败:', error);
      showNotification('文件解析失败，请检查格式是否正确', 'error');
    }
  };

  reader.onerror = () => {
    showNotification('文件读取失败', 'error');
  };

  reader.readAsText(file, 'UTF-8');
  event.target.value = '';
}

function parseJSFile(content) {
  try {
    const match = content.match(/const\s+COPYWRITING_DATA\s*=\s*`([\s\S]*?)`/);
    if (match && match[1]) {
      return parseCopywritingData(match[1]);
    }
    throw new Error('JS 文件格式不正确');
  } catch (error) {
    console.error('JS 文件解析错误:', error);
    throw error;
  }
}

function showUploadModeDialog(parsedData) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  
  const tipText = authManager.isLoggedIn() 
    ? '您当前处于登录状态，上传操作将更新您的私有数据。' 
    : '您当前为访客模式，刷新页面后数据将重置（建议登录后操作）。';

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
      <h3 class="text-xl font-bold text-cocoa mb-2">选择上传模式</h3>
      <p class="text-gray-500 text-sm mb-4">${tipText}</p>
      <div class="space-y-3">
        <button 
          id="appendModeBtn"
          class="w-full px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          追加文案（保留原有数据）
        </button>
        <button 
          id="replaceModeBtn"
          class="w-full px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          替换文案（清空原有数据）
        </button>
        <button 
          id="cancelUploadBtn"
          class="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('appendModeBtn').addEventListener('click', () => {
    mergeUploadedData(parsedData);
    showNotification(`成功追加 ${parsedData.content.length} 条文案`, 'success');
    document.body.removeChild(modal);
  });
  
  document.getElementById('replaceModeBtn').addEventListener('click', () => {
    replaceUploadedData(parsedData);
    showNotification(`成功替换为 ${parsedData.content.length} 条文案`, 'success');
    document.body.removeChild(modal);
  });
  
  document.getElementById('cancelUploadBtn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

function replaceUploadedData(uploadedData) {
  state.allContent = [];
  state.categories = [];
  
  uploadedData.content.forEach((item, index) => {
    item.id = index + 1;
  });
  
  state.categories = uploadedData.categories || [];
  state.allContent = uploadedData.content || [];
  state.currentCategory = 'all';
  
  renderCategories();
  state.filteredContent = [...state.allContent];
  renderContent();
  
  if (authManager.isLoggedIn()) {
    authManager.saveUserData({
      categories: state.categories,
      content: state.allContent
    });
  }
}

function mergeUploadedData(uploadedData) {
  uploadedData.categories.forEach(category => {
    if (!state.categories.includes(category)) {
      state.categories.push(category);
    }
  });

  const maxId = Math.max(...state.allContent.map(item => item.id), 0);
  uploadedData.content.forEach((item, index) => {
    item.id = maxId + index + 1;
    state.allContent.push(item);
  });

  renderCategories();
  
  if (state.currentCategory === 'all') {
    state.filteredContent = [...state.allContent];
  } else {
    filterContent();
  }
  
  renderContent();
  
  if (authManager.isLoggedIn()) {
    authManager.saveUserData({
      categories: state.categories,
      content: state.allContent
    });
  }
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `fixed top-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-[100] transition-all ${
    type === 'success' 
      ? 'bg-blue-500 text-white' 
      : 'bg-red-500 text-white'
  }`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 2000);
}

function handleSearch(e) {
  state.searchKeyword = e.target.value.trim().toLowerCase();
  toggleClearButton();
  filterContent();
}

function handleClearSearch() {
  if (elements.searchInput) {
    elements.searchInput.value = '';
    state.searchKeyword = '';
    toggleClearButton();
    filterContent();
    elements.searchInput.focus();
  }
}

function toggleClearButton() {
  if (elements.clearSearchBtn) {
    if (state.searchKeyword) {
      elements.clearSearchBtn.classList.remove('hidden');
      elements.clearSearchBtn.classList.add('flex');
    } else {
      elements.clearSearchBtn.classList.add('hidden');
      elements.clearSearchBtn.classList.remove('flex');
    }
  }
}

function handleCategoryClick(e) {
  const button = e.target.closest('button[data-category]');
  if (!button) return;
  
  state.currentCategory = button.dataset.category;
  
  document.querySelectorAll('[data-category]').forEach(btn => {
    btn.className = btn.className.replace(/bg-blue-500 text-white shadow-md/, 'bg-white text-gray-700 hover:bg-blue-50');
  });
  
  button.className = button.className.replace(/bg-white text-gray-700 hover:bg-blue-50/, 'bg-blue-500 text-white shadow-md');
  
  filterContent();
}

function filterContent() {
  state.filteredContent = state.allContent.filter(item => {
    const matchCategory = state.currentCategory === 'all' || item.category === state.currentCategory;
    const matchSearch = !state.searchKeyword || 
      item.text.toLowerCase().includes(state.searchKeyword) ||
      item.category.toLowerCase().includes(state.searchKeyword);
    
    return matchCategory && matchSearch;
  });
  
  renderContent();
}

function showEmptyState() {
  if (elements.emptyState) {
    elements.emptyState.classList.remove('hidden');
  }
}

function hideEmptyState() {
  if (elements.emptyState) {
    elements.emptyState.classList.add('hidden');
  }
}

function showError(message) {
  if (elements.contentGrid) {
    elements.contentGrid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">${message}</div>`;
  }
}

function initBackToTop() {
  const backToTopBtn = document.getElementById('backToTopBtn');
  
  if (!backToTopBtn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTopBtn.style.opacity = '1';
      backToTopBtn.style.pointerEvents = 'auto';
    } else {
      backToTopBtn.style.opacity = '0';
      backToTopBtn.style.pointerEvents = 'none';
    }
  });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}