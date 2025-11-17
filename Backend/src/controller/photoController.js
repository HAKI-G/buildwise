import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, DeleteCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb"; // ✅ ADD GetCommand
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import multerS3 from 'multer-s3';
import axios from 'axios';
import { autoUpdateProjectStatus } from './projectController.js';

// --- AWS Client Setup ---
const s3 = new S3Client({ region: "ap-southeast-1" });
const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

const BUCKET_NAME = 'buildwise-project-files';
<<<<<<< HEAD
const AI_API_URL = 'http://18.141.56.204:5000'; // ✅ EC2 endpoint - NO trailing slash
=======
const AI_API_URL = 'http://54.255.249.21:5000';


>>>>>>> 168825ba3f001797d7c5d3036f95666f07300102

// --- Multer S3 Upload Middleware ---
export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET_NAME,
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => cb(null, `photos/${Date.now().toString()}-${file.originalname}`)
  })
});

// --- Upload Photo for Update (Updated) ---
// ✅ UPDATED: Upload Photo WITHOUT completion percentage
// ✅ UPDATED: Store phase information with photos
export const uploadPhotoForUpdate = async (req, res) => {
  let { updateId } = req.params;
  const { caption, projectId, taskId, taskName } = req.body;
  const photoId = uuidv4();

  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  if (!projectId) return res.status(400).json({ message: 'Project ID is required.' });
  if (!taskId) return res.status(400).json({ message: 'Task selection is required.' });

  if (!updateId) updateId = `UPD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    // ✅ Fetch task details to get phase information
    const taskParams = {
      TableName: 'BuildWiseMilestones',
      Key: {
        projectId: projectId,
        milestoneId: taskId
      }
    };
    
    const taskResult = await docClient.send(new GetCommand(taskParams));
    const task = taskResult.Item;
    
    const phaseId = task?.parentPhase || null;
    const phaseName = task?.parentPhaseName || 'No Phase';

    const existingPhotos = await docClient.send(new QueryCommand({
      TableName: 'BuildWisePhotos',
      KeyConditionExpression: 'updateId = :updateId',
      ExpressionAttributeValues: { ':updateId': updateId }
    }));

    const MAX_PHOTOS_PER_UPDATE = 5;
    if (existingPhotos.Items.length >= MAX_PHOTOS_PER_UPDATE) {
      return res.status(400).json({
        message: `You can upload only ${MAX_PHOTOS_PER_UPDATE} photos per update.`
      });
    }

    const publicUrl = `https://${BUCKET_NAME}.s3.ap-southeast-1.amazonaws.com/${req.file.key}`;

    console.log('📸 Photo uploaded to S3:', req.file.originalname);
    console.log('🔗 Photo URL:', publicUrl);
    console.log('📁 Project ID:', projectId);
    console.log('📋 Task ID:', taskId);
    console.log('📝 Task Name:', taskName);
    console.log('🏗️ Phase ID:', phaseId);
    console.log('🏷️ Phase Name:', phaseName);

    // AI Analysis
    let aiAnalysis = null;
    let aiProcessed = false;

    try {
      const imageResponse = await axios.get(publicUrl, { 
        responseType: 'arraybuffer', 
        timeout: 15000 
      });
      
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('image', Buffer.from(imageResponse.data), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });

      try {
        const aiResponse = await axios.post(`${AI_API_URL}/analyze`, formData, {
          headers: formData.getHeaders(),
          timeout: 15000  // Reduced to 15 seconds for faster feedback
        });

        aiAnalysis = aiResponse.data;
        aiProcessed = aiAnalysis && aiAnalysis.success;
        console.log('✅ AI Analysis successful:', aiProcessed);
      } catch (aiTimeoutError) {
        // If AI service is unavailable or timing out, create a default suggestion
        console.warn('⚠️ AI Analysis unavailable (timeout/connection error):', aiTimeoutError.code || aiTimeoutError.message);
        
        aiAnalysis = {
          success: false,
          error: true,
          message: 'AI service temporarily unavailable',
          code: aiTimeoutError.code,
          timestamp: new Date().toISOString(),
          ai_suggestion: {
            milestone: taskName || 'Task',
            confidence: 'low',
            reason: 'AI service unavailable - manual review required'
          }
        };
        aiProcessed = false;
      }
    } catch (imageError) {
      console.error('❌ Image download failed:', imageError.message);
      aiAnalysis = { 
        error: true, 
        message: 'Failed to download image for analysis',
        code: imageError.code,
        timestamp: new Date().toISOString() 
      };
      aiProcessed = false;
    }

    // ✅ Save WITH phase information
    const params = {
      TableName: 'BuildWisePhotos',
      Item: {
        updateId,
        photoId,
        projectId,
        taskId,
        taskName,
        phaseId,        // ✅ NEW: Store phase ID
        phaseName,      // ✅ NEW: Store phase name
        fileURL: publicUrl,
        s3Key: req.file.key,
        caption: caption || 'No caption',
        fileName: req.file.originalname,
        uploadedAt: new Date().toISOString(),
        aiAnalysis,
        aiProcessed,
        aiSuggestion: aiAnalysis?.ai_suggestion || null,
        aiDetections: aiAnalysis?.detections || null,
        totalObjects: aiAnalysis?.total_objects || 0,
        confirmationStatus: 'pending',
        userConfirmedMilestone: null,
        userInputPercentage: null,
        calculatedProgress: null
      }
    };

    await docClient.send(new PutCommand(params));

    res.status(201).json({
      message: 'Photo uploaded and analyzed successfully!',
      photo: params.Item,
      aiAnalysis,
      updateId
    });
  } catch (error) {
    console.error('❌ Error in uploadPhotoForUpdate:', error);
    return res.status(500).json({ message: 'Failed to upload photo', error: error.message });
  }
};

