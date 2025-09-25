const { execSync } = require('child_process');
const path = require('path');

try {
    // Make the script executable and run it
    execSync('chmod +x cleanup_debug.sh', { cwd: '/Users/max/Development/active/fullmind' });
    const result = execSync('./cleanup_debug.sh', { 
        cwd: '/Users/max/Development/active/fullmind',
        encoding: 'utf8' 
    });
    console.log(result);
} catch (error) {
    console.error('Error:', error.message);
    console.log('Stdout:', error.stdout);
    console.log('Stderr:', error.stderr);
}