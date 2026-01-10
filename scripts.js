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

    loadData();
    renderCategories();
    renderContent();
    bindEvents();
    initBackToTop();
    removeDuplicateDownloadButton();
  } catch (error) {
    console.error('初始化失败:', error);
    showError('加载失败，请刷新页面重试');
  }
}

// 删除重复的下载按钮（ID为downloadDataBtn）
function removeDuplicateDownloadButton() {
  const duplicateButton = document.getElementById('downloadDataBtn');
  if (duplicateButton) {
    duplicateButton.remove();
    console.log('✅ 已删除重复的下载按钮');
  }
}

// 解析COPYWRITING_DATA字符串格式
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

// 加载数据（直接使用全局变量）
function loadData() {
  try {
    if (typeof COPYWRITING_DATA === 'undefined') {
      throw new Error('数据文件未加载，请检查 data.js 是否正确引入');
    }
    
    console.log('✅ 使用全局变量 COPYWRITING_DATA 加载数据');
    const data = parseCopywritingData(COPYWRITING_DATA);
    
    if (data && data.content) {
      state.allContent = data.content || [];
      state.filteredContent = [...state.allContent];
      state.categories = data.categories || [];
      console.log('✅ 数据加载完成:', {
        分类数: state.categories.length,
        文案数: state.allContent.length
      });
    } else {
      throw new Error('数据格式不正确，无法解析内容');
    }
  } catch (error) {
    console.error('❌ 数据加载错误:', error);
    showError(`数据加载失败: ${error.message}<br>请确保 data.js 文件正确引入且格式正确`);
    throw error;
  }
}

// 渲染分类标签
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

// 创建分类按钮 - 蓝色主题
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

// 渲染文案内容
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

// 创建文案卡片 - 简化复制按钮动画
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

// 复制文案
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

// 降级复制方案
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

// 显示复制成功提示 - 简化动画，快速背景色变化
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

// 绑定事件
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

  const helpBtn = document.getElementById('helpBtn');
  const closeHelpBtn = document.getElementById('closeHelpBtn');
  const closeHelpBtnBottom = document.getElementById('closeHelpBtnBottom');
  const helpModal = document.getElementById('helpModal');

  if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => {
      helpModal.classList.remove('hidden');
      helpModal.classList.add('flex');
    });
  }

  if (closeHelpBtn && helpModal) {
    closeHelpBtn.addEventListener('click', () => {
      helpModal.classList.add('hidden');
      helpModal.classList.remove('flex');
    });
  }

  if (closeHelpBtnBottom && helpModal) {
    closeHelpBtnBottom.addEventListener('click', () => {
      helpModal.classList.add('hidden');
      helpModal.classList.remove('flex');
    });
  }

  const aboutBtn = document.getElementById('aboutBtn');
  const closeAboutBtn = document.getElementById('closeAboutBtn');
  const aboutModal = document.getElementById('aboutModal');

  if (aboutBtn && aboutModal) {
    aboutBtn.addEventListener('click', () => {
      aboutModal.classList.remove('hidden');
      aboutModal.classList.add('flex');
    });
  }

  if (closeAboutBtn && aboutModal) {
    closeAboutBtn.addEventListener('click', () => {
      aboutModal.classList.add('hidden');
      aboutModal.classList.remove('flex');
    });
  }
}

// 处理上传按钮点击
function handleUploadClick() {
  if (elements.fileInput) {
    elements.fileInput.click();
  }
}

// 处理文件上传
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

// 解析 JS 文件
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

// 显示上传模式选择弹窗
function showUploadModeDialog(parsedData) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
      <h3 class="text-xl font-bold text-cocoa mb-4">选择上传模式</h3>
      <p class="text-gray-600 mb-6">只作为临时使用, 刷新后恢复默认：</p>
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

// 替换上传的数据
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
}

// 合并上传的数据
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
}

// 显示通知
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `fixed top-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 transition-all ${
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

// 处理搜索
function handleSearch(e) {
  state.searchKeyword = e.target.value.trim().toLowerCase();
  toggleClearButton();
  filterContent();
}

// 处理清空搜索
function handleClearSearch() {
  if (elements.searchInput) {
    elements.searchInput.value = '';
    state.searchKeyword = '';
    toggleClearButton();
    filterContent();
    elements.searchInput.focus();
  }
}

// 切换清空按钮显示状态
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

// 处理分类点击 - 蓝色主题
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

// 过滤内容
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

// 显示空状态
function showEmptyState() {
  if (elements.emptyState) {
    elements.emptyState.classList.remove('hidden');
  }
}

// 隐藏空状态
function hideEmptyState() {
  if (elements.emptyState) {
    elements.emptyState.classList.add('hidden');
  }
}

// 显示错误提示
function showError(message) {
  if (elements.contentGrid) {
    elements.contentGrid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">${message}</div>`;
  }
}

// 初始化回到顶部功能
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

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}