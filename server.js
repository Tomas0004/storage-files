// server.js - Servidor sin multer
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// ============================================
// MIDDLEWARES
// ============================================
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use('/', express.static(path.join(__dirname, 'frontend')));

// ============================================
// CREAR DIRECTORIO DE UPLOADS
// ============================================
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ============================================
// ENDPOINTS
// ============================================


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'html', 'index.html'));
})

// 📤 Subir archivo (Base64)
app.post('/upload', (req, res) => {
    try {
        const { filename, file, mimetype } = req.body;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No se recibió ningún archivo'
            });
        }

        // Decodificar base64
        const buffer = Buffer.from(file, 'base64');
        
        // Generar nombre único
        const ext = path.extname(filename);
        const name = path.basename(filename, ext);
        const uniqueName = `${name}_${Date.now()}${ext}`;
        const filePath = path.join(uploadDir, uniqueName);

        // Guardar archivo
        fs.writeFileSync(filePath, buffer);

        res.json({
            success: true,
            message: 'Archivo subido correctamente',
            file: {
                originalName: filename,
                savedName: uniqueName,
                size: buffer.length,
                mimetype: mimetype || 'application/octet-stream',
                path: filePath
            }
        });

    } catch (error) {
        console.error('❌ Error al subir archivo:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 📤 Subir múltiples archivos
app.post('/upload/multiple', (req, res) => {
    try {
        const { files } = req.body;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se recibieron archivos'
            });
        }

        const uploaded = [];

        for (const fileData of files) {
            const { filename, file, mimetype } = fileData;
            
            if (!file) continue;

            const buffer = Buffer.from(file, 'base64');
            const ext = path.extname(filename);
            const name = path.basename(filename, ext);
            const uniqueName = `${name}_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
            const filePath = path.join(uploadDir, uniqueName);

            fs.writeFileSync(filePath, buffer);

            uploaded.push({
                originalName: filename,
                savedName: uniqueName,
                size: buffer.length,
                mimetype: mimetype || 'application/octet-stream'
            });
        }

        res.json({
            success: true,
            message: `${uploaded.length} archivos subidos correctamente`,
            files: uploaded
        });

    } catch (error) {
        console.error('❌ Error al subir archivos:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 📋 Listar archivos
app.get('/files', (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir);
        const fileList = files.map(filename => {
            const filePath = path.join(uploadDir, filename);
            const stats = fs.statSync(filePath);
            return {
                filename: filename,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime
            };
        });

        res.json({
            success: true,
            files: fileList
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 📥 Descargar archivo
app.get('/files/:filename', (req, res) => {
    try {
        const filePath = path.join(uploadDir, req.params.filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Archivo no encontrado'
            });
        }

        res.download(filePath);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 🗑️ Eliminar archivo
app.delete('/files/:filename', (req, res) => {
    try {
        const filePath = path.join(uploadDir, req.params.filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Archivo no encontrado'
            });
        }

        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: 'Archivo eliminado correctamente'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📁 Archivos guardados en: ${uploadDir}`);
});