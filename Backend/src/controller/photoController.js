import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import multerS3 from 'multer-s3';

// --- AWS Client Setup ---
const s3 = new S3Client({ region: "ap-southeast-1" });
const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

const BUCKET_NAME = 'buildwise-project-files'; 

// --- Multer S3 Upload Middleware ---
export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `photos/${Date.now().toString()}-${file.originalname}`);
    }
  })
});

export const uploadPhotoForUpdate = async (req, res) => {
  const { updateId } = req.params;
  const { caption } = req.body;
  const photoId = uuidv4();
  
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const publicUrl = `https://${BUCKET_NAME}.s3.ap-southeast-1.amazonaws.com/${req.file.key}`;

  const params = {
    TableName: 'BuildWisePhotos',
    Item: {
      updateId: updateId,
      photoId: photoId,
      fileURL: publicUrl,
      s3Key: req.file.key,
      caption: caption || 'No caption',
      fileName: req.file.key,
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
    console.error('Error creating photo record:', error);
    res.status(500).json({ message: "Failed to create photo record", error: error.message });
  }
};

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
        res.status(200).json(data.Items);
    } catch (error) {
        console.error(`Error fetching photos for update ${updateId}:`, error);
        res.status(500).json({ message: "Failed to fetch photos", error: error.message });
    }
};

export const getAllPhotos = async (req, res) => {
    try {
        const scanCommand = new ScanCommand({
            TableName: 'BuildWisePhotos',
        });
        
        const result = await docClient.send(scanCommand);
        
        const sortedPhotos = (result.Items || []).sort((a, b) => 
            new Date(b.uploadedAt) - new Date(a.uploadedAt)
        );
        
        res.status(200).json(sortedPhotos);
    } catch (error) {
        console.error('Error fetching all photos:', error);
        res.status(500).json({ message: "Failed to fetch photos", error: error.message });
    }
};

export const deletePhoto = async (req, res) => {
    const { photoId } = req.params;
    const { updateId, s3Key } = req.body;

    if (!photoId || !updateId) {
        return res.status(400).json({ message: 'photoId and updateId are required' });
    }

    try {
        // Delete from S3
        if (s3Key) {
            const deleteS3Command = new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3Key
            });
            await s3.send(deleteS3Command);
        }

        // Delete from DynamoDB
        const deleteDbCommand = new DeleteCommand({
            TableName: 'BuildWisePhotos',
            Key: {
                updateId: updateId,
                photoId: photoId
            }
        });

        await docClient.send(deleteDbCommand);

        res.status(200).json({ message: 'Photo deleted successfully' });
    } catch (error) {
        console.error('Error deleting photo:', error);
        res.status(500).json({ message: 'Failed to delete photo', error: error.message });
    }
};