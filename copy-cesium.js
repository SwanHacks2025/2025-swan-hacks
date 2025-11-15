const fs = require('fs');
const path = require('path');

const cesiumSource = path.join(__dirname, 'node_modules', 'cesium', 'Build', 'Cesium');
const publicDir = path.join(__dirname, 'public');
const cesiumDest = path.join(publicDir, 'cesium');

console.log('Copying Cesium assets...');
console.log('From:', cesiumSource);
console.log('To:', cesiumDest);

// Check if source exists
if (!fs.existsSync(cesiumSource)) {
    console.error('Cesium source directory not found!');
    console.error('Make sure cesium is installed: npm install cesium');
    process.exit(1);
}

// Create public directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
    console.log('Creating public directory...');
    fs.mkdirSync(publicDir, { recursive: true });
}

// Remove existing destination
if (fs.existsSync(cesiumDest)) {
    console.log('Removing existing cesium directory...');
    fs.rmSync(cesiumDest, { recursive: true, force: true });
}

// Create destination directory
fs.mkdirSync(cesiumDest, { recursive: true });

// Copy files recursively
function copyRecursive(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

try {
    copyRecursive(cesiumSource, cesiumDest);
    console.log('Cesium assets copied successfully to public/cesium');

    // Verify key folders exist
    const requiredFolders = ['Assets', 'ThirdParty', 'Widgets', 'Workers'];
    const allExist = requiredFolders.every(folder =>
        fs.existsSync(path.join(cesiumDest, folder))
    );

    if (allExist) {
        console.log('All required Cesium folders verified');
    } else {
        console.warn('Some Cesium folders may be missing');
    }
} catch (error) {
    console.error('Error copying Cesium assets:', error);
    process.exit(1);
}