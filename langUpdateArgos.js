const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const sourceLang = 'en';

const targetLangs = [
  'da', 'fr', 'de', 'es', 'eslac', 'esusa', 'fi', 'it',
  'ja', 'ko', 'nl', 'no', 'pl', 'pt', 'ptbr', 'sv', 'zhtw',
  'cf', 'test'
];

// Map custom/internal codes to Argos Translate compatible ones
const argosLangMap = {
  da: 'da',
  fr: 'fr',
  de: 'de',
  es: 'es',
  eslac: 'es',     // Spanish (Latin America) - using Spanish
  esusa: 'es',     // Spanish (USA) - using Spanish
  fi: 'fi',
  it: 'it',
  ja: 'ja',
  ko: 'ko',
  nl: 'nl',
  no: 'no',        // Norwegian - using Norwegian Bokmål
  pl: 'pl',
  pt: 'pt',
  ptbr: 'pt',      // Brazilian Portuguese
  sv: 'sv',
  zhtw: 'zh',      // Traditional Chinese (using simplified)
  cf: 'fr',        // Canadian French - using French
  test: 'en'       // Test language - using English
};

const translateText = async (text, targetLang) => {
  const argosLangCode = argosLangMap[targetLang];

  if (!argosLangCode) {
    // If language not supported or is English, just return original text
    return text;
  }

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['translate_argos.py', text, argosLangCode]);
    
    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        const translatedText = output.trim();
        resolve(translatedText);
      } else {
        console.error(`❌ Translation failed for "${text}" to ${targetLang}:`, errorOutput);
        // Return original text as fallback (like in original langUpdate.js)
        resolve(text);
      }
    });

    pythonProcess.on('error', (error) => {
      console.error(`❌ Translation process error for "${text}" to ${targetLang}:`, error.message);
      // Return original text as fallback
      resolve(text);
    });
  });
};

const appendToJavaScriptFile = (filePath, entriesObj) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const lastBracketIndex = content.lastIndexOf('};');
    if (lastBracketIndex === -1) {
      throw new Error(`Invalid JavaScript file format: ${filePath}`);
    }

    const beforeLastBracket = content.slice(0, lastBracketIndex).trimEnd();
    const needsComma = !beforeLastBracket.trim().endsWith(',');

    const additions = Object.entries(entriesObj)
      .map(([k, v]) => `  ${k}:"${v}"`)
      .join(',\n');

    const insertText = (needsComma ? ',\n' : '') + additions + '\n};';
    const finalContent = beforeLastBracket + insertText;

    fs.writeFileSync(filePath, finalContent, 'utf-8');
    return `✅ Updated: ${path.basename(filePath)} with ${Object.keys(entriesObj).length} entries`;
  } catch (error) {
    throw new Error(`Failed to update JavaScript file: ${error.message}`);
  }
};

const appendToPropertiesFile = (filePath, entriesObj) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Add new entries at the end
    const additions = Object.entries(entriesObj)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const finalContent = content.trim() + '\n' + additions + '\n';
    fs.writeFileSync(filePath, finalContent, 'utf-8');
    return `✅ Updated: ${path.basename(filePath)} with ${Object.keys(entriesObj).length} entries`;
  } catch (error) {
    throw new Error(`Failed to update properties file: ${error.message}`);
  }
};

const getLanguageFiles = (baseFilePath, fileType) => {
  const files = {};
  const baseDir = path.dirname(baseFilePath);
  const fileName = path.basename(baseFilePath);
  
  // Add English file
  files['en'] = baseFilePath;
  
  // Add other language files
  for (const lang of targetLangs) {
    if (fileType === 'javascript') {
      // For JS files, we need to go up one level from 'en' folder to 'lang' folder,
      // then into the specific language folder, and create the correct filename
      // Example: /lang/en/en_cm.js -> /lang/da/da_cm.js
      const langDir = path.join(path.dirname(baseDir), lang);
      const langFileName = fileName.replace('en_', `${lang}_`);
      files[lang] = path.join(langDir, langFileName);
    } else {
      // For properties files, replace 'en' with language code in path
      const langPath = baseFilePath.replace('/en/', `/${lang}/`);
      files[lang] = langPath;
    }
  }
  
  return files;
};

const processLanguageUpdate = async (filePath, entriesObj, fileType) => {
  const results = [];
  const languageFiles = getLanguageFiles(filePath, fileType);
  
  try {
    // First, update the English file
    if (fileType === 'javascript') {
      const result = appendToJavaScriptFile(languageFiles['en'], entriesObj);
      results.push(result);
    } else {
      const result = appendToPropertiesFile(languageFiles['en'], entriesObj);
      results.push(result);
    }
    
    // Then translate and update other language files
    for (const lang of targetLangs) {
      const langFilePath = languageFiles[lang];
      
      // Check if the language file exists
      if (!fs.existsSync(langFilePath)) {
        results.push(`⚠️ Skipped: ${path.basename(langFilePath)} (file not found)`);
        continue;
      }
      
      try {
        const translatedEntries = {};
        
        // Translate each entry
        for (const [key, enValue] of Object.entries(entriesObj)) {
          const translatedValue = await translateText(enValue, lang);
          translatedEntries[key] = translatedValue;
        }
        
        // Update the language file with translated entries
        if (fileType === 'javascript') {
          const result = appendToJavaScriptFile(langFilePath, translatedEntries);
          results.push(result);
        } else {
          const result = appendToPropertiesFile(langFilePath, translatedEntries);
          results.push(result);
        }
        
        // Small delay between languages (Argos Translate is offline, so no rate limiting needed)
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.push(`❌ Failed to update ${lang}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      message: 'Language files updated successfully using Argos Translate (offline)',
      details: results
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message,
      details: results
    };
  }
};

// Export for use in server
module.exports = {
  processLanguageUpdate,
  translateText
};

