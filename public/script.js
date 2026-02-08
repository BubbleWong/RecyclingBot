const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const identifyBtn = document.getElementById('identifyBtn');
const btnText = identifyBtn.querySelector('.btn-text');
const loader = identifyBtn.querySelector('.loader');
const resultContainer = document.getElementById('resultContainer');
const resultType = document.getElementById('resultType');
const resultReason = document.getElementById('resultReason');
const binIcon = document.getElementById('binIcon');
const retakeOverlay = document.getElementById('retakeOverlay');

// Store the processed file
let currentFile = null;

// Handle click on upload area
uploadArea.addEventListener('click', () => {
    imageInput.click();
});

// Handle file selection
imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        // Show loading state implicitly by disabling button until processed
        identifyBtn.disabled = true;

        try {
            const resizedFile = await resizeImage(file, 1024);
            currentFile = resizedFile;

            // Create preview from resized image
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.classList.remove('hidden');
                previewContainer.classList.add('hidden');
                identifyBtn.disabled = false;
                retakeOverlay.classList.add('hidden'); // Hide overlay

                // hide result if new image is selected
                resultContainer.classList.add('hidden');
            };
            reader.readAsDataURL(resizedFile);
        } catch (error) {
            console.error("Error processing image:", error);
            alert("Failed to process image. Please try another one.");
        }
    }
});

// Handle identification
identifyBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    const file = currentFile;

    // Loading state
    setLoading(true);
    retakeOverlay.classList.add('hidden'); // Ensure hidden during load

    const formData = new FormData();
    formData.append('image', file);

    // Add selected model
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
        formData.append('model', modelSelect.value);
    }

    try {
        const response = await fetch('/api/classify', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        displayResult(data);
    } catch (error) {
        console.error('Error:', error);
        displayResult({ type: 'error', reason: 'Failed to identify the item. Please try again.' });
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    identifyBtn.disabled = isLoading;
    if (isLoading) {
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
    }
}

function displayResult(data) {
    resultContainer.classList.remove('hidden');
    resultContainer.className = 'result-card'; // reset classes
    retakeOverlay.classList.remove('hidden'); // Show overlay

    const type = data.type || 'unknown';
    const reason = data.reason || 'No description available.';

    resultType.textContent = type.replace('_', ' ');
    resultReason.textContent = reason;

    // Style based on type
    switch (type) {
        case 'blue_bin':
            resultContainer.classList.add('bin-blue');
            binIcon.textContent = '🔵';
            break;
        case 'green_bin':
            resultContainer.classList.add('bin-green');
            binIcon.textContent = '🟢';
            break;
        case 'black_bin':
            resultContainer.classList.add('bin-black');
            binIcon.textContent = '⚫';
            break;
        case 'garbage':
            resultContainer.classList.add('bin-garbage');
            binIcon.textContent = '🗑️';
            break;
        case 'others':
            resultContainer.classList.add('bin-others');
            binIcon.textContent = '⚠️';
            break;
        case 'error':
            resultContainer.classList.add('bin-error');
            binIcon.textContent = '❌';
            resultReason.innerHTML = `${reason}<br><br><small>Please try focusing on the item and ensure good lighting.</small>`;
            break;
        default:
            binIcon.textContent = '❓';
    }
}

function resizeImage(file, maxSize) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Check if resize is needed
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = Math.round((height * maxSize) / width);
                        width = maxSize;
                    } else {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }
                } else {
                    // No resize needed, return original file
                    resolve(file);
                    return;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        // Create a new file object with the resized blob
                        const resizedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(resizedFile);
                    } else {
                        reject(new Error('Canvas to Blob failed'));
                    }
                }, 'image/jpeg', 0.85); // 0.85 quality
            };
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
    });
}
