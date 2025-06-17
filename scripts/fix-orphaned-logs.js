const fs = require('fs');
const path = require('path');

// Function to fix orphaned console.error statements
function fixOrphanedLogs(content) {
    const lines = content.split('\n');
    const fixedLines = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Check for orphaned object properties (lines that start with property names)
        if (trimmedLine.match(/^(error|stack|orderId|token|PayerID|addressId|razorpay_order_id|razorpay_payment_id|hasSignature|expected|received|body|transactionId|razorpayOrderId|status|userId):/)) {
            // Skip this line and continue looking for the closing bracket
            while (i < lines.length && !lines[i].trim().includes('})')) {
                i++;
            }
            // Skip the closing bracket line too
            if (i < lines.length && lines[i].trim().includes('})')) {
                i++;
            }
            continue;
        }
        
        fixedLines.push(line);
        i++;
    }
    
    return fixedLines.join('\n');
}

// Function to clean up empty lines and fix formatting
function cleanupFormatting(content) {
    // Remove multiple consecutive empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Remove trailing whitespace
    content = content.replace(/[ \t]+$/gm, '');
    
    return content;
}

// Main function
function fixFiles() {
    const keyFiles = [
        'src/controllers/user/paymentController.js',
        'src/controllers/user/checkoutController.js',
        'public/js/payment.js',
        'public/js/order-details.js'
    ];
    
    const projectRoot = path.resolve(__dirname, '..');
    let processedFiles = 0;
    let modifiedFiles = 0;
    
    keyFiles.forEach(relativePath => {
        const filePath = path.join(projectRoot, relativePath);
        
        try {
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️  File not found: ${relativePath}`);
                return;
            }
            
            const originalContent = fs.readFileSync(filePath, 'utf8');
            let fixedContent = originalContent;
            
            // Fix orphaned logs
            fixedContent = fixOrphanedLogs(fixedContent);
            
            // Clean up formatting
            fixedContent = cleanupFormatting(fixedContent);
            
            // Only write if content changed
            if (fixedContent !== originalContent) {
                fs.writeFileSync(filePath, fixedContent, 'utf8');
                console.log(`✓ Fixed: ${relativePath}`);
                modifiedFiles++;
            } else {
                console.log(`- No changes: ${relativePath}`);
            }
            
            processedFiles++;
        } catch (error) {
            console.error(`✗ Error processing ${relativePath}:`, error.message);
        }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Processed files: ${processedFiles}`);
    console.log(`   Modified files: ${modifiedFiles}`);
}

// Run the fix
console.log('🔧 Fixing orphaned console.error statements...\n');
fixFiles();
console.log('\n✨ Fix completed!');
