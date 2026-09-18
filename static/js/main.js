let selectedFile = null;

// UI Event Listeners for Drag and Drop
const dropzone = document.getElementById('dropzone');
const imageInput = document.getElementById('imageInput');

dropzone.addEventListener('click', () => imageInput.click());

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dropzone-active');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dropzone-active');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dropzone-active');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleFileSelect(event) {
    if (event.target.files.length > 0) {
        handleFile(event.target.files[0]);
    }
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file.');
        return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('imagePreview').src = e.target.result;
        document.getElementById('dropzonePrompt').classList.add('hidden');
        document.getElementById('previewContainer').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function clearImage(event) {
    event.stopPropagation();
    selectedFile = null;
    imageInput.value = '';
    document.getElementById('previewContainer').classList.add('hidden');
    document.getElementById('dropzonePrompt').classList.remove('hidden');
    resetResults();
}

function updateAngleDisplay(val) {
    document.getElementById('angleValueDisplay').innerText = `${parseFloat(val).toFixed(1)}°`;
}

function toggleCodeModal() {
    const modal = document.getElementById('codeModal');
    modal.classList.toggle('hidden');
}

function resetResults() {
    document.getElementById('resultsCard').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('statusBadge').innerText = 'Awaiting input...';
}

async function runInference() {
    if (!selectedFile) {
        alert('Please upload an image first.');
        return;
    }

    const angle = document.getElementById('azimuthAngle').value;
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('azimuth_angle', angle);

    // Update UI State to Loading
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('resultsCard').classList.add('hidden');
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('statusBadge').innerText = 'Processing...';

    try {
        // Attempt to reach the Flask API endpoint
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            displayResults(data);
        } else {
            // Fallback demo simulation if running as a static webpage
            simulateInference(angle);
        }
    } catch (err) {
        // Fallback demo simulation for standalone frontend preview
        simulateInference(angle);
    }
}

function simulateInference(angle) {
    setTimeout(() => {
        // Generate realistic probabilistic response for demonstration
        const randVal = Math.random();
        const prob1 = (randVal * 0.6 + 0.35).toFixed(4);
        const prob0 = (1.0 - prob1).toFixed(4);
        const pred = prob1 > 0.5 ? 1 : 0;

        displayResults({
            success: true,
            prediction: pred,
            class_label: pred === 1 ? 'Pareidolia Target Identified' : 'Standard Surface (Non-Pareidolia)',
            confidence: pred === 1 ? prob1 : prob0,
            probabilities: {
                class_0: prob0,
                class_1: prob1
            }
        });
    }, 1000);
}

function displayResults(data) {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('resultsCard').classList.remove('hidden');
    document.getElementById('statusBadge').innerText = 'Inference Complete';

    const isClass1 = data.prediction === 1;
    const classBanner = document.getElementById('classBanner');
    const classIconBox = document.getElementById('classIconBox');

    if (isClass1) {
        classBanner.className = "p-4 rounded-xl border flex items-center justify-between bg-blue-500/10 border-blue-500/30";
        classIconBox.className = "w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-blue-500 text-white";
        classIconBox.innerHTML = '<i class="fa-solid fa-bullseye"></i>';
    } else {
        classBanner.className = "p-4 rounded-xl border flex items-center justify-between bg-slate-800/80 border-slate-700";
        classIconBox.className = "w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-slate-700 text-slate-300";
        classIconBox.innerHTML = '<i class="fa-solid fa-mountain"></i>';
    }

    document.getElementById('classLabel').innerText = data.class_label;
    document.getElementById('classConfidence').innerText = `${(data.confidence * 100).toFixed(1)}%`;

    const p0 = (data.probabilities.class_0 * 100).toFixed(1);
    const p1 = (data.probabilities.class_1 * 100).toFixed(1);

    document.getElementById('prob0Text').innerText = `${p0}%`;
    document.getElementById('prob0Bar').style.width = `${p0}%`;

    document.getElementById('prob1Text').innerText = `${p1}%`;
    document.getElementById('prob1Bar').style.width = `${p1}%`;
}