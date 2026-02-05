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

// Handle click on upload area
uploadArea.addEventListener('click', () => {
    imageInput.click();
});

// Handle file selection
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.classList.remove('hidden');
            previewContainer.classList.add('hidden');
            identifyBtn.disabled = false;

            // hide result if new image is selected
            resultContainer.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Handle identification
identifyBtn.addEventListener('click', async () => {
    const file = imageInput.files[0];
    if (!file) return;

    // Loading state
    setLoading(true);

    const formData = new FormData();
    formData.append('image', file);

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
        default:
            binIcon.textContent = '❓';
    }
}
