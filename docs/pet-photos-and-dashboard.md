# Pet photos and Dashboard (T25 / T21)

## Behavior

My Pets → View opens pet details. Choose a JPEG, PNG or WebP photo (up to 5 MB), check the preview, then Save photo. Cards and details display the saved photo, with an emoji fallback if the image cannot load. Creating a pet first is required. Cancelling the preview makes no request.

POST /api/pets/:id/photo accepts one multipart photo field and requires Bearer authentication. The server checks active ownership before parsing the upload, checks the file signature and sends it to Cloudinary for decoding and resizing (maximum 800 × 800). The URL is stored in the existing pets.avatar_url column. No database migration is needed. A failed database update attempts to delete the newly uploaded asset. Previous saved photos are retained in Cloudinary; this release does not automatically delete them.

GET /api/dashboard returns summary.totalPets, totalWeights, totalVisits, plus up to eight activities from weights, vet visits and vaccinations. All queries restrict pets to the current user and is_active = TRUE. Activities use the date of the health record, not the time it was added or edited. Empty records, loading, retry and expired sessions are handled in the UI. Swagger documents both endpoints.

## TV2 deployment handoff

1. Use a Cloudinary product environment and set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the backend host environment. Keep the API secret out of GitHub, frontend environment variables and chat messages.
2. Redeploy the backend and frontend from this branch after review/merge. Existing VITE_API_BASE_URL must point to the HTTPS backend /api base.
3. Check upload with an owned pet, reload My Pets and confirm the image remains. Test an invalid file, a file over 5 MB, another user's pet and a deleted pet.
4. Compare Dashboard counts with Weight Tracking and Veterinary Visits. Add test records only to designated demo pets, then check activity links and order.

No live Cloudinary upload has been verified without those credentials. Tests mock storage and database operations and do not modify demo data.
