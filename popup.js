// Job Application Assistant - Popup Script
let templates = {};
let settings = {
    autoDetect: false,
    showSuggestions: true,
    keyboardShortcuts: true
};

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Applying Assistant popup loading...');
    
    try {
        await loadTemplates();
        console.log('Templates loaded:', Object.keys(templates).length);
        
        await loadSettings();
        console.log('Settings loaded:', settings);
        
        setupEventListeners();
        console.log('Event listeners setup');
        
        displayTemplates();
        console.log('Templates displayed');
        
        // Check current field status
        updateFieldStatus();
        
        // Set up periodic field status updates
        setInterval(updateFieldStatus, 1000);
        
        updateSettingsUI();
        console.log('Settings UI updated');
        
        showStatus('Ready to help with your job applications!');
        console.log('Popup initialization complete');
    } catch (error) {
        console.error('Error initializing popup:', error);
        showStatus('Error loading extension', 'error');
    }
});

// Load templates from storage
async function loadTemplates() {
    try {
        // Load default templates first
        const defaultTemplates = await fetch(chrome.runtime.getURL('templates.json'));
        const defaultData = await defaultTemplates.json();
        
        // Load custom templates from storage
        const result = await chrome.storage.local.get(['customTemplates']);
        const customTemplates = result.customTemplates || {};
        
        // Merge default and custom templates
        templates = { ...defaultData.templates, ...customTemplates };
    } catch (error) {
        console.error('Error loading templates:', error);
        showStatus('Error loading templates', 'error');
    }
}

