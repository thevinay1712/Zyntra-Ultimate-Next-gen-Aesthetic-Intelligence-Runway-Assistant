const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

// Configure multer for memory storage for forwarding directly
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * @route POST /api/tryon/generate
 * @desc Forwards the user photo to AI service to extract 3D scaling matrix
 * @access Public
 */
router.post('/generate', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }

        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        if (req.body.height) formData.append('height', req.body.height);
        if (req.body.weight) formData.append('weight', req.body.weight);
        if (req.body.details) formData.append('details', req.body.details);

        const response = await fetch(`${AI_SERVICE_URL}/tryon`, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI Service Error: ${errorText}`);
        }

        const data = await response.json();
        
        // Include dummy garment texture mapping for the 3D model
        const tryonResult = {
            success: true,
            scaleMatrix: data.scaleMatrix || { x: 1, y: 1, z: 1 },
            segmentedImage: data.segmentedImage || null,
            skinTone: data.skinTone || '#f1c27d',
            garmentTextureUrl: '/uploads/dummy_garment_texture.jpg', // Placeholder
        };

        res.json(tryonResult);

    } catch (error) {
        console.error('TryOn generation error:', error);
        res.status(500).json({ success: false, message: 'Failed to process tryon request', error: error.message });
    }
});

module.exports = router;
