const fs = require('fs');
const path = require('path');

const industriesDir = path.join(__dirname, '../src/data/industries');

fs.readdir(industriesDir, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        return;
    }

    files.filter(file => file.endsWith('.json')).forEach(file => {
        const filePath = path.join(industriesDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            JSON.parse(content);
            console.log(`✓ ${file} is valid JSON`);
        } catch (error) {
            console.error(`✗ ${file} has invalid JSON:`, error.message);
        }
    });
}); 