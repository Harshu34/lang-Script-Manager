// Global variables
let moduleData = {};
let selectedModule = '';
let selectedFileType = 'properties';
let selectedFilePath = '';

// DOM elements
const moduleSelect = document.getElementById('moduleSelect');
const fileTypeButtons = document.querySelectorAll('.file-type-btn');
const filesSection = document.getElementById('filesSection');
const filesList = document.getElementById('filesList');
const selectedFileSection = document.getElementById('selectedFileSection');
const selectedFileDisplay = document.getElementById('selectedFileDisplay');
const keyValueSection = document.getElementById('keyValueSection');
const keyValueInput = document.getElementById('keyValueInput');
const saveBtn = document.getElementById('saveBtn');
const statusText = document.getElementById('statusText');
const formatHelp = document.getElementById('formatHelp');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadModuleData();
    setupEventListeners();
    updateFormatDisplay(); // Set initial format display
    updateStatus('Ready to select module and file');
});

// Load module data from the text file
async function loadModuleData() {
    try {
        const response = await fetch('/api/modules');
        const text = await response.text();
        parseModuleData(text);
        populateModuleDropdown();
    } catch (error) {
        console.error('Error loading module data:', error);
        updateStatus('Error: Could not load module data');
    }
}

// Parse the module data from text file
function parseModuleData(text) {
    console.log('Parsing module data...');
    const lines = text.split('\n');
    let currentModule = '';
    let currentSection = '';
    
    for (let line of lines) {
        line = line.trim();
        
        if (line.startsWith('moduleName=')) {
            currentModule = line.split('=')[1];
            moduleData[currentModule] = {
                properties: [],
                javascript: []
            };
            console.log(`Found module: ${currentModule}`);
        } else if (line === 'Properties Files:') {
            currentSection = 'properties';
            console.log(`Section: ${currentSection}`);
        } else if (line === 'JavaScript Files:') {
            currentSection = 'javascript';
            console.log(`Section: ${currentSection}`);
        } else if ((line.startsWith('./') || line.startsWith('/home/')) && currentModule && currentSection) {
            console.log(`Processing file: ${line}`);
            // Handle special cases
            if (line.includes('(No properties files - uses JSON format)')) {
                moduleData[currentModule].properties = ['No properties files - uses JSON format'];
            } else if (line.includes('(No JavaScript language files found)')) {
                moduleData[currentModule].javascript = ['No JavaScript language files found'];
            } else if (line.includes('Properties File:') || line.includes('JavaScript File:')) {
                // Handle single file entries
                const filePath = line.split(': ')[1];
                if (line.includes('Properties File:')) {
                    moduleData[currentModule].properties.push(filePath);
                } else {
                    moduleData[currentModule].javascript.push(filePath);
                }
            } else {
                // Regular file path
                moduleData[currentModule][currentSection].push(line);
            }
        }
    }
    
    console.log('Parsed module data:', moduleData);
}

// Populate the module dropdown
function populateModuleDropdown() {
    const modules = Object.keys(moduleData);
    modules.sort();
    
    modules.forEach(module => {
        const option = document.createElement('option');
        option.value = module;
        option.textContent = module;
        moduleSelect.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Module selection
    moduleSelect.addEventListener('change', function() {
        selectedModule = this.value;
        if (selectedModule) {
            displayFiles();
            updateStatus(`Selected module: ${selectedModule}`);
        } else {
            hideFiles();
            updateStatus('Ready to select module and file');
        }
    });
    
    // File type buttons
    fileTypeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            fileTypeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedFileType = this.dataset.type;
            
            // Update format display based on file type
            updateFormatDisplay();
            
            if (selectedModule) {
                displayFiles();
                updateStatus(`Showing ${selectedFileType} files for ${selectedModule}`);
            }
        });
    });
    
    // Save button
    saveBtn.addEventListener('click', function() {
        if (selectedFilePath) {
            printToTerminal(selectedFilePath);
            updateStatus(`File path printed to terminal: ${selectedFilePath}`);
        }
    });
    
    // Key-value input
    keyValueInput.addEventListener('input', function() {
        updateSaveButton();
    });
}

// Display files for selected module and file type
function displayFiles() {
    if (!selectedModule || !moduleData[selectedModule]) {
        hideFiles();
        return;
    }
    
    const files = moduleData[selectedModule][selectedFileType];
    
    if (!files || files.length === 0) {
        filesList.innerHTML = '<div class="file-item" style="color: #6b7280; font-style: italic;">No files available for this module and file type</div>';
    } else {
        filesList.innerHTML = '';
        files.forEach(file => {
            const fileItem = createFileItem(file);
            filesList.appendChild(fileItem);
        });
    }
    
    filesSection.style.display = 'block';
    selectedFileSection.style.display = 'none';
    selectedFilePath = '';
    updateSaveButton();
}

// Create a file item element
function createFileItem(filePath) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.path = filePath;
    
    const icon = document.createElement('i');
    icon.className = selectedFileType === 'properties' ? 'fas fa-cog' : 'fab fa-js-square';
    
    const pathSpan = document.createElement('span');
    pathSpan.className = 'file-path';
    pathSpan.textContent = filePath;
    
    fileItem.appendChild(icon);
    fileItem.appendChild(pathSpan);
    
    fileItem.addEventListener('click', function() {
        selectFile(filePath, fileItem);
    });
    
    return fileItem;
}

