// Applying Assistant - Content Script
let isEnabled = true;
let settings = {};
let currentField = null;
let suggestionPanel = null;

// Initialize content script
(async function() {
    console.log('Applying Assistant loaded');
    await loadSettings();
    setupFieldDetection();
    setupMessageListener();
    setupKeyboardShortcuts();
})();

// Load settings from storage
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get(['settings']);
        settings = result.settings || {
            autoDetect: false,
            showSuggestions: true,
            keyboardShortcuts: true
        };
        console.log('Settings loaded:', settings);
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Setup message listener for communication with popup
function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'insertTemplate':
                insertTemplate(request.text);
                sendResponse({ success: true });
                break;
            case 'getFieldInfo':
                sendResponse({ 
                    hasActiveField: !!currentField,
                    fieldInfo: getFieldInfo(currentField)
                });
                break;
            case 'toggleEnabled':
                isEnabled = !isEnabled;
                if (isEnabled) {
                    setupFieldDetection();
                } else {
                    cleanup();
                }
                sendResponse({ enabled: isEnabled });
                break;
        }
    });
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (!settings.keyboardShortcuts) return;
        
        // Ctrl+Shift+T to toggle suggestions
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            toggleSuggestions();
        }
        
        // Escape to close suggestions
        if (e.key === 'Escape' && suggestionPanel) {
            closeSuggestions();
        }
    });
}

// Setup field detection
function setupFieldDetection() {
    console.log('Setting up field detection, autoDetect:', settings.autoDetect);
    if (!settings.autoDetect) {
        console.log('Auto-detect is disabled, skipping field detection');
        return;
    }
    
    // Detect existing fields
    detectFormFields();
    
    // Watch for dynamically added fields
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (isFormField(node)) {
                        attachFieldListeners(node);
                    } else {
                        // Check child elements
                        node.querySelectorAll?.(getFieldSelectors()).forEach(field => {
                            attachFieldListeners(field);
                        });
                    }
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('Field detection setup complete');
}

// Detect all form fields on the page
function detectFormFields() {
    const fields = document.querySelectorAll(getFieldSelectors());
    console.log(`Found ${fields.length} potential form fields`);
    fields.forEach(field => attachFieldListeners(field));
}

// Get CSS selectors for form fields
function getFieldSelectors() {
    return [
        'textarea',
        'input[type="text"]',
        'input[type="email"]',
        'input:not([type])',
        '[contenteditable="true"]',
        '.ql-editor', // Quill editor
        '.note-editable', // Summernote editor
        '[role="textbox"]'
    ].join(', ');
}

// Check if element is a form field
function isFormField(element) {
    return element.matches && element.matches(getFieldSelectors());
}

// Attach event listeners to form field
function attachFieldListeners(field) {
    if (field.dataset.jobAssistantAttached) return;
    field.dataset.jobAssistantAttached = 'true';
    
    // Add visual indicator
    addFieldIndicator(field);
    
    // Focus and blur events
    field.addEventListener('focus', () => handleFieldFocus(field));
    field.addEventListener('blur', () => handleFieldBlur(field));
    
    // Right-click context menu
    field.addEventListener('contextmenu', (e) => {
        if (e.ctrlKey) { // Ctrl+right-click for suggestions
            e.preventDefault();
            showSuggestions(field, e.clientX, e.clientY);
        }
    });
}

// Add visual indicator to form field
function addFieldIndicator(field) {
    if (!settings.showSuggestions) return;
    
    const indicator = document.createElement('div');
            indicator.className = 'applying-assistant-indicator';
    indicator.innerHTML = '🚀';
            indicator.title = 'Applying Assistant - Ctrl+Right-click for templates';
    
    // Style the indicator
    Object.assign(indicator.style, {
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        width: '20px',
        height: '20px',
        background: '#6366f1',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        zIndex: '10000',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        opacity: '0.8',
        transition: 'opacity 0.2s'
    });
    
    // Position relative to field
    if (field.style.position !== 'absolute' && field.style.position !== 'relative') {
        field.style.position = 'relative';
    }
    
    indicator.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showSuggestions(field, e.clientX, e.clientY);
    });
    
    field.parentNode.insertBefore(indicator, field.nextSibling);
    field.jobAssistantIndicator = indicator;
}

