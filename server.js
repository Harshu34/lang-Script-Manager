const express = require('express');
const path = require('path');
const fs = require('fs');
const { processLanguageUpdate } = require('./langUpdateArgos');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(__dirname));
app.use(express.json({ limit: '10mb' }));

// Route to serve the main page
app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to get module data
app.get('/api/modules', (req, res) => {
    try {
        const data = fs.readFileSync('module_language_files.txt', 'utf8');
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(data);
    } catch (error) {
        res.status(500).json({ error: 'Could not read module data file' });
    }
});

// Route to handle file path selection
app.post('/api/select-file', express.json(), (req, res) => {
    const { filePath } = req.body;
    if (filePath) {
        console.log('Selected file path:', filePath);
        res.json({ success: true, message: `File path logged: ${filePath}` });
    } else {
        res.status(400).json({ error: 'No file path provided' });
    }
});

// Route to handle language file updates
app.post('/api/update-language-files', async (req, res) => {
    try {
        const { filePath, entries, fileType } = req.body;
        
        if (!filePath || !entries || !fileType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: filePath, entries, or fileType'
            });
        }
        
        console.log(`Processing language update for ${fileType} file: ${filePath}`);
        console.log(`Entries to add:`, Object.keys(entries));
        
        const result = await processLanguageUpdate(filePath, entries, fileType);
        
        if (result.success) {
            console.log('✅ Language files updated successfully');
            console.log('Details:', result.details);
        } else {
            console.log('❌ Failed to update language files:', result.message);
        }
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Error in language update API:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`📄 Module data file: ${path.join(__dirname, 'module_language_files.txt')}`);
});
