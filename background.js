// Applying Assistant - Background Service Worker

// Extension installation and setup
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Applying Assistant installed');
    
    if (details.reason === 'install') {
        // First time installation
        await initializeExtension();
        
        // Welcome message (removed tab creation to minimize permissions)
        console.log('Welcome! Job Application Assistant is ready to help speed up your job applications.');
        
    } else if (details.reason === 'update') {
        // Extension updated
        console.log('Job Application Assistant updated to version', chrome.runtime.getManifest().version);
        
        // Migrate settings if needed
        await migrateSettings();
    }
});

// Initialize extension on first install
async function initializeExtension() {
    try {
        // Set default settings
        const defaultSettings = {
            autoDetect: false,
            showSuggestions: true,
            keyboardShortcuts: true,
            enabled: true
        };
        
        if (chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({ 
                settings: defaultSettings,
                installDate: new Date().toISOString(),
                version: chrome.runtime.getManifest().version
            });
        }
        
        console.log('Extension initialized with default settings');
        
    } catch (error) {
        console.error('Error initializing extension:', error);
    }
}

// Migrate settings between versions
async function migrateSettings() {
    try {
        if (!chrome.storage || !chrome.storage.local) return;
        const result = await chrome.storage.local.get(['settings', 'version']);
        const currentVersion = chrome.runtime.getManifest().version;
        const savedVersion = result.version;
        
        if (!savedVersion || savedVersion !== currentVersion) {
            // Update version
            await chrome.storage.local.set({ version: currentVersion });
            
            // Merge any new default settings
            const defaultSettings = {
                autoDetect: false,
                showSuggestions: true,
                keyboardShortcuts: true,
                enabled: true
            };
            
            const currentSettings = result.settings || {};
            const updatedSettings = { ...defaultSettings, ...currentSettings };
            
            await chrome.storage.local.set({ settings: updatedSettings });
            
            console.log('Settings migrated to version', currentVersion);
        }
        
    } catch (error) {
        console.error('Error migrating settings:', error);
    }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'getExtensionInfo':
            sendResponse({
                version: chrome.runtime.getManifest().version,
                name: chrome.runtime.getManifest().name
            });
            break;
            
        case 'openOptionsPage':
            if (chrome.runtime && chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            }
            sendResponse({ success: true });
            break;
            
        case 'reportError':
            console.error('Error reported from', sender.tab?.url || 'popup:', request.error);
            // Could send to analytics or error reporting service
            sendResponse({ success: true });
            break;
            
        case 'trackUsage':
            // Track template usage for analytics (privacy-friendly)
            trackTemplateUsage(request.templateKey);
            sendResponse({ success: true });
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// Track template usage (privacy-friendly analytics)
async function trackTemplateUsage(templateKey) {
    try {
        if (!chrome.storage || !chrome.storage.local) return;
        const result = await chrome.storage.local.get(['usage']);
        const usage = result.usage || {};
        
        // Track usage by day (not specific template for privacy)
        const today = new Date().toISOString().split('T')[0];
        
        if (!usage[today]) {
            usage[today] = 0;
        }
        
        usage[today]++;
        
        // Keep only last 30 days of data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
        
        Object.keys(usage).forEach(date => {
            if (date < cutoffDate) {
                delete usage[date];
            }
        });
        
        await chrome.storage.local.set({ usage });
        
    } catch (error) {
        console.error('Error tracking usage:', error);
    }
}

// Note: Manual injection removed - extension uses popup interface
// Content scripts auto-inject via manifest declaration

// Note: Auto-injection removed to minimize permissions  
// Content scripts are declared in manifest and will auto-inject

// Note: Periodic cleanup removed to minimize permissions
// Data will be cleaned up manually during template usage

// Clean up old data
async function cleanupOldData() {
    try {
        if (!chrome.storage || !chrome.storage.local) return;
        const result = await chrome.storage.local.get(['usage']);
        const usage = result.usage || {};
        
        // Remove usage data older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
        
        let cleaned = false;
        Object.keys(usage).forEach(date => {
            if (date < cutoffDate) {
                delete usage[date];
                cleaned = true;
            }
        });
        
        if (cleaned) {
            await chrome.storage.local.set({ usage });
            console.log('Cleaned up old usage data');
        }
        
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

// Handle extension updates
chrome.runtime.onUpdateAvailable.addListener((details) => {
    console.log('Extension update available:', details.version);
    // Could show notification to user about update
});

// Handle extension suspend/resume
chrome.runtime.onSuspend.addListener(() => {
    console.log('Extension suspending...');
    // Clean up any resources if needed
});

chrome.runtime.onSuspendCanceled.addListener(() => {
    console.log('Extension suspend canceled');
});

// Note: Context menu functionality removed to minimize permissions
// Users can access templates through the extension popup

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeExtension,
        migrateSettings,
        trackTemplateUsage,
        cleanupOldData
    };
} 