// Handle field focus
function handleFieldFocus(field) {
    currentField = field;
    
    if (field.jobAssistantIndicator) {
        field.jobAssistantIndicator.style.opacity = '1';
    }
    
    // Only auto-show suggestions if BOTH autoDetect AND showSuggestions are enabled
    if (settings.autoDetect && settings.showSuggestions && isJobApplicationField(field)) {
        setTimeout(() => showSuggestions(field), 500);
    }
}

// Handle field blur
function handleFieldBlur(field) {
    setTimeout(() => {
        // Don't auto-close suggestions when field loses focus - keep panel open
        if (currentField === field && !document.activeElement.closest('.applying-assistant-suggestions')) {
            currentField = null;
            if (field.jobAssistantIndicator) {
                field.jobAssistantIndicator.style.opacity = '0.8';
            }
        }
    }, 100);
}

// Check if field is likely for job applications
function isJobApplicationField(field) {
    const fieldInfo = getFieldInfo(field);
    const allText = `${fieldInfo.label} ${fieldInfo.placeholder} ${fieldInfo.id} ${fieldInfo.name} ${fieldInfo.contextText} ${fieldInfo.ariaDescription} ${fieldInfo.surroundingText}`.toLowerCase();
    
    // Comprehensive job application keywords
    const keywords = [
        // Question starters
        'why', 'how', 'what', 'when', 'where', 'tell us', 'describe', 'explain', 'share',
        
        // Experience related
        'experience', 'background', 'previous', 'work history', 'career', 'professional',
        'years of experience', 'relevant experience', 'work experience',
        
        // Motivation and goals
        'motivation', 'motivate', 'goals', 'aspirations', 'objective', 'interested',
        'passion', 'inspire', 'drive', 'ambition',
        
        // Company specific
        'company', 'organization', 'position', 'role', 'job', 'team', 'culture',
        'why do you want', 'why are you interested', 'why apply',
        
        // Skills and abilities
        'skills', 'abilities', 'competencies', 'qualifications', 'expertise',
        'technical skills', 'soft skills', 'programming', 'technologies',
        
        // Strengths and weaknesses
        'strength', 'weakness', 'accomplishment', 'achievement', 'success',
        'challenge', 'difficulty', 'problem', 'obstacle', 'overcome',
        
        // Work style and personality
        'work style', 'personality', 'approach', 'methodology', 'philosophy',
        'collaboration', 'teamwork', 'leadership', 'communication',
        
        // Projects and examples
        'project', 'example', 'instance', 'time when', 'situation', 'scenario',
        'demonstrate', 'showcase', 'portfolio',
        
        // Future and development
        'future', 'development', 'growth', 'learning', 'improve', 'develop',
        'see yourself', 'career path', 'next steps',
        
        // Cover letter indicators
        'cover letter', 'letter', 'introduction', 'summary', 'overview',
        
        // Common form field names/IDs
        'message', 'comment', 'additional', 'information', 'details', 'notes',
        'essay', 'statement', 'response', 'answer', 'question',
        
        // Salary and compensation
        'salary', 'compensation', 'expectations', 'requirements', 'budget',
        
        // Availability and logistics
        'availability', 'start date', 'relocate', 'travel', 'schedule', 'hours'
    ];
    
    // Check if any keyword matches
    const hasKeyword = keywords.some(keyword => allText.includes(keyword));
    
    // Additional checks for textarea fields (more likely to be application questions)
    const isTextarea = field.tagName.toLowerCase() === 'textarea';
    const isLongText = field.type === 'text' && (field.getAttribute('maxlength') > 100 || !field.getAttribute('maxlength'));
    
    // Debug logging for development
    if (hasKeyword || isTextarea) {
        console.log('Job application field detected:', {
            element: field,
            label: fieldInfo.label,
            placeholder: fieldInfo.placeholder,
            hasKeyword,
            isTextarea,
            matchedText: allText.substring(0, 200)
        });
    }
    
    // Consider it a job application field if:
    // 1. Contains relevant keywords, OR
    // 2. Is a textarea (commonly used for long-form answers), OR  
    // 3. Is a long text field
    return hasKeyword || isTextarea || isLongText;
}

