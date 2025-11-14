import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-southeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

// ✅ Check for overdue projects and update status
export const checkOverdueProjects = async () => {
    try {
        console.log('🔍 [CRON] Checking for overdue projects...');
        
        const params = {
            TableName: 'buildwiseProjects'  // ✅ Your table name
        };
        
        const result = await docClient.send(new ScanCommand(params));
        const projects = result.Items || [];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let overdueCount = 0;
        
        for (const project of projects) {
            if (project.status === 'Completed' || project.status === 'On Hold') {
                continue;
            }
            
            if (!project.contractCompletionDate && !project.targetDate) {
                continue;
            }
            
            const dueDate = new Date(project.contractCompletionDate || project.targetDate);
            dueDate.setHours(0, 0, 0, 0);
            
            if (today > dueDate) {
                console.log(`⚠️ Project "${project.name}" is overdue (Due: ${dueDate.toLocaleDateString()})`);
                
                const updateParams = {
                    TableName: 'buildwiseProjects',
                    Key: { projectId: project.projectId },
                    UpdateExpression: 'SET #status = :status',
                    ExpressionAttributeNames: {
                        '#status': 'status'
                    },
                    ExpressionAttributeValues: {
                        ':status': 'Overdue'
                    }
                };
                
                await docClient.send(new UpdateCommand(updateParams));
                overdueCount++;
            }
        }
        
        console.log(`✅ [CRON] Overdue check complete. ${overdueCount} project(s) marked as overdue.`);
        
    } catch (error) {
        console.error('❌ [CRON] Error checking overdue projects:', error);
    }
};

// ✅ Start the cron job
export const startOverdueCronJob = () => {
    checkOverdueProjects();
    
    setInterval(checkOverdueProjects, 24 * 60 * 60 * 1000);
    
    console.log('✅ Overdue projects cron job started (runs daily)');
};