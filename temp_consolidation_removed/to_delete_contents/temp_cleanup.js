const fs = require('fs');
const path = require('path');

const debugDir = '/Users/max/Development/active/fullmind/app/src/components/debug';

function removeDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
        const stats = fs.statSync(dirPath);
        let totalSize = 0;
        
        if (stats.isDirectory()) {
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
                const filePath = path.join(dirPath, file);
                const fileStats = fs.statSync(filePath);
                totalSize += fileStats.size;
                if (fileStats.isDirectory()) {
                    removeDirectory(filePath);
                } else {
                    fs.unlinkSync(filePath);
                }
            });
            fs.rmdirSync(dirPath);
        }
        
        console.log(`Removed debug directory. Space recovered: ${totalSize} bytes (${(totalSize/1024).toFixed(2)} KB)`);
    } else {
        console.log('Directory does not exist');
    }
}

removeDirectory(debugDir);