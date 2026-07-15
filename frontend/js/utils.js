/**
 * Reusable UI and helper utilities
 */

// 1. Toast Notification System
export function showToast(title, message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'fa-info-circle';
  if (type === 'success') iconClass = 'fa-check-circle';
  if (type === 'error') iconClass = 'fa-exclamation-circle';

  toast.innerHTML = `
    <i class="fas ${iconClass} toast-icon"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
    <button class="toast-close" aria-label="Close Notification">
      <i class="fas fa-times"></i>
    </button>
  `;

  // Append toast
  container.appendChild(toast);

  // Close event listener
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    dismissToast(toast);
  });

  // Auto-dismiss after 4 seconds
  const autoTimeout = setTimeout(() => {
    dismissToast(toast);
  }, 4000);

  // Store timeout on the toast element in case it's dismissed manually
  toast.dataset.timeoutId = autoTimeout;
}

function dismissToast(toast) {
  // Clear timeout
  if (toast.dataset.timeoutId) {
    clearTimeout(Number(toast.dataset.timeoutId));
  }
  
  // Transition fade out
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(100%)';
  toast.style.transition = 'all 0.3s ease';
  
  setTimeout(() => {
    toast.remove();
    // Remove container if empty
    const container = document.querySelector('.toast-container');
    if (container && container.children.length === 0) {
      container.remove();
    }
  }, 300);
}

// 2. Confirmation Dialog (Promise-based)
export function showConfirm({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) {
  return new Promise((resolve) => {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const confirmBtnClass = isDanger ? 'btn-danger' : 'btn-primary';
    
    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="modal-close" aria-label="Close modal"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5;">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-cancel">${cancelText}</button>
          <button class="btn ${confirmBtnClass} btn-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const cleanup = (value) => {
      modalOverlay.style.opacity = '0';
      modalOverlay.style.transition = 'opacity 0.2s ease';
      setTimeout(() => {
        modalOverlay.remove();
        resolve(value);
      }, 200);
    };

    modalOverlay.querySelector('.btn-confirm').addEventListener('click', () => cleanup(true));
    modalOverlay.querySelector('.btn-cancel').addEventListener('click', () => cleanup(false));
    modalOverlay.querySelector('.modal-close').addEventListener('click', () => cleanup(false));
    
    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) cleanup(false);
    });
  });
}

// 3. Loader Overlay (Page-wide or section-wide)
export function showLoader(show = true) {
  let loader = document.querySelector('.loader-overlay');
  if (show) {
    if (!loader) {
      loader = document.createElement('div');
      loader.className = 'loader-overlay';
      loader.innerHTML = '<div class="loader-spinner"></div>';
      document.body.appendChild(loader);
    }
  } else {
    if (loader) {
      loader.remove();
    }
  }
}

// 4. Copy to Clipboard Utility
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied!', 'Link copied to clipboard successfully.', 'success');
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    showToast('Failed to Copy', 'Please select and copy the link manually.', 'error');
    return false;
  }
}

// 5. Date Formatter (e.g. 2026-07-15T05:59:29 -> Jul 15, 2026)
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

// 6. Responsive Sidebar toggle
export function initSidebar() {
  const toggleBtn = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggleBtn) {
        sidebar.classList.remove('open');
      }
    });
  }
}

// 7. Get Query Param
export function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}
