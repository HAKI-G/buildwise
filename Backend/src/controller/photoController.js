import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import multerS3 from 'multer-s3';
import axios from 'axios';

// --- AWS Client Setup ---
const s3 = new S3Client({ region: "ap-southeast-1" });
const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

const BUCKET_NAME = 'buildwise-project-files';
const AI_API_URL = 'http://52.77.238.176:5000';  

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
  const { caption, projectId, milestone } = req.body; // ✅ ADD milestone
  const photoId = uuidv4();
  
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  // ✅ VALIDATE projectId
  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required.' });
  }

  const publicUrl = `https://${BUCKET_NAME}.s3.ap-southeast-1.amazonaws.com/${req.file.key}`;
  
  console.log('📸 Photo uploaded to S3:', req.file.originalname);
  console.log('🔗 Photo URL:', publicUrl);
  console.log('📁 Project ID:', projectId);
  console.log('🏗️  User-selected milestone:', milestone); // ✅ LOG milestone

  // AI Analysis
  let aiAnalysis = null;
  let aiProcessed = false;
  
  try {
    console.log('🤖 Starting AI analysis...');
    console.log('📥 Downloading image from S3...');
    
    // Download image from S3
    const imageResponse = await axios.get(publicUrl, { 
      responseType: 'arraybuffer',
      timeout: 15000 
    });
    
    console.log(`✅ Image downloaded (${imageResponse.data.byteLength} bytes)`);
    console.log('📤 Sending to AI API:', AI_API_URL);
    
    // Prepare form data
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('image', Buffer.from(imageResponse.data), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    // Send to AI API
    const aiResponse = await axios.post(
      `${AI_API_URL}/analyze`, 
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 30000
      }
    );
    
    aiAnalysis = aiResponse.data;
    aiProcessed = aiAnalysis && aiAnalysis.success;
    
    console.log('✅ AI Analysis complete!');
    console.log('   AI detected milestone:', aiAnalysis.ai_suggestion?.milestone);
    console.log('   User selected milestone:', milestone); // ✅ Compare
    console.log('   Confidence:', aiAnalysis.ai_suggestion?.confidence);
    console.log('   Objects detected:', aiAnalysis.total_objects);
    console.log('   Detections:', Object.keys(aiAnalysis.detections || {}).join(', '));
    
  } catch (aiError) {
    console.error('❌ AI Analysis failed!');
    console.error('   Error:', aiError.message);
    if (aiError.response) {
      console.error('   Status:', aiError.response.status);
      console.error('   Response:', aiError.response.data);
    }
    if (aiError.code) {
      console.error('   Code:', aiError.code);
    }
    
    aiAnalysis = { 
      error: true,
      message: aiError.message,
      timestamp: new Date().toISOString()
    };
    aiProcessed = false;
  }

  // ✅ Save to database with user-selected milestone
  const params = {
    TableName: 'BuildWisePhotos',
    Item: {
      updateId: updateId,
      photoId: photoId,
      projectId: projectId,
      fileURL: publicUrl,
      s3Key: req.file.key,
      caption: caption || 'No caption',
      fileName: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      
      // ✅ NEW: User-selected milestone
      userSelectedMilestone: milestone || null,
      
      // AI analysis results
      aiAnalysis: aiAnalysis,
      aiProcessed: aiProcessed,
      aiSuggestion: aiAnalysis?.ai_suggestion || null,
      aiDetections: aiAnalysis?.detections || null,
      totalObjects: aiAnalysis?.total_objects || 0,
      
      // Confirmation status
      confirmationStatus: 'pending',
      userConfirmedMilestone: null,
      userInputPercentage: null,
      calculatedProgress: null
    }
  };

  try {
    await docClient.send(new PutCommand(params));
    console.log('💾 Photo saved to database successfully');
    
    res.status(201).json({
      message: 'Photo uploaded and analyzed successfully!',
      photo: params.Item,
      aiAnalysis: aiAnalysis
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({ message: "Failed to save photo", error: error.message });
  }
};

// Confirm AI suggestion
export const confirmAISuggestion = async (req, res) => {
  const { photoId } = req.params;
  const { updateId, milestone, userPercentage, confirmed } = req.body;

  console.log('📝 Confirming AI suggestion:', { photoId, milestone, userPercentage, confirmed });

  if (!photoId || !updateId || !milestone || userPercentage === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Call AI API to calculate overall progress
    console.log('🧮 Calculating progress with AI...');
    const confirmResponse = await axios.post(`${AI_API_URL}/confirm`, {
      milestone,
      user_percentage: parseFloat(userPercentage),
      confirmed
    });

    const calculation = confirmResponse.data;
    console.log('✅ Calculation complete:', calculation.calculation);

    // Update photo record with confirmation
    const params = {
      TableName: 'BuildWisePhotos',
      Key: {
        updateId: updateId,
        photoId: photoId
      },
      UpdateExpression: `SET 
        confirmationStatus = :status,
        userConfirmedMilestone = :milestone,
        userInputPercentage = :percentage,
        calculatedProgress = :progress,
        overallProgressPercent = :overallProgress,
        calculation = :calculation,
        confirmedAt = :confirmedAt
      `,
      ExpressionAttributeValues: {
        ':status': confirmed ? 'confirmed' : 'rejected',
        ':milestone': milestone,
        ':percentage': parseFloat(userPercentage),
        ':progress': calculation.overall_progress_percent,
        ':overallProgress': calculation.overall_progress_percent,
        ':calculation': calculation.calculation,
        ':confirmedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await docClient.send(new UpdateCommand(params));
    console.log('💾 Confirmation saved to database');

    res.status(200).json({
      message: 'Confirmation saved successfully',
      photo: result.Attributes,
      calculation
    });

  } catch (error) {
    console.error('❌ Error saving confirmation:', error);
    res.status(500).json({ message: 'Failed to save confirmation', error: error.message });
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

// ✅ Get photos for a specific project
export const getPhotosForProject = async (req, res) => {
    const { projectId } = req.params;

    console.log('📷 Fetching photos for project:', projectId);

    try {
        const scanCommand = new ScanCommand({
            TableName: 'BuildWisePhotos',
            FilterExpression: "projectId = :projectId",
            ExpressionAttributeValues: {
                ":projectId": projectId,
            },
        });
        
        const result = await docClient.send(scanCommand);
        
        // Sort by upload date (newest first)
        const sortedPhotos = (result.Items || []).sort((a, b) => 
            new Date(b.uploadedAt) - new Date(a.uploadedAt)
        );
        
        console.log(`✅ Found ${sortedPhotos.length} photos for project ${projectId}`);
        
        res.status(200).json(sortedPhotos);
    } catch (error) {
        console.error(`Error fetching photos for project ${projectId}:`, error);
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

export const getPendingPhotos = async (req, res) => {
    try {
        const scanCommand = new ScanCommand({
            TableName: 'BuildWisePhotos',
            FilterExpression: 'confirmationStatus = :status AND aiProcessed = :processed',
            ExpressionAttributeValues: {
                ':status': 'pending',
                ':processed': true
            }
        });
        
        const result = await docClient.send(scanCommand);
        
        const sortedPhotos = (result.Items || []).sort((a, b) => 
            new Date(b.uploadedAt) - new Date(a.uploadedAt)
        );
        
        res.status(200).json(sortedPhotos);
    } catch (error) {
        console.error('Error fetching pending photos:', error);
        res.status(500).json({ message: "Failed to fetch pending photos", error: error.message });
    }
};

// ✅ Get pending photos for a specific project
export const getPendingPhotosForProject = async (req, res) => {
    const { projectId } = req.params;

    console.log('📷 Fetching pending photos for project:', projectId);

    try {
        const scanCommand = new ScanCommand({
            TableName: 'BuildWisePhotos',
            FilterExpression: 'projectId = :projectId AND confirmationStatus = :status AND aiProcessed = :processed',
            ExpressionAttributeValues: {
                ':projectId': projectId,
                ':status': 'pending',
                ':processed': true
            }
        });
        
        const result = await docClient.send(scanCommand);
        
        const sortedPhotos = (result.Items || []).sort((a, b) => 
            new Date(b.uploadedAt) - new Date(a.uploadedAt)
        );
        
        console.log(`✅ Found ${sortedPhotos.length} pending photos for project ${projectId}`);
        
        res.status(200).json(sortedPhotos);
    } catch (error) {
        console.error(`Error fetching pending photos for project ${projectId}:`, error);
        res.status(500).json({ message: "Failed to fetch pending photos", error: error.message });
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