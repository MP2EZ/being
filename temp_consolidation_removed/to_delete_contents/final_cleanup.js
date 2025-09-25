const fs = require('fs');

// Clean up temporary files
const tempFiles = [
    'temp_cleanup.js',
    'cleanup_debug.sh', 
    'run_cleanup.js',
    'simple_cleanup.js',
    'execute_cleanup.sh'
];

tempFiles.forEach(file => {
    const filepath = `/Users/max/Development/active/fullmind/${file}`;
    if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`Removed temp file: ${file}`);
    }
});

console.log('Cleanup completed successfully!');