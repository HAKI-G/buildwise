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
const BUCKET_NAME = 'buildwise-project-files';

// --- Multer S3 Upload Middleware for Documents ---
export const uploadDocument = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Puts documents in a separate 'documents/' folder in S3
      // FIX: Used backticks (`) to create a template literal for the filename.
      cb(null, `documents/${Date.now().toString()}-${file.originalname}`);
    }
  })
});

// --- Controller Functions ---

/**
 * @desc    Upload a document and link it to a project
 * @route   POST /api/documents/:projectId
 * @access  Private (Requires Token)
 */
export const uploadDocumentForProject = async (req, res) => {
  const { projectId } = req.params;
  const documentId = uuidv4();
  
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const params = {
    TableName: 'BuildWiseDocuments',
    Item: {
      projectId: projectId,       // Partition Key
      documentId: documentId,     // Sort Key
      fileURL: req.file.location, // Note: This URL will not be publicly accessible
      documentName: req.file.originalname,
      fileName: req.file.key,
      uploadedAt: new Date().toISOString(),
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    res.status(201).json({
      message: 'Document uploaded successfully!',
      document: params.Item
    });
  } catch (error) {
    // FIX: Corrected the syntax for console.error
    console.error('Error creating document record:', error);
    res.status(500).json({ message: "Failed to create document record", error: error.message });
  }
};

/**
 * @desc    Get all documents for a specific project
 * @route   GET /api/documents/:projectId
 * @access  Private (Requires Token)
 */
export const getDocumentsForProject = async (req, res) => {
    const { projectId } = req.params;

    const params = {
        TableName: 'BuildWiseDocuments',
        KeyConditionExpression: "projectId = :projectId",
        ExpressionAttributeValues: {
            ":projectId": projectId,
        },
    };

    try {
        const data = await docClient.send(new QueryCommand(params));
        // NOTE: You will likely need to generate presigned URLs for each document here
        // before sending them to the client to allow access.
        res.status(200).json(data.Items);
    } catch (error) {
        // FIX: Used backticks (`) and corrected the syntax for console.error
        console.error(`Error fetching documents for project ${projectId}:`, error);
        res.status(500).json({ message: "Failed to fetch documents", error: error.message });
    }
};