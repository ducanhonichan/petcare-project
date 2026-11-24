const router = require('express').Router();
const multer = require('multer');
const requireAuth = require('../middleware/requireAuth');
const { getPetById, updatePetAvatar } = require('../services/pets.service');
const { isPhotoStorageConfigured, photoFormat, uploadPetPhoto, discardPetPhoto } = require('../services/petPhotos.service');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
}).single('photo');
router.post('/:id/photo', requireAuth, async (req, res) => {
  const petId = Number(req.params.id);
  if (!Number.isSafeInteger(petId) || petId <= 0) return res.status(400).json({ message: 'Invalid pet ID' });
  try {
    // Verify ownership before parsing or storing uploaded bytes.
    const pet = await getPetById(petId, req.user.id);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    if (!isPhotoStorageConfigured()) return res.status(503).json({ message: 'Photo uploads are not configured yet. Please try again later.' });
    upload(req, res, async (error) => {
      if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
        message: error.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5 MB or smaller.' : 'Upload one photo using the photo field.',
      });
      if (!req.file || !photoFormat(req.file.buffer)) return res.status(400).json({ message: 'Choose a JPEG, PNG or WebP photo.' });
      let photo;
      try {
        photo = await uploadPetPhoto(req.file.buffer, petId);
        const updated = await updatePetAvatar(petId, req.user.id, photo.url);
        if (!updated) {
          await discardPetPhoto(photo.publicId);
          return res.status(404).json({ message: 'Pet not found' });
        }
        return res.json({ message: 'Pet photo updated', avatar_url: photo.url });
      } catch (failure) {
        if (photo) await discardPetPhoto(photo.publicId).catch(() => console.error('Photo cleanup failed'));
        console.error('Pet photo upload failed');
        return res.status(502).json({ message: 'Could not save the photo. Please try again.' });
      }
    });
  } catch (error) {
    console.error('Pet photo lookup failed');
    return res.status(500).json({ message: 'Unable to update pet photo' });
  }
});
module.exports = router;
