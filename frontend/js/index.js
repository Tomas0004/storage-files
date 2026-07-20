// ============================================
// DOM ELEMENTS
// ============================================
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadBtn = document.getElementById('uploadBtn');
const clearBtn = document.getElementById('clearBtn');
const listBtn = document.getElementById('listBtn');
const fileInfo = document.getElementById('fileInfo');
const fileList = document.getElementById('fileList');
const progressBar = document.getElementById('progressBar');
const progress = document.getElementById('progress');
const responseDiv = document.getElementById('response');
const filesList = document.getElementById('filesList');
const filesContainer = document.getElementById('filesContainer');

let selectedFiles = [];

// ============================================
// EVENTOS
// ============================================

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedFiles = Array.from(e.target.files);
        updateFileList();
        uploadBtn.disabled = false;
    } else {
        clearSelection();
    }
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        selectedFiles = Array.from(e.dataTransfer.files);
        fileInput.files = e.dataTransfer.files;
        updateFileList();
        uploadBtn.disabled = false;
    }
});

uploadBtn.addEventListener('click', uploadFiles);
clearBtn.addEventListener('click', clearSelection);
listBtn.addEventListener('click', listFiles);

// ============================================
// FUNCIONES
// ============================================

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
}

function updateFileList() {
    if (selectedFiles.length === 0) {
        fileInfo.classList.remove('show');
        return;
    }

    let html = '';
    let totalSize = 0;
    selectedFiles.forEach(file => {
        totalSize += file.size;
        html += `
                    <div class="file-item">
                        <div>
                            <div class="name">📄 ${file.name}</div>
                            <div class="size">${formatSize(file.size)}</div>
                        </div>
                    </div>
                `;
    });

    fileList.innerHTML = html;
    fileInfo.classList.add('show');
    uploadBtn.textContent = `📤 Subir ${selectedFiles.length} archivo${selectedFiles.length > 1 ? 's' : ''}`;
}

function clearSelection() {
    selectedFiles = [];
    fileInput.value = '';
    fileInfo.classList.remove('show');
    progressBar.classList.remove('show');
    uploadBtn.disabled = true;
    hideResponse();
}

function showResponse(message, type = 'success') {
    responseDiv.textContent = message;
    responseDiv.className = 'response show ' + type;
}

function hideResponse() {
    responseDiv.className = 'response';
}

function showProgress(percent) {
    progressBar.classList.add('show');
    progress.style.width = percent + '%';
}

function hideProgress() {
    progressBar.classList.remove('show');
    progress.style.width = '0%';
}

// ============================================
// SUBIR ARCHIVOS CON FETCH
// ============================================

async function uploadFiles() {
    if (selectedFiles.length === 0) {
        showResponse('❌ No hay archivos seleccionados', 'error');
        return;
    }

    uploadBtn.disabled = true;
    showProgress(0);

    try {
        // Convertir archivos a base64
        const filesData = [];
        let processed = 0;

        for (const file of selectedFiles) {
            const base64 = await fileToBase64(file);
            filesData.push({
                filename: file.name,
                file: base64,
                mimetype: file.type
            });
            processed++;
            showProgress(Math.round((processed / selectedFiles.length) * 100));
        }

        // Enviar al servidor
        const response = await fetch('/upload/multiple', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ files: filesData })
        });

        const data = await response.json();

        if (data.success) {
            showResponse(`✅ ${data.message}`, 'success');
            clearSelection();
            listFiles();
        } else {
            showResponse(`❌ ${data.message}`, 'error');
        }

    } catch (error) {
        showResponse(`❌ Error: ${error.message}`, 'error');
    } finally {
        hideProgress();
        uploadBtn.disabled = false;
        uploadBtn.textContent = '📤 Subir';
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================
// LISTAR ARCHIVOS
// ============================================

async function listFiles() {
    try {
        const response = await fetch('/files');
        const data = await response.json();

        if (!data.success) {
            showResponse('❌ Error al listar archivos', 'error');
            return;
        }

        filesList.style.display = 'block';

        if (data.files.length === 0) {
            filesContainer.innerHTML = '<p style="color: #666;">📭 No hay archivos en el servidor</p>';
            return;
        }

        filesContainer.innerHTML = data.files.map(file => `
                    <div class="file-item-server">
                        <div>
                            <div class="file-name">📄 ${file.filename}</div>
                            <div style="color: #666; font-size: 0.8em;">${formatSize(file.size)}</div>
                        </div>
                        <div class="file-actions">
                            <button class="btn-sm btn-primary" onclick="downloadFile('${file.filename}')">📥</button>
                            <button class="btn-sm btn-danger" onclick="deleteFile('${file.filename}')">🗑️</button>
                        </div>
                    </div>
                `).join('');

        showResponse(`📋 ${data.files.length} archivos encontrados`, 'success');

    } catch (error) {
        showResponse(`❌ ${error.message}`, 'error');
    }
}

// ============================================
// DESCARGAR Y ELIMINAR
// ============================================

window.downloadFile = function (filename) {
    window.open(`/files/${filename}`, '_blank');
};

window.deleteFile = async function (filename) {
    if (!confirm(`¿Seguro que quieres eliminar "${filename}"?`)) return;

    try {
        const response = await fetch(`/files/${filename}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            showResponse(`✅ ${data.message}`, 'success');
            listFiles();
        } else {
            showResponse(`❌ ${data.message}`, 'error');
        }
    } catch (error) {
        showResponse(`❌ ${error.message}`, 'error');
    }
};

// Inicializar
console.log('🚀 Aplicación de subida de archivos inicializada');