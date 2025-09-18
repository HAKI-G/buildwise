import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import multerS3 from 'multer-s3';

// --- AWS Client Setup ---
const s3 = new S3Client({ region: "ap-southeast-1" });
const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

// --- IMPORTANT: REPLACE WITH YOUR BUCKET NAME ---
const BUCKET_NAME = 'buildwise-project-files'; 

// --- Multer S3 Upload Middleware ---
export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET_NAME,
    // acl: 'public-read', // This is correctly removed for modern S3 security practices.
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // FIX: Used backticks (`) to create a template literal for the filename.
      cb(null, `photos/${Date.now().toString()}-${file.originalname}`);
    }
  })
});

// --- Controller Functions ---

/**
 * @desc      Upload a photo and link it to a progress update
 * @route     POST /api/photos/:updateId
 * @access    Private (Requires Token)
 */
export const uploadPhotoForUpdate = async (req, res) => {
  const { updateId } = req.params;
  const { caption } = req.body;
  const photoId = uuidv4();
  
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const params = {
    TableName: 'BuildWisePhotos',
    Item: {
      updateId: updateId,
      photoId: photoId,
      fileURL: req.file.location, // Note: This URL might not be publicly accessible. See note below.
      caption: caption || 'No caption',
      fileName: req.file.key, // The 'key' is the path in your S3 bucket
      uploadedAt: new Date().toISOString(),
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    res.status(201).json({
      message: 'Photo uploaded and record created successfully!',
      photo: params.Item
    });
  } catch (error) {
    // FIX: Corrected the syntax for console.error
    console.error('Error creating photo record:', error);
    res.status(500).json({ message: "Failed to create photo record", error: error.message });
  }
};


/**
 * @desc      Get all photos for a specific progress update
 * @route     GET /api/photos/:updateId
 * @access    Private (Requires Token)
 */
export const getPhotosForUpdate = async (req, res) => {
    const { updateId } = req.params;

    const params = {
        TableName: 'BuildWisePhotos',
        KeyConditionExpression: "updateId = :updateId",
        ExpressionAttributeValues: {
            ":updateId": updateId,
        },
    };

    try {
        const data = await docClient.send(new QueryCommand(params));

        // You will likely need to generate presigned URLs here. See note below.
        res.status(200).json(data.Items);
    } catch (error) {
        // FIX: Used backticks (`) and corrected the syntax for console.error
        console.error(`Error fetching photos for update ${updateId}:`, error);
        res.status(500).json({ message: "Failed to fetch photos", error: error.message });
    }
};