// Get field information
function getFieldInfo(field) {
    if (!field) return { label: '', placeholder: '', id: '', name: '' };
    
    let label = '';
    let contextText = '';
    
    // Try to find associated label
    if (field.id) {
        const labelElement = document.querySelector(`label[for="${field.id}"]`);
        if (labelElement) label = labelElement.textContent.trim();
    }
    
    // Look for nearby text content with expanded search
    if (!label) {
        const parent = field.closest('.form-group, .field, .form-field, .input-group, .question, .form-item, div');
        if (parent) {
            // Look for various label selectors
            const labelElement = parent.querySelector('label, .label, .field-label, .question-text, .form-label, h1, h2, h3, h4, h5, h6');
            if (labelElement) label = labelElement.textContent.trim();
            
            // Also capture any additional context text in the parent
            const textNodes = Array.from(parent.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
                .map(node => node.textContent.trim());
            contextText = textNodes.join(' ');
        }
    }
    
    // Check previous sibling for label text
    if (!label && field.previousElementSibling) {
        const prev = field.previousElementSibling;
        if (prev.tagName === 'LABEL' || prev.classList.contains('label') || ['H1','H2','H3','H4','H5','H6','P','SPAN','DIV'].includes(prev.tagName)) {
            label = prev.textContent.trim();
        }
    }
    
    // Check next sibling as well (sometimes labels come after fields)
    if (!label && field.nextElementSibling) {
        const next = field.nextElementSibling;
        if (next.tagName === 'LABEL' || next.classList.contains('label')) {
            label = next.textContent.trim();
        }
    }
    
    // Look for aria-label or aria-describedby
    const ariaLabel = field.getAttribute('aria-label') || '';
    const ariaDescribedBy = field.getAttribute('aria-describedby');
    let ariaDescription = '';
    if (ariaDescribedBy) {
        const descElement = document.getElementById(ariaDescribedBy);
        if (descElement) ariaDescription = descElement.textContent.trim();
    }
    
    // Look for surrounding text in a wider area
    const grandParent = field.closest('.form-section, .application-section, .question-group, section, article');
    let surroundingText = '';
    if (grandParent) {
        // Get all text content but exclude input values
        const clone = grandParent.cloneNode(true);
        // Remove input elements to avoid capturing their values
        clone.querySelectorAll('input, textarea, select').forEach(el => el.remove());
        surroundingText = clone.textContent.replace(/\s+/g, ' ').trim();
    }
    
    return {
        label: label || ariaLabel || '',
        placeholder: field.placeholder || '',
        id: field.id || '',
        name: field.name || '',
        contextText: contextText || '',
        ariaDescription: ariaDescription || '',
        surroundingText: surroundingText.substring(0, 500) || '' // Limit to prevent too much text
    };
}

// Show template suggestions
async function showSuggestions(field, x = null, y = null) {
    if (suggestionPanel) {
        closeSuggestions();
    }
    
    try {
        // Load templates
        const defaultTemplates = await fetch(chrome.runtime.getURL('templates.json'));
        const defaultData = await defaultTemplates.json();
        const storageResult = await chrome.storage.local.get(['customTemplates']);
        const customTemplates = storageResult.customTemplates || {};
        const allTemplates = { ...defaultData.templates, ...customTemplates };
        
        // Create suggestion panel
        suggestionPanel = createSuggestionPanel(allTemplates, field);
        
        // Position panel
        positionSuggestionPanel(suggestionPanel, field, x, y);
        
        document.body.appendChild(suggestionPanel);
        
        // Focus first template
        const firstTemplate = suggestionPanel.querySelector('.template-suggestion');
        if (firstTemplate) firstTemplate.focus();
        
    } catch (error) {
        console.error('Error showing suggestions:', error);
    }
}

// Create suggestion panel
function createSuggestionPanel(templates, field) {
    const panel = document.createElement('div');
    panel.className = 'applying-assistant-suggestions';
    
    // Get relevant templates based on field info
    const fieldInfo = getFieldInfo(field);
    const relevantTemplates = getRelevantTemplates(templates, fieldInfo);
    
    let html = `
        <div class="suggestions-header">
            <h4>🚀 Job Assistant Templates</h4>
            <button class="close-btn">&times;</button>
        </div>
        <div class="suggestions-content">
    `;
    
    if (relevantTemplates.length > 0) {
        relevantTemplates.forEach(([key, template]) => {
            html += `
                <div class="template-suggestion" data-key="${key}" tabindex="0">
                    <div class="template-title">${template.title}</div>
                    <div class="template-preview">${truncateText(template.default_text, 100)}</div>
                </div>
            `;
        });
    } else {
        html += '<div class="no-templates">No relevant templates found</div>';
    }
    
    html += '</div>';
    panel.innerHTML = html;
    
    // Add styles
    addSuggestionPanelStyles(panel);
    
    // Add event listeners
    setupSuggestionPanelEvents(panel, field);
    
    return panel;
}

// Get relevant templates based on field info
function getRelevantTemplates(templates, fieldInfo) {
    const allText = `${fieldInfo.label} ${fieldInfo.placeholder} ${fieldInfo.contextText} ${fieldInfo.ariaDescription} ${fieldInfo.surroundingText}`.toLowerCase();
    const scored = Object.entries(templates).map(([key, template]) => {
        let score = 0;
        
        // Keyword matching from template title
        const titleKeywords = template.title.toLowerCase().split(' ');
        titleKeywords.forEach(keyword => {
            if (allText.includes(keyword)) score += 3;
        });
        
        // Enhanced keyword matching for common job application terms
        const jobKeywords = [
            'experience', 'background', 'goals', 'motivation', 'why', 'skills',
            'strength', 'weakness', 'challenge', 'team', 'project', 'company',
            'position', 'salary', 'compensation', 'cover letter', 'leadership',
            'communication', 'technical', 'programming', 'development'
        ];
        
        jobKeywords.forEach(keyword => {
            if (allText.includes(keyword) && template.title.toLowerCase().includes(keyword)) {
                score += 5; // Higher score for exact matches
            }
        });
        
        // Bonus for textarea fields (likely long-form answers)
        if (fieldInfo.label && template.title.toLowerCase().includes('cover letter') && allText.includes('cover')) {
            score += 10;
        }
        
        // Bonus for specific question patterns
        if (allText.includes('why do you want') && template.title.toLowerCase().includes('company')) {
            score += 10;
        }
        
        if (allText.includes('tell us about') && template.title.toLowerCase().includes('experience')) {
            score += 10;
        }
        
        return [key, template, score];
    });
    
    return scored
        .filter(([, , score]) => score > 0)
        .sort(([, , a], [, , b]) => b - a)
        .slice(0, 8) // Show more templates since we have better matching
        .map(([key, template]) => [key, template]);
}

// Position suggestion panel
function positionSuggestionPanel(panel, field, x, y) {
    const panelWidth = 350;
    const panelHeight = 400;
    
    // Always position in bottom right corner, regardless of field location
    const left = window.innerWidth - panelWidth - 20; // 20px from right edge
    const top = window.innerHeight - panelHeight - 20; // 20px from bottom edge
    
    // Ensure panel is visible (minimum distances from edges)
    const finalLeft = Math.max(10, left);
    const finalTop = Math.max(10, top);
    
    panel.style.left = finalLeft + 'px';
    panel.style.top = finalTop + 'px';
}

// Add styles to suggestion panel
function addSuggestionPanelStyles(panel) {
    Object.assign(panel.style, {
        position: 'fixed',
        width: '350px',
        maxHeight: '400px',
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        zIndex: '10001',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        overflow: 'hidden'
    });
    
    // Add internal styles
    const style = document.createElement('style');
    style.textContent = `
        .applying-assistant-suggestions .suggestions-header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .applying-assistant-suggestions h4 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        .applying-assistant-suggestions .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        
        .applying-assistant-suggestions .suggestions-content {
            max-height: 350px;
            overflow-y: auto;
            padding: 8px;
        }
        
        .applying-assistant-suggestions .template-suggestion {
            padding: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
            background: #f8fafc;
        }
        
        .applying-assistant-suggestions .template-suggestion:hover,
        .applying-assistant-suggestions .template-suggestion:focus {
            background: #f1f5f9;
            border-color: #6366f1;
            outline: none;
        }
        
        .applying-assistant-suggestions .template-title {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 4px;
        }
        
        .applying-assistant-suggestions .template-category {
            font-size: 12px;
            color: #6366f1;
            background: #ede9fe;
            padding: 2px 8px;
            border-radius: 12px;
            display: inline-block;
            margin-bottom: 8px;
        }
        
        .applying-assistant-suggestions .template-preview {
            font-size: 13px;
            color: #64748b;
            line-height: 1.4;
        }
        
        .applying-assistant-suggestions .no-templates {
            text-align: center;
            color: #64748b;
            padding: 20px;
        }
    `;
    
    panel.appendChild(style);
}

// Setup suggestion panel event listeners
function setupSuggestionPanelEvents(panel, field) {
    // Close button
    panel.querySelector('.close-btn').addEventListener('click', closeSuggestions);
    
    // Template selection
    panel.querySelectorAll('.template-suggestion').forEach(suggestion => {
        suggestion.addEventListener('click', async () => {
            const templateKey = suggestion.dataset.key;
            try {
                const defaultTemplates = await fetch(chrome.runtime.getURL('templates.json'));
                const defaultData = await defaultTemplates.json();
                const storageResult = await chrome.storage.local.get(['customTemplates']);
                const customTemplates = storageResult.customTemplates || {};
                const allTemplates = { ...defaultData.templates, ...customTemplates };
                
                const template = allTemplates[templateKey];
                if (template) {
                    insertTemplateIntoField(field, template.default_text);
                    // Keep panel open after template insertion - don't auto-close
                }
            } catch (error) {
                console.error('Error inserting template:', error);
            }
        });
        
        // Keyboard navigation
        suggestion.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    suggestion.click();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    const next = suggestion.nextElementSibling;
                    if (next) next.focus();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    const prev = suggestion.previousElementSibling;
                    if (prev) prev.focus();
                    break;
                case 'Escape':
                    closeSuggestions();
                    break;
            }
        });
    });
    
    // Removed click-outside-to-close behavior - panel stays open until manually closed
}

