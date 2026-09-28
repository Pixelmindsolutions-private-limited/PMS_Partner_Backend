import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// recreate __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================================
// SHARED STORAGE FACTORY
// ======================================================
const makeStorage = (subfolder, prefix) => {
  const uploadDir = path.join(__dirname, '..', 'uploads', subfolder);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${prefix}-${unique}${path.extname(file.originalname)}`);
    },
  });
};

// ======================================================
// FILE FILTERS
// ======================================================
// aadhar accepts images + pdf
const aadharFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase());
  ok ? cb(null, true) : cb(new Error('Only jpg, png, pdf allowed'));
};

// banners accept images only (no pdf)
const bannerFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase());
  ok ? cb(null, true) : cb(new Error('Only jpg, png, webp allowed'));
};

// ======================================================
// AADHAR UPLOAD (default export — unchanged usage)
// ======================================================
const aadharUpload = multer({
  storage: makeStorage('aadhar', 'aadhar'),
  fileFilter: aadharFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ======================================================
// BANNER UPLOAD (named export)
// ======================================================
export const bannerUpload = multer({
  storage: makeStorage('banners', 'banner'),
  fileFilter: bannerFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export default aadharUpload;