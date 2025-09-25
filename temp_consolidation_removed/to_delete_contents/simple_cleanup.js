console.log('Starting cleanup of debug directory...');

const fs = require('fs');
const path = require('path');

const debugDir = '/Users/max/Development/active/fullmind/app/src/components/debug';

// Get file sizes
let totalSize = 0;
if (fs.existsSync(debugDir)) {
    const files = fs.readdirSync(debugDir);
    files.forEach(file => {
        const filePath = path.join(debugDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        console.log(`Found: ${file} (${stats.size} bytes)`);
    });
}

console.log(`Total size to recover: ${totalSize} bytes (${(totalSize/1024).toFixed(2)} KB)`);

// Remove directory recursively
function rmDir(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach(file => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                rmDir(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(dirPath);
    }
}

rmDir(debugDir);

if (!fs.existsSync(debugDir)) {
    console.log('SUCCESS: Debug directory removed');
    console.log(`Space recovered: ${(totalSize/1024).toFixed(2)} KB`);
} else {
    console.log('FAILED: Could not remove debug directory');
}