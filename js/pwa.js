/**
 * Log it - PWA Auto-Updater with Cache-Buster
 */
let deferredInstallPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Unregister any old/stuck service workers first
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        registration.update();
      }
    });

    // Register with a timestamp to prevent Chrome from caching sw.js itself
    navigator.serviceWorker
      .register('./sw.js?t=' + new Date().getTime())
      .then((reg) => {
        reg.update();
        console.log('✅ Service Worker registered fresh');
      })
      .catch((err) => {
        console.error('❌ Service Worker registration error:', err);
      });
  });
}

// Mobile Install Prompt Handler
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showInstallUI();
});

function showInstallUI() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks || document.getElementById('pwaInstallBtn')) return;

  const installBtn = document.createElement('button');
  installBtn.id = 'pwaInstallBtn';
  installBtn.className = 'btn btn-sm';
  installBtn.style.backgroundColor = '#16a34a';
  installBtn.innerHTML = '📲 Install App';
  
  installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User installed Log it');
    }
    deferredInstallPrompt = null;
    installBtn.remove();
  });

  navLinks.prepend(installBtn);
}

window.addEventListener('appinstalled', () => {
  const installBtn = document.getElementById('pwaInstallBtn');
  if (installBtn) installBtn.remove();
});

// Offline & Online indicator
window.addEventListener('offline', () => {
  const syncDot = document.getElementById('syncDot');
  const syncText = document.getElementById('syncText');
  if (syncDot && syncText) {
    syncDot.style.background = '#ef4444';
    syncText.textContent = 'Offline (Cached Mode)';
  }
});

window.addEventListener('online', () => {
  const syncDot = document.getElementById('syncDot');
  const syncText = document.getElementById('syncText');
  if (syncDot && syncText) {
    syncDot.style.background = '#16a34a';
    syncText.textContent = 'Connected to Google Sheets';
  }
});
