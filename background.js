// Applying Assistant - Background Service Worker

// Extension installation and setup
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Applying Assistant installed');
    
    if (details.reason === 'install') {
        // First time installation
        await initializeExtension();
        
        // Open welcome page or show notification
        chrome.tabs.create({
            url: chrome.runtime.getURL('welcome.html')
        }).catch(() => {
            // Fallback if welcome page doesn't exist
            console.log('Welcome! Job Application Assistant is ready to help speed up your job applications.');
        });
        
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
        
        await chrome.storage.local.set({ 
            settings: defaultSettings,
            installDate: new Date().toISOString(),
            version: chrome.runtime.getManifest().version
        });
        
        console.log('Extension initialized with default settings');
        
    } catch (error) {
        console.error('Error initializing extension:', error);
    }
}

// Migrate settings between versions
async function migrateSettings() {
    try {
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
            chrome.runtime.openOptionsPage();
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

// Handle browser action click (if popup is disabled)
chrome.action.onClicked.addListener(async (tab) => {
    try {
        // Check if content script is already injected
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    } catch (error) {
        // Content script not injected, inject it
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            
            await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ['styles.css']
            });
            
            console.log('Content script injected into tab', tab.id);
            
        } catch (injectionError) {
            console.error('Error injecting content script:', injectionError);
        }
    }
});

// Handle tab updates to re-inject content script if needed
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only act when the page has finished loading
    if (changeInfo.status !== 'complete') return;
    
    // Skip non-http(s) URLs
    if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
        return;
    }
    
    try {
        // Check if our content script is already running
        await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    } catch (error) {
        // Content script not running, check if we should inject it
        const result = await chrome.storage.local.get(['settings']);
        const settings = result.settings || { enabled: true };
        
        if (settings.enabled) {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                });
                
                await chrome.scripting.insertCSS({
                    target: { tabId: tabId },
                    files: ['styles.css']
                });
                
                console.log('Content script auto-injected into tab', tabId);
                
            } catch (injectionError) {
                // Fail silently for pages where injection is not allowed
                console.debug('Could not inject into tab', tabId, injectionError.message);
            }
        }
    }
});

// Clean up old data periodically
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'cleanup') {
        await cleanupOldData();
    }
});

// Set up periodic cleanup alarm
chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create('cleanup', { 
        delayInMinutes: 60, // 1 hour after startup
        periodInMinutes: 24 * 60 // Once per day
    });
});

// Clean up old data
async function cleanupOldData() {
    try {
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

// Context menu setup (optional)
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'applying-assistant-insert',
        title: 'Job Assistant: Insert Template',
        contexts: ['editable'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'applying-assistant-insert') {
        try {
            // Send message to content script to show suggestions
            await chrome.tabs.sendMessage(tab.id, {
                action: 'showSuggestions',
                x: info.x || 0,
                y: info.y || 0
            });
        } catch (error) {
            console.error('Error showing suggestions from context menu:', error);
        }
    }
});

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeExtension,
        migrateSettings,
        trackTemplateUsage,
        cleanupOldData
    };
} 