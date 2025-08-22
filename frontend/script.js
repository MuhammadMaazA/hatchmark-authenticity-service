// Hatchmark Frontend JavaScript

// Configuration
const CONFIG = {
    API_BASE_URL: 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
    ENDPOINTS: {
        GENERATE_UPLOAD_URL: '/generate-upload-url',
        VERIFY_ARTWORK: '/verify-artwork'
    }
};

// Global state
let currentTab = 'register';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupDragAndDrop();
    showTab('register');
});

// Event Listeners Setup
function setupEventListeners() {
    // File input change events
    document.getElementById('registerFileInput').addEventListener('change', function(e) {
        handleFileSelect(e.target.files[0], 'register');
    });
    
    document.getElementById('verifyFileInput').addEventListener('change', function(e) {
        handleFileSelect(e.target.files[0], 'verify');
    });
    
    // Upload area click events
    document.getElementById('registerUploadArea').addEventListener('click', function() {
        document.getElementById('registerFileInput').click();
    });
    
    document.getElementById('verifyUploadArea').addEventListener('click', function() {
        document.getElementById('verifyFileInput').click();
    });
}

// Drag and Drop Setup
function setupDragAndDrop() {
    const registerArea = document.getElementById('registerUploadArea');
    const verifyArea = document.getElementById('verifyUploadArea');
    
    // Register area drag and drop
    registerArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    registerArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });
    
    registerArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0], 'register');
        }
    });
    
    // Verify area drag and drop
    verifyArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    verifyArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });
    
    verifyArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0], 'verify');
        }
    });
}

// Tab Management
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Set active button
    event.target.classList.add('active');
    
    currentTab = tabName;
}

// File Validation
function validateFile(file) {
    if (!file) {
        return { valid: false, error: 'No file selected' };
    }
    
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        return { valid: false, error: 'File size must be less than 10MB' };
    }
    
    if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Only JPG, PNG, and GIF files are supported' };
    }
    
    return { valid: true };
}

// File Selection Handler
function handleFileSelect(file, mode) {
    const validation = validateFile(file);
    
    if (!validation.valid) {
        showError(mode, validation.error);
        return;
    }
    
    // Reset previous results
    resetResults(mode);
    
    if (mode === 'register') {
        registerArtwork(file);
    } else if (mode === 'verify') {
        verifyArtwork(file);
    }
}

