import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// ✅ Use AWS CLI credentials automatically
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "buildwise-project-files";

console.log('🔧 S3 Configuration:');
console.log('  AWS_REGION:', process.env.AWS_REGION || 'ap-southeast-1 (default)');
console.log('  S3_BUCKET_NAME:', BUCKET_NAME);
console.log('  Credentials: Using AWS CLI credentials ✅');

/**
 * Upload file to S3 bucket
 * @param {Object} file - Multer file object
 * @param {string} folder - Optional folder path in S3 bucket
 * @returns {Promise<string>} - Returns the S3 file URL
 */
export const uploadToS3 = async (file, folder = "projects") => {
  try {
    const fileExtension = file.originalname.split(".").pop();
    const uniqueFileName = `${folder}/${uuidv4()}.${fileExtension}`;

    console.log('📤 Uploading to S3:', uniqueFileName);

    // Upload parameters - NO ACL! (bucket policy handles public access)
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: uniqueFileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      // ✅ ACL removed - public access is handled by bucket policy
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const region = process.env.AWS_REGION || "ap-southeast-1";
    const fileUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${uniqueFileName}`;

    console.log("✅ File uploaded successfully:", fileUrl);
    return fileUrl;

  } catch (error) {
    console.error("❌ Error uploading to S3:", error);
    
    if (error.message.includes('ACL')) {
      console.error('💡 TIP: Bucket has ACLs disabled - using bucket policy for public access');
    } else if (error.message.includes('Access Denied')) {
      console.error('💡 TIP: Check bucket policy allows public GetObject');
    }
    
    throw new Error("Failed to upload image to S3: " + error.message);
  }
};

/**
 * Delete file from S3 bucket
 * @param {string} fileUrl - The full S3 URL of the file
 */
export const deleteFromS3 = async (fileUrl) => {
  try {
    const key = fileUrl.split(".amazonaws.com/")[1];
    
    if (!key) {
      console.warn('⚠️  Invalid S3 URL, cannot extract key');
      return;
    }

    console.log('🗑️  Deleting from S3:', key);
    
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
    
    console.log("✅ File deleted successfully from S3");
  } catch (error) {
    console.error("❌ Error deleting from S3:", error);
    console.warn('⚠️  Continuing despite S3 deletion error');
  }
};