// Close suggestions panel
function closeSuggestions() {
    if (suggestionPanel) {
        suggestionPanel.remove();
        suggestionPanel = null;
    }
}

// Insert template into field
function insertTemplateIntoField(field, text) {
    field.focus();
    
    if (field.contentEditable === 'true') {
        // Handle contenteditable fields
        field.innerText = text;
        
        // Trigger input event
        field.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        // Handle regular input/textarea fields
        field.value = text;
        
        // Trigger events
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Move cursor to end
    if (field.setSelectionRange) {
        field.setSelectionRange(text.length, text.length);
    }
}

// Insert template (called from popup)
function insertTemplate(text) {
    if (currentField) {
        insertTemplateIntoField(currentField, text);
    } else {
        // Try to find focused field
        const focused = document.activeElement;
        if (isFormField(focused)) {
            insertTemplateIntoField(focused, text);
        } else {
            alert('Please click on a text field first, then use the template.');
        }
    }
}

// Toggle suggestions
function toggleSuggestions() {
    if (suggestionPanel) {
        closeSuggestions();
    } else if (currentField) {
        showSuggestions(currentField);
    }
}

// Cleanup function
function cleanup() {
    // Remove indicators
    document.querySelectorAll('.applying-assistant-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Close suggestions
    closeSuggestions();
    
    // Remove field markers
    document.querySelectorAll('[data-applying-assistant-attached]').forEach(field => {
        delete field.dataset.jobAssistantAttached;
    });
}

// Utility function to truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
        settings = changes.settings.newValue || settings;
        if (!settings.autoDetect) {
            cleanup();
        } else {
            setupFieldDetection();
        }
    }
}); 