// ✅ UPDATED: Confirm AI Suggestion (now updates task completion)
export const confirmAISuggestion = async (req, res) => {
  const { photoId } = req.params;
  const { updateId, milestone, userPercentage, confirmed, taskId, projectId } = req.body;

  if (!photoId || !updateId || !milestone || userPercentage === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!taskId || !projectId) {
    return res.status(400).json({ message: 'Task ID and Project ID are required to update task completion' });
  }

  try {
    console.log('🔄 Confirming AI suggestion...');
    console.log('📊 Milestone:', milestone);
    console.log('📈 User Percentage:', userPercentage);
    console.log('✅ Confirmed:', confirmed);
    console.log('📋 Task ID:', taskId);
    console.log('🏗️ Project ID:', projectId);

    let calculation;
    
    // Try to call the AI service with a 10-second timeout
    try {
      const confirmResponse = await axios.post(`${AI_API_URL}/confirm`, {
        milestone,
        user_percentage: parseFloat(userPercentage),
        confirmed
      }, {
        timeout: 10000  // 10 second timeout
      });

      calculation = confirmResponse.data;
      console.log('✅ AI service responded successfully');
    } catch (aiError) {
      // If AI service is unavailable, use fallback calculation
      console.warn('⚠️ AI service unavailable, using fallback calculation:', aiError.code);
      
      calculation = {
        overall_progress_percent: parseFloat(userPercentage),
        calculation: `Fallback calculation (AI service unavailable): ${milestone} - ${userPercentage}% completion confirmed by user`,
        milestone: milestone,
        user_percentage: parseFloat(userPercentage),
        confirmed: confirmed
      };
    }

    // Update photo confirmation status
    const photoParams = {
      TableName: 'BuildWisePhotos',
      Key: { updateId, photoId },
      UpdateExpression: `SET 
        confirmationStatus = :status,
        userConfirmedMilestone = :milestone,
        userInputPercentage = :percentage,
        calculatedProgress = :progress,
        overallProgressPercent = :overallProgress,
        calculation = :calculation,
        confirmedAt = :confirmedAt`,
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

    const photoResult = await docClient.send(new UpdateCommand(photoParams));

    // Update task completion percentage
    if (confirmed && taskId && projectId) {
      try {
        console.log('📋 Updating task completion percentage...');
        
        const now = new Date().toISOString();
        const isCompleted = parseFloat(userPercentage) >= 100;
        
        const taskUpdateParams = {
          TableName: 'BuildWiseMilestones',
          Key: {
            projectId: projectId,
            milestoneId: taskId
          },
          UpdateExpression: `SET 
            completionPercentage = :percentage,
            #status = :status,
            completedAt = :completedAt,
            updatedAt = :now`,
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':percentage': parseFloat(userPercentage),
            ':status': isCompleted ? 'completed' : (parseFloat(userPercentage) > 0 ? 'in progress' : 'not started'),
            ':completedAt': isCompleted ? now : null,
            ':now': now
          },
          ReturnValues: 'ALL_NEW'
        };
        
        const taskResult = await docClient.send(new UpdateCommand(taskUpdateParams));
        
        console.log('✅ Task completion updated successfully!');
        console.log(`   Task: ${taskResult.Attributes.milestoneName}`);
        console.log(`   Completion: ${taskResult.Attributes.completionPercentage}%`);
        
        // ✅ Auto-update project status
        await autoUpdateProjectStatus(projectId);
        
      } catch (taskError) {
        console.error('⚠️ Warning: Failed to update task completion:', taskError.message);
      }
    }

    res.status(200).json({
      message: 'Confirmation saved successfully',
      photo: photoResult.Attributes,
      calculation,
      taskUpdated: confirmed && taskId && projectId,
      aiServiceAvailable: !calculation.calculation.includes('Fallback')
    });

  } catch (error) {
    console.error('❌ Error saving confirmation:', error);
    res.status(500).json({ 
      message: 'Failed to save confirmation', 
      error: error.message,
      code: error.code
    });
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