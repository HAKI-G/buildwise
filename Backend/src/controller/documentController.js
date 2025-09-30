import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import multerS3 from 'multer-s3';

// AWS Client Setup
const s3 = new S3Client({ region: "ap-southeast-1" });
const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const BUCKET_NAME = 'buildwise-project-files';
const TABLE_NAME = 'BuildWiseDocuments';

// Multer S3 Upload Configuration
export const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: BUCKET_NAME,
        metadata: function (req, file, cb) {
            cb(null, { 
                fieldName: file.fieldname,
                uploadedBy: req.user.id
            });
        },
        key: function (req, file, cb) {
            const filename = `documents/${Date.now()}-${file.originalname}`;
            cb(null, filename);
        }
    }),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// Get all documents for a project
export const getProjectDocuments = async (req, res) => {
    try {
        const { projectId } = req.params;

        const params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: "projectId = :projectId",
            ExpressionAttributeValues: {
                ":projectId": projectId
            }
        };

        const result = await docClient.send(new QueryCommand(params));
        
        // Generate presigned URLs for each document
        const documentsWithUrls = await Promise.all(
            result.Items.map(async (doc) => {
                const command = new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: doc.s3Key
                });
                
                const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
                
                return {
                    ...doc,
                    downloadUrl,
                    _id: doc.documentId // Add _id for frontend compatibility
                };
            })
        );

        res.json(documentsWithUrls);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
    }
};

// Upload document
export const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { projectId, documentType, description } = req.body;
        const documentId = uuidv4();

        const document = {
            projectId: projectId,
            documentId: documentId,
            filename: req.file.originalname,
            s3Key: req.file.key,
            s3Location: req.file.location,
            documentType: documentType || 'Other',
            description: description || '',
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            status: 'Pending',
            uploadedBy: {
                id: req.user.id,
                name: req.user.name || 'Unknown'
            },
            uploadedAt: new Date().toISOString(),
            _id: documentId // Add _id for frontend compatibility
        };

        const params = {
            TableName: TABLE_NAME,
            Item: document
        };

        await docClient.send(new PutCommand(params));
        
        res.status(201).json(document);
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ message: 'Failed to upload document', error: error.message });
    }
};

// Download document (returns presigned URL)
export const downloadDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { projectId } = req.query;

        if (!projectId) {
            return res.status(400).json({ message: 'projectId is required' });
        }

        console.log('Fetching document:', { projectId, documentId });

        // Use GetCommand for direct key access
        const params = {
            TableName: TABLE_NAME,
            Key: {
                projectId: projectId,
                documentId: documentId
            }
        };

        const result = await docClient.send(new GetCommand(params));

        if (!result.Item) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const document = result.Item;

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: document.s3Key,
            ResponseContentDisposition: `attachment; filename="${document.filename}"`
        });

        const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

        res.json({ downloadUrl });
    } catch (error) {
        console.error('Error generating download URL:', error);
        res.status(500).json({ message: 'Failed to generate download URL', error: error.message });
    }
};

// View document (returns presigned URL) - No token needed, just redirects
export const viewDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { projectId } = req.query;

        if (!projectId) {
            return res.status(400).json({ message: 'projectId is required' });
        }

        console.log('Viewing document:', { projectId, documentId });

        // Use GetCommand for direct key access
        const params = {
            TableName: TABLE_NAME,
            Key: {
                projectId: projectId,
                documentId: documentId
            }
        };

        const result = await docClient.send(new GetCommand(params));

        if (!result.Item) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const document = result.Item;

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: document.s3Key
        });

        const viewUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

        // Redirect directly to the presigned URL
        res.redirect(viewUrl);
    } catch (error) {
        console.error('Error viewing document:', error);
        res.status(500).json({ message: 'Failed to view document', error: error.message });
    }
};

// Update document status
export const updateDocumentStatus = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { status, projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({ message: 'projectId is required' });
        }

        const params = {
            TableName: TABLE_NAME,
            Key: {
                projectId: projectId,
                documentId: documentId
            },
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': status
            },
            ReturnValues: 'ALL_NEW'
        };

        const result = await docClient.send(new UpdateCommand(params));
        res.json(result.Attributes);
    } catch (error) {
        console.error('Error updating document status:', error);
        res.status(500).json({ message: 'Failed to update status', error: error.message });
    }
};

// Delete document
export const deleteDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { projectId } = req.query;

        if (!projectId) {
            return res.status(400).json({ message: 'projectId is required' });
        }

        console.log('Deleting document:', { projectId, documentId });

        // Use GetCommand for direct key access
        const params = {
            TableName: TABLE_NAME,
            Key: {
                projectId: projectId,
                documentId: documentId
            }
        };

        const result = await docClient.send(new GetCommand(params));

        if (!result.Item) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const document = result.Item;

        // Delete from S3
        await s3.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: document.s3Key
        }));

        // Delete from DynamoDB
        await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
                projectId: projectId,
                documentId: documentId
            }
        }));

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ message: 'Failed to delete document', error: error.message });
    }
};