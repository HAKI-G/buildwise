import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const validateFileType = async (req, res, next) => {
  try {
    console.log("Uploading user:", req.user);
    console.log("File info:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // ✅ CHECK 1: Allowed File Types
    const fileTypeParams = {
      TableName: "BuildWiseSettings",
      FilterExpression: "category = :category AND #key = :key",
      ExpressionAttributeNames: { '#key': 'key' },
      ExpressionAttributeValues: { ':category': 'system', ':key': 'allowedFileTypes' }
    };
    const fileTypeData = await docClient.send(new ScanCommand(fileTypeParams));
    const allowedTypes = fileTypeData.Items?.[0]?.value || 'pdf,doc,docx,xls,xlsx,jpg,png';
    const allowedExtensions = allowedTypes.split(',').map(ext => ext.trim().toLowerCase());

    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ 
        error: `File type .${fileExtension} not allowed. Allowed types: ${allowedTypes}` 
      });
    }

    // ✅ CHECK 2: Max File Size
    const sizeParams = {
      TableName: "BuildWiseSettings",
      FilterExpression: "category = :category AND #key = :key",
      ExpressionAttributeNames: { '#key': 'key' },
      ExpressionAttributeValues: { ':category': 'system', ':key': 'maxFileSize' }
    };
    const sizeData = await docClient.send(new ScanCommand(sizeParams));
    const maxFileSizeMB = sizeData.Items?.[0]?.value || 10;
    const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

    if (req.file.size > maxFileSizeBytes) {
      return res.status(400).json({ 
        error: `File exceeds maximum allowed size of ${maxFileSizeMB} MB` 
      });
    }

    console.log('✅ File validation passed');
    next();
  } catch (error) {
    console.error("Error in validateFileType:", error);
    res.status(500).json({ error: "Internal server error during file validation." });
  }
};