// Register Artwork Process
async function registerArtwork(file) {
    try {
        showProgress('register', 'Preparing upload...');
        
        // Step 1: Get presigned URL
        const uploadData = await getPresignedUrl(file.name);
        
        showProgress('register', 'Uploading to secure storage...', 30);
        
        // Step 2: Upload file to S3
        await uploadToS3(uploadData.uploadUrl, file);
        
        showProgress('register', 'Processing and registering...', 70);
        
        // Step 3: Simulate processing time (in real implementation, you'd poll for completion)
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        showProgress('register', 'Finalizing registration...', 100);
        
        // Step 4: Show success result
        showRegisterSuccess({
            transactionId: generateMockTransactionId(),
            timestamp: new Date().toISOString(),
            filename: file.name
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        showError('register', error.message || 'Registration failed. Please try again.');
    }
}

// Verify Artwork Process
async function verifyArtwork(file) {
    try {
        showProgress('verify', 'Analyzing image...', 30);
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filename', file.name);
        
        showProgress('verify', 'Checking against ledger...', 70);
        
        // Call verification endpoint
        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.VERIFY_ARTWORK}`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Verification failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        showProgress('verify', 'Processing results...', 100);
        
        // Show verification results
        showVerifyResult(result);
        
    } catch (error) {
        console.error('Verification error:', error);
        showError('verify', error.message || 'Verification failed. Please try again.');
    }
}

// Get Presigned URL from API
async function getPresignedUrl(filename) {
    const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.GENERATE_UPLOAD_URL}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename })
    });
    
    if (!response.ok) {
        throw new Error(`Failed to get upload URL: ${response.statusText}`);
    }
    
    return await response.json();
}

// Upload file to S3 using presigned URL
async function uploadToS3(presignedUrl, file) {
    const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type
        }
    });
    
    if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
    }
}

// Show Progress
function showProgress(mode, message, percent = 0) {
    // Hide upload area and results
    document.getElementById(`${mode}UploadArea`).style.display = 'none';
    document.getElementById(`${mode}Result`).style.display = 'none';
    document.getElementById(`${mode}Error`).style.display = 'none';
    
    // Show progress
    const progressDiv = document.getElementById(`${mode}Progress`);
    const progressFill = document.getElementById(`${mode}ProgressFill`);
    const progressText = document.getElementById(`${mode}ProgressText`);
    
    progressDiv.style.display = 'block';
    progressFill.style.width = `${percent}%`;
    progressText.textContent = message;
}

// Show Registration Success
function showRegisterSuccess(data) {
    document.getElementById('registerProgress').style.display = 'none';
    
    // Populate result data
    document.getElementById('transactionId').textContent = data.transactionId;
    document.getElementById('timestamp').textContent = new Date(data.timestamp).toLocaleString();
    
    // Show result
    document.getElementById('registerResult').style.display = 'block';
}

// Show Verification Result
function showVerifyResult(result) {
    document.getElementById('verifyProgress').style.display = 'none';
    
    const verdictIcon = document.getElementById('verdictIcon');
    const verdictTitle = document.getElementById('verdictTitle');
    const verdictDescription = document.getElementById('verdictDescription');
    const verificationDetails = document.getElementById('verificationDetails');
    
    // Mock result for demonstration (replace with actual API response)
    const mockResult = {
        verdict: 'VERIFIED',
        confidence: 100,
        originalTimestamp: '2025-01-01T12:00:00Z',
        transactionId: 'ql-tx-12345',
        creatorId: 'creator-abc123'
    };
    
    switch (mockResult.verdict) {
        case 'VERIFIED':
            verdictIcon.textContent = '✅';
            verdictIcon.className = 'verdict-icon verdict-verified';
            verdictTitle.textContent = 'Verified Authentic';
            verdictTitle.className = 'verdict-verified';
            verdictDescription.textContent = 'This image is registered and authentic. The watermark is intact.';
            
            // Show details
            document.getElementById('originalTimestamp').textContent = new Date(mockResult.originalTimestamp).toLocaleString();
            document.getElementById('originalTransactionId').textContent = mockResult.transactionId;
            document.getElementById('creatorId').textContent = mockResult.creatorId;
            verificationDetails.style.display = 'block';
            break;
            
        case 'POTENTIALLY_ALTERED':
            verdictIcon.textContent = '⚠️';
            verdictIcon.className = 'verdict-icon verdict-altered';
            verdictTitle.textContent = 'Potentially Altered';
            verdictTitle.className = 'verdict-altered';
            verdictDescription.textContent = 'This image matches a registered work but may have been modified.';
            verificationDetails.style.display = 'none';
            break;
            
        case 'NOT_REGISTERED':
        default:
            verdictIcon.textContent = '❌';
            verdictIcon.className = 'verdict-icon verdict-unregistered';
            verdictTitle.textContent = 'Not Registered';
            verdictTitle.className = 'verdict-unregistered';
            verdictDescription.textContent = 'This image is not found in our authenticity database.';
            verificationDetails.style.display = 'none';
            break;
    }
    
    document.getElementById('verifyResult').style.display = 'block';
}

// Show Error
function showError(mode, message) {
    document.getElementById(`${mode}Progress`).style.display = 'none';
    document.getElementById(`${mode}Result`).style.display = 'none';
    
    document.getElementById(`${mode}ErrorMessage`).textContent = message;
    document.getElementById(`${mode}Error`).style.display = 'block';
}

// Reset Forms
function resetRegisterForm() {
    resetResults('register');
    document.getElementById('registerFileInput').value = '';
}

function resetVerifyForm() {
    resetResults('verify');
    document.getElementById('verifyFileInput').value = '';
}

function resetResults(mode) {
    document.getElementById(`${mode}UploadArea`).style.display = 'block';
    document.getElementById(`${mode}Progress`).style.display = 'none';
    document.getElementById(`${mode}Result`).style.display = 'none';
    document.getElementById(`${mode}Error`).style.display = 'none';
}

// Utility Functions
function generateMockTransactionId() {
    return 'ql-tx-' + Math.random().toString(36).substr(2, 9);
}

// Configuration Update (for production deployment)
function updateApiConfig(apiUrl) {
    CONFIG.API_BASE_URL = apiUrl;
    console.log('API URL updated to:', apiUrl);
}

// Export for potential external use
window.HatchmarkUI = {
    showTab,
    updateApiConfig,
    resetRegisterForm,
    resetVerifyForm
};