// Load settings from storage
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get(['settings']);
        settings = { ...settings, ...result.settings };
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save settings to storage
async function saveSettings() {
    try {
        await chrome.storage.local.set({ settings });
        showStatus('Settings saved!');
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus('Error saving settings', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // Search functionality
    document.getElementById('template-search').addEventListener('input', (e) => {
        filterTemplates(e.target.value);
    });



    // Add template button
    document.getElementById('add-template').addEventListener('click', openTemplateModal);
    
    // Close extension button
    document.getElementById('close-extension').addEventListener('click', () => window.close());

    // Modal controls
    document.querySelector('.modal-close').addEventListener('click', closeTemplateModal);
    document.getElementById('cancel-template').addEventListener('click', closeTemplateModal);
    document.getElementById('save-template').addEventListener('click', saveNewTemplate);

    // Settings checkboxes
    document.getElementById('auto-detect').addEventListener('change', updateSetting);
    document.getElementById('show-suggestions').addEventListener('change', updateSetting);
    document.getElementById('keyboard-shortcuts').addEventListener('change', updateSetting);

    // Data management buttons
    document.getElementById('export-templates').addEventListener('click', exportTemplates);
    document.getElementById('import-templates').addEventListener('click', importTemplates);
    document.getElementById('reset-templates').addEventListener('click', resetTemplates);

    // Close modal when clicking outside
    document.getElementById('template-modal').addEventListener('click', (e) => {
        if (e.target.id === 'template-modal') {
            closeTemplateModal();
        }
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
}

// Display templates in the list
function displayTemplates(filteredTemplates = null) {
    const templateList = document.getElementById('template-list');
    const templatesToShow = filteredTemplates || templates;
    
    templateList.innerHTML = '';

    Object.entries(templatesToShow).forEach(([key, template]) => {
        const templateElement = createTemplateElement(key, template);
        templateList.appendChild(templateElement);
    });

    if (Object.keys(templatesToShow).length === 0) {
        templateList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">No templates found</p>';
    }
}

// Create template element
function createTemplateElement(key, template) {
    const div = document.createElement('div');
    div.className = 'template-item';
    
    // Create title
    const titleDiv = document.createElement('div');
    titleDiv.className = 'template-title';
    titleDiv.textContent = template.title;
    

    
    // Create preview
    const previewDiv = document.createElement('div');
    previewDiv.className = 'template-preview';
    previewDiv.textContent = template.default_text;
    
    // Create actions container
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'template-actions';
    
    // Create Use button
    const useBtn = document.createElement('button');
    useBtn.className = 'btn btn-primary btn-small';
    useBtn.textContent = 'Use';
    useBtn.addEventListener('click', () => useTemplate(key));
    
    // Create Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-small';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => editTemplate(key));
    
    // Add buttons to actions
    actionsDiv.appendChild(useBtn);
    actionsDiv.appendChild(editBtn);
    
    // Create Delete button for custom templates
    if (key.startsWith('custom_')) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-small';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteTemplate(key));
        actionsDiv.appendChild(deleteBtn);
    }
    
    // Assemble the element
    div.appendChild(titleDiv);
    div.appendChild(previewDiv);
    div.appendChild(actionsDiv);
    
    return div;
}

// Filter templates based on search
function filterTemplates(searchTerm = '') {
    const filtered = Object.fromEntries(
        Object.entries(templates).filter(([key, template]) => {
            const matchesSearch = !searchTerm || 
                template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                template.default_text.toLowerCase().includes(searchTerm.toLowerCase());
            
            return matchesSearch;
        })
    );
    
    displayTemplates(filtered);
}

// Use template - send to content script
async function useTemplate(templateKey) {
    console.log('useTemplate called with key:', templateKey);
    
    try {
        const template = templates[templateKey];
        if (!template) {
            console.error('Template not found:', templateKey);
            return;
        }

        console.log('Using template:', template.title);

        // Get active tab (using activeTab permission)
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('Active tab:', tab.id);
        
        // Send template to content script
        await chrome.tabs.sendMessage(tab.id, {
            action: 'insertTemplate',
            text: template.default_text
        });

        showStatus(`Template "${template.title}" inserted!`);
        console.log('Template sent to content script');
        
        // Update field status after insertion
        setTimeout(updateFieldStatus, 500);
    } catch (error) {
        console.error('Error using template:', error);
        showStatus('Error inserting template', 'error');
    }
}

// Edit template
function editTemplate(templateKey) {
    const template = templates[templateKey];
    if (!template) return;

    document.getElementById('template-title').value = template.title;
    document.getElementById('template-text').value = template.default_text;
    
    // Store the key for updating
    document.getElementById('template-modal').dataset.editingKey = templateKey;
    
    openTemplateModal();
}

// Delete template
async function deleteTemplate(templateKey) {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
        delete templates[templateKey];
        
        // Save to storage
        const customTemplates = Object.fromEntries(
            Object.entries(templates).filter(([key]) => key.startsWith('custom_'))
        );
        await chrome.storage.local.set({ customTemplates });
        
        displayTemplates();
        showStatus('Template deleted!');
    } catch (error) {
        console.error('Error deleting template:', error);
        showStatus('Error deleting template', 'error');
    }
}

// Open template creation modal
function openTemplateModal() {
    document.getElementById('template-modal').style.display = 'flex';
}

// Close template creation modal
function closeTemplateModal() {
    document.getElementById('template-modal').style.display = 'none';
    document.getElementById('template-modal').removeAttribute('data-editing-key');
    
    // Clear form
    document.getElementById('template-title').value = '';
    document.getElementById('template-text').value = '';
}

// Save new template
async function saveNewTemplate() {
    const title = document.getElementById('template-title').value.trim();
    const text = document.getElementById('template-text').value.trim();
    
    if (!title || !text) {
        showStatus('Please fill in all required fields', 'error');
        return;
    }

    try {
        const editingKey = document.getElementById('template-modal').dataset.editingKey;
        const templateKey = editingKey || `custom_${Date.now()}`;
        
        templates[templateKey] = {
            title,
            default_text: text
        };

        // Save custom templates to storage
        const customTemplates = Object.fromEntries(
            Object.entries(templates).filter(([key]) => key.startsWith('custom_'))
        );
        await chrome.storage.local.set({ customTemplates });
        
        displayTemplates();
        closeTemplateModal();
        showStatus(editingKey ? 'Template updated!' : 'Template created!');
    } catch (error) {
        console.error('Error saving template:', error);
        showStatus('Error saving template', 'error');
    }
}

// Update settings
function updateSetting(event) {
    const settingId = event.target.id;
    
    // Map setting IDs to setting names
    const settingMap = {
        'auto-detect': 'autoDetect',
        'show-suggestions': 'showSuggestions',
        'keyboard-shortcuts': 'keyboardShortcuts'
    };
    
    const settingName = settingMap[settingId];
    if (settingName) {
        settings[settingName] = event.target.checked;
        saveSettings();
    }
}

// Update settings UI
function updateSettingsUI() {
    document.getElementById('auto-detect').checked = settings.autoDetect;
    document.getElementById('show-suggestions').checked = settings.showSuggestions;
    document.getElementById('keyboard-shortcuts').checked = settings.keyboardShortcuts;
}

// Export templates
function exportTemplates() {
    const customTemplates = Object.fromEntries(
        Object.entries(templates).filter(([key]) => key.startsWith('custom_'))
    );
    
    const dataStr = JSON.stringify({ templates: customTemplates }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'job-application-templates.json';
    link.click();
    
    showStatus('Templates exported!');
}

// Import templates
function importTemplates() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.templates) {
                // Add custom_ prefix to imported templates
                Object.entries(data.templates).forEach(([key, template]) => {
                    const customKey = key.startsWith('custom_') ? key : `custom_${key}_${Date.now()}`;
                    templates[customKey] = template;
                });
                
                // Save to storage
                const customTemplates = Object.fromEntries(
                    Object.entries(templates).filter(([key]) => key.startsWith('custom_'))
                );
                await chrome.storage.local.set({ customTemplates });
                
                displayTemplates();
                showStatus('Templates imported successfully!');
            } else {
                showStatus('Invalid template file format', 'error');
            }
        } catch (error) {
            console.error('Error importing templates:', error);
            showStatus('Error importing templates', 'error');
        }
    };
    
    input.click();
}

