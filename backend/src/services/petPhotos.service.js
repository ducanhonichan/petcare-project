const { randomUUID } = require('node:crypto');
const cloudinary = require('cloudinary').v2;
function isPhotoStorageConfigured() {
  return ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
    .every((key) => Boolean(process.env[key]?.trim()));
}
function photoFormat(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}
function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}
async function uploadPetPhoto(buffer, petId) {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: 'image',
      public_id: 'petcare/pet-' + petId + '/' + randomUUID(),
      allowed_formats: ['jpg', 'png', 'webp'],
      // Cloudinary decodes and re-encodes the image before publishing it.
      transformation: [{ width: 800, height: 800, crop: 'limit' }, { fetch_format: 'jpg', quality: 'auto' }],
      timeout: 30000,
    }, (error, result) => {
      if (error) return reject(error);
      if (!result?.secure_url?.startsWith('https://') || result.secure_url.length > 500) {
        return reject(new Error('Invalid photo storage response'));
      }
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}
async function discardPetPhoto(publicId) {
  configure();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}
module.exports = { isPhotoStorageConfigured, photoFormat, uploadPetPhoto, discardPetPhoto };
