# Content requests

Apply migrations through `20260912120000_content_requests.sql` before deploying the new clients. It creates the private `content_requests` table and `request-images` Storage bucket. The public API uses the existing webapp `SUPABASE_SERVICE_ROLE_KEY`; keep that key on the server only.

Web /app/requests and mobile /requests offer two choices: Offer and Notification. Name, phone number or email, and an image are required. Details are optional. Images are limited to 3 MB and JPEG, PNG or WebP. The public multipart POST /api/content-requests endpoint validates the payload, limits requests to five per IP per hour, uploads the image privately and saves the request. A failed database insert removes its uploaded image. The response includes a reference ID and the UI confirms that the team will follow up. Nothing is published or sent to a contact automatically.

Admins use /requests to search by name, filter by type/status, page through submissions, view signed image links, open a phone/email contact link, and record follow-up notes. Statuses are New, Contacted, Published and Closed. Add reviewed content through the existing Offerly or Notify editor, then update its request status. Public clients cannot read requests, follow-up notes or stored images.

Both public navigation menus use: Offerly, Notify, Home, Submit Request. The new mobile dependency is image_picker; run flutter pub get. The iOS photo-library purpose string and Windows generated plugin registration are included.

Validation: backend npm test covers private data/image policies and admin updates; webapp npm test covers all request types, field validation, upload limits, throttling and upload cleanup. Web/admin production builds and Flutter analyze/test cover client compilation. Browser form checks use intercepted responses so they do not create production requests. After deployment, verify a consented test submission and follow-up in the target environment.
