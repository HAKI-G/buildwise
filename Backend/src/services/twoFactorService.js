import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';

// Generate 2FA secret
export const generate2FASecret = (email, name) => {
  const secret = speakeasy.generateSecret({
    name: `BuildWise (${email})`,
    issuer: 'BuildWise',
    length: 32
  });
  
  return {
    secret: secret.base32,
    otpauth_url: secret.otpauth_url
  };
};

// Generate QR code from otpauth URL
export const generateQRCode = async (otpauthUrl) => {
  try {
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

// Verify 2FA token
export const verify2FAToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 time steps (60 seconds) variance
  });
};

// Generate backup codes
export const generateBackupCodes = (count = 8) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
};

export default {
  generate2FASecret,
  generateQRCode,
  verify2FAToken,
  generateBackupCodes
};