// Select a file
function selectFile(filePath, fileItem) {
    // Remove selection from all items
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selection to clicked item
    fileItem.classList.add('selected');
    
    selectedFilePath = filePath;
    selectedFileDisplay.textContent = filePath;
    selectedFileSection.style.display = 'block';
    keyValueSection.style.display = 'block';
    
    updateFormatDisplay();
    updateSaveButton();
    updateStatus(`Selected file: ${filePath}`);
}

// Hide files section
function hideFiles() {
    filesSection.style.display = 'none';
    selectedFileSection.style.display = 'none';
    keyValueSection.style.display = 'none';
    selectedFilePath = '';
    updateSaveButton();
}

// Update format display based on file type
function updateFormatDisplay() {
    if (selectedFileType === 'properties') {
        keyValueInput.placeholder = `Enter key-value pairs in format:
Key\\ Name=Value text here
Another\\ Key=Another value here

Example:
Do\\ You\\ Want\\ To\\ Proceed=Do you want to proceed
Confirm\\ Delete=Are you sure you want to delete this item?`;
        formatHelp.textContent = "Enter one key-value pair per line in the format: Key\\ Name=Value (use backslash for spaces)";
    } else if (selectedFileType === 'javascript') {
        keyValueInput.placeholder = `Enter key-value pairs in format:
KEY_NAME=Value text here
ANOTHER_KEY=Another value here

Example:
ARE_YOU_SURE_WANT_TO_REASSIGN_CHECKLIST=Are you sure want to reassign the checklist
CONFIRM_DELETE=Are you sure you want to delete this item?`;
        formatHelp.textContent = "Enter one key-value pair per line in the format: KEY_NAME=Value";
    }
}

// Update save button state
function updateSaveButton() {
    const hasKeyValuePairs = keyValueInput.value.trim().length > 0;
    saveBtn.disabled = !selectedFilePath || !hasKeyValuePairs;
}

// Parse key-value pairs from textarea
function parseKeyValuePairs(text) {
    const lines = text.split('\n');
    const entries = {};
    const errors = [];
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
            const equalIndex = trimmedLine.indexOf('=');
            if (equalIndex > 0) {
                const key = trimmedLine.substring(0, equalIndex).trim();
                const value = trimmedLine.substring(equalIndex + 1).trim();
                
                if (key && value) {
                    entries[key] = value;
                } else {
                    errors.push(`Line ${index + 1}: Invalid format`);
                }
            } else {
                errors.push(`Line ${index + 1}: Missing '=' separator`);
            }
        }
    });
    
    return { entries, errors };
}

// Show message popup
function showMessage(message, type = 'success') {
    const popup = document.createElement('div');
    popup.className = `message-popup ${type}`;
    popup.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}"></i>
            <div>
                <div style="font-weight: 600; margin-bottom: 5px;">${type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Warning'}</div>
                <div style="font-size: 0.9rem; line-height: 1.4;">${message}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 8000);
}

// Update language files
async function updateLanguageFiles(filePath, entriesObj, fileType) {
    try {
        // Show loading state
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="loading-spinner"></span> Updating language files...';
        document.body.classList.add('loading');
        
        const response = await fetch('/api/update-language-files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filePath,
                entries: entriesObj,
                fileType
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Language files updated successfully!', 'success');
            updateStatus('Language files updated successfully');
            
            // Show detailed results
            if (result.details && result.details.length > 0) {
                const detailsMessage = result.details.join('\n');
                console.log('Update details:', detailsMessage);
                
                // Show details in a longer popup
                showMessage(`Files updated successfully!\n\nDetails:\n${detailsMessage}`, 'success');
            }
        } else {
            showMessage(result.message || 'Failed to update language files', 'error');
            updateStatus('Failed to update language files');
        }
        
    } catch (error) {
        console.error('Error updating language files:', error);
        showMessage('Network error. Please try again.', 'error');
        updateStatus('Network error occurred');
    } finally {
        // Reset loading state
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Selection & Update Language Files';
        document.body.classList.remove('loading');
    }
}

// Print to terminal and update language files
async function printToTerminal(filePath) {
    console.log('Selected file path:', filePath);
    
    // Parse key-value pairs
    const keyValueText = keyValueInput.value.trim();
    if (!keyValueText) {
        showMessage('Please enter key-value pairs', 'error');
        return;
    }
    
    const { entries, errors } = parseKeyValuePairs(keyValueText);
    
    if (errors.length > 0) {
        showMessage(`Invalid key-value pairs:\n${errors.join('\n')}`, 'error');
        return;
    }
    
    if (Object.keys(entries).length === 0) {
        showMessage('No valid key-value pairs found', 'error');
        return;
    }
    
    // Send to server for language file update
    await updateLanguageFiles(filePath, entries, selectedFileType);
}

// Update status message
function updateStatus(message) {
    statusText.textContent = message;
}

// Add some visual feedback for better UX
function addVisualFeedback(element, type = 'success') {
    const originalBackground = element.style.background;
    const color = type === 'success' ? '#10b981' : '#ef4444';
    
    element.style.background = color;
    element.style.color = 'white';
    
    setTimeout(() => {
        element.style.background = originalBackground;
        element.style.color = '';
    }, 300);
}
