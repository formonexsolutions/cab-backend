const fs = require('fs');
const path = require('path');

const saveBase64File = (base64String, folderName, filePrefix) => {
  try {
    if (!base64String) return null;

    // Match base64 header
    const matches = base64String.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error('Invalid base64 format');

    const ext = matches[1].split('/')[1]; // e.g., 'jpeg', 'png', 'pdf'
    const buffer = Buffer.from(matches[2], 'base64');

    const uploadDir = path.join(__dirname, '../../uploads', folderName);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `${filePrefix}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${folderName}/${fileName}`; // return relative path for frontend
  } catch (err) {
    console.error('Error saving base64 file:', err);
    return null;
  }
};
module.exports = saveBase64File;