// Reset templates to defaults
async function resetTemplates() {
    if (!confirm('This will delete all custom templates and reset to defaults. Are you sure?')) return;
    
    try {
        await chrome.storage.local.remove(['customTemplates']);
        await loadTemplates();
        displayTemplates();
        showStatus('Templates reset to defaults!');
    } catch (error) {
        console.error('Error resetting templates:', error);
        showStatus('Error resetting templates', 'error');
    }
}

// Update field status indicator
async function updateFieldStatus() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
            updateFieldStatusUI('⚠️', 'Extension only works on web pages');
            return;
        }
        
        // Get field info from content script
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'getFieldInfo'
        });
        
        if (response && response.hasActiveField) {
            const fieldInfo = response.fieldInfo;
            const fieldName = fieldInfo.label || fieldInfo.placeholder || fieldInfo.name || 'text field';
            updateFieldStatusUI('✅', `Target: ${fieldName}`);
        } else {
            updateFieldStatusUI('🎯', 'Click a text field');
        }
    } catch (error) {
        console.error('Error checking field status:', error);
        updateFieldStatusUI('🎯', 'Click a text field');
    }
}

// Update field status UI
function updateFieldStatusUI(icon, text) {
    const statusIndicator = document.querySelector('.field-status');
    const statusIcon = document.querySelector('.status-icon');
    const statusText = document.querySelector('.status-text');
    
    if (statusIcon) statusIcon.textContent = icon;
    if (statusText) statusText.textContent = text;
    
    if (statusIndicator) {
        if (icon === '✅') {
            statusIndicator.classList.add('active');
        } else {
            statusIndicator.classList.remove('active');
        }
    }
}

// Show status message
function showStatus(message, type = 'success') {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = message;
    statusElement.style.color = type === 'error' ? '#ef4444' : '#10b981';
    
    // Clear status after 3 seconds
    setTimeout(() => {
        statusElement.textContent = '';
    }, 3000);
}

// Functions are now properly attached as event listeners in createTemplateElement 