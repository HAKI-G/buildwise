import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, DeleteCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import multerS3 from 'multer-s3';
import axios from 'axios';
import { autoUpdateProjectStatus } from './projectController.js';
import { analyzeConstructionPhoto } from '../services/aiService.js';

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
    
    let phaseId = task?.parentPhase || null;
    let phaseName = 'No Phase';
    
    // ✅ If task has a parent phase, fetch the phase name
    if (phaseId) {
      try {
        const phaseParams = {
          TableName: 'BuildWiseMilestones',
          Key: {
            projectId: projectId,
            milestoneId: phaseId
          }
        };
        
        const phaseResult = await docClient.send(new GetCommand(phaseParams));
        if (phaseResult.Item) {
          phaseName = phaseResult.Item.milestoneName || phaseResult.Item.name || 'No Phase';
          console.log('✅ Found phase name:', phaseName);
        }
      } catch (phaseError) {
        console.warn('⚠️ Could not fetch phase name:', phaseError.message);
      }
    }

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

    // AI Analysis using Claude Vision
    let aiAnalysis = null;
    let aiProcessed = false;

    try {
      console.log('🤖 Calling Claude Vision AI for construction analysis...');
      
      aiAnalysis = await analyzeConstructionPhoto(publicUrl, taskName, phaseName, {
        projectName: projectId,
      });
      
      aiProcessed = aiAnalysis && aiAnalysis.success;
      console.log('✅ Claude Vision Analysis successful:', aiProcessed);
      
      if (aiProcessed) {
        const aiPercentage = aiAnalysis?.ai_suggestion?.suggested_percentage || 
                           aiAnalysis?.progress_assessment?.estimated_completion_percentage || 
                           null;
        console.log('📊 AI Suggested Percentage:', aiPercentage);
        console.log('📋 AI Summary:', aiAnalysis?.summary || 'N/A');
        console.log('🛡️ Safety Rating:', aiAnalysis?.safety_assessment?.overall_rating || 'N/A');
      }
      
    } catch (aiError) {
      console.error('❌ Claude Vision analysis failed:', aiError.message);
      aiAnalysis = {
        success: false,
        error: true,
        message: 'AI analysis temporarily unavailable',
        timestamp: new Date().toISOString(),
        ai_suggestion: {
          milestone: taskName || 'Task',
          confidence: 'low',
          reason: 'AI analysis error - manual review required'
        }
      };
      aiProcessed = false;
    }

    // ✅ Save WITH phase information + Claude Vision analysis
    const params = {
      TableName: 'BuildWisePhotos',
      Item: {
        updateId,
        photoId,
        projectId,
        taskId,
        taskName,
        phaseId,        // ✅ Store phase ID
        phaseName,      // ✅ Store phase name
        fileURL: publicUrl,
        s3Key: req.file.key,
        caption: caption || 'No caption',
        fileName: req.file.originalname,
        uploadedAt: new Date().toISOString(),
        aiAnalysis,
        aiProcessed,
        aiSuggestion: aiAnalysis?.ai_suggestion || null,
        aiSuggestedPercentage: aiAnalysis?.ai_suggestion?.suggested_percentage || 
                              aiAnalysis?.progress_assessment?.estimated_completion_percentage || 
                              null,
        aiSummary: aiAnalysis?.summary || null,
        aiSafetyRating: aiAnalysis?.safety_assessment?.overall_rating || null,
        aiProgressStage: aiAnalysis?.progress_assessment?.stage || null,
        aiConfidence: aiAnalysis?.progress_assessment?.confidence || null,
        aiProvider: 'claude-vision',
        aiDetections: aiAnalysis?.construction_details?.materials_detected || null,
        totalObjects: (aiAnalysis?.construction_details?.materials_detected?.length || 0) +
                      (aiAnalysis?.construction_details?.equipment_detected?.length || 0),
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

  if (!photoId || !updateId || !milestone) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Only require userPercentage if confirming (not rejecting)
  if (confirmed && userPercentage === undefined) {
    return res.status(400).json({ message: 'User percentage is required for confirmation' });
  }

  if (confirmed && (!taskId || !projectId)) {
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
    
    // Use local calculation (no external AI service needed for confirmation)
    calculation = {
      overall_progress_percent: parseFloat(userPercentage),
      calculation: `${milestone} — ${userPercentage}% completion confirmed by user`,
      milestone: milestone,
      user_percentage: parseFloat(userPercentage),
      confirmed: confirmed
    };

    // Get current photo to preserve AI suggested percentage
    const getPhotoParams = {
      TableName: 'BuildWisePhotos',
      Key: { updateId, photoId }
    };
    const currentPhoto = await docClient.send(new GetCommand(getPhotoParams));
    const aiSuggestedPercentage = currentPhoto.Item?.aiSuggestedPercentage || null;

    // Update photo confirmation status
    let photoParams;
    
    if (confirmed) {
      // For confirmed photos, update with user percentage
      photoParams = {
        TableName: 'BuildWisePhotos',
        Key: { updateId, photoId },
        UpdateExpression: `SET 
          confirmationStatus = :status,
          userConfirmedMilestone = :milestone,
          userInputPercentage = :percentage,
          aiSuggestedPercentage = :aiPercentage,
          calculatedProgress = :progress,
          overallProgressPercent = :overallProgress,
          calculation = :calculation,
          confirmedAt = :confirmedAt`,
        ExpressionAttributeValues: {
          ':status': 'confirmed',
          ':milestone': milestone,
          ':percentage': parseFloat(userPercentage),
          ':aiPercentage': aiSuggestedPercentage,
          ':progress': calculation.overall_progress_percent,
          ':overallProgress': calculation.overall_progress_percent,
          ':calculation': calculation.calculation,
          ':confirmedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      };
    } else {
      // For rejected photos, just update status
      photoParams = {
        TableName: 'BuildWisePhotos',
        Key: { updateId, photoId },
        UpdateExpression: `SET 
          confirmationStatus = :status,
          confirmedAt = :confirmedAt`,
        ExpressionAttributeValues: {
          ':status': 'rejected',
          ':confirmedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      };
    }

    const photoResult = await docClient.send(new UpdateCommand(photoParams));

    // ✅ AUTO-UPDATE TASK STATUS based on all photos (not just this one)
    if (confirmed && taskId && projectId) {
      try {
        console.log('🔄 Triggering auto-status update for task...');
        
        // Call the sync endpoint to recalculate status from ALL photos
        const token = req.headers.authorization; // Forward the auth token
        const apiUrl = process.env.API_URL || `${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}`;
        
        console.log(`📡 Calling sync endpoint: ${apiUrl}/api/milestones/${projectId}/task/${taskId}/sync-status`);
        
        await axios.post(
          `${apiUrl}/api/milestones/${projectId}/task/${taskId}/sync-status`,
          {},
          { headers: { Authorization: token } }
        );
        
        console.log('✅ Task status synced successfully from all photos!');
        
        // ✅ Also trigger project status update
        await autoUpdateProjectStatus(projectId);
        console.log('✅ Project status updated!');
        
      } catch (taskError) {
        console.error('⚠️ Warning: Failed to sync task status:', taskError.message);
        console.error('Error details:', taskError.response?.data || taskError.message);
        // Continue anyway - this is not critical
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
    const { updateId, s3Key, taskId, projectId } = req.body;

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

        // ✅ AUTO-UPDATE TASK STATUS after deletion
        if (taskId && projectId) {
            try {
                console.log('🔄 Triggering auto-status update after photo deletion...');
                
                const token = req.headers.authorization;
                const apiUrl = process.env.API_URL || `${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}`;
                
                await axios.post(
                    `${apiUrl}/api/milestones/${projectId}/task/${taskId}/sync-status`,
                    {},
                    { headers: { Authorization: token } }
                );
                
                console.log('✅ Task status synced after deletion!');
                
                // Also update project status
                await autoUpdateProjectStatus(projectId);
                console.log('✅ Project status updated after deletion!');
                
            } catch (syncError) {
                console.error('⚠️ Warning: Failed to sync after deletion:', syncError.message);
            }
        }

        res.status(200).json({ message: 'Photo deleted successfully' });
    } catch (error) {
        console.error('Error deleting photo:', error);
        res.status(500).json({ message: 'Failed to delete photo', error: error.message });
    }
};