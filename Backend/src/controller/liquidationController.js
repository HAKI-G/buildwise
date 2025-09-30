import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';

// Configure DynamoDB client - will use AWS CLI credentials automatically
const client = new DynamoDBClient({
    region: "ap-southeast-1" // Your region from screenshot
});

const dynamoDB = DynamoDBDocumentClient.from(client);

const LIQUIDATIONS_TABLE = "BuildWiseLiquidations";

// Rest of the code stays the same...
// Get all liquidations for a project
export const getLiquidations = async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const params = {
            TableName: LIQUIDATIONS_TABLE,
            FilterExpression: "projectId = :projectId",
            ExpressionAttributeValues: {
                ":projectId": projectId
            }
        };

        const result = await dynamoDB.send(new ScanCommand(params));
        
        // Sort by creation date (most recent first)
        const liquidations = result.Items.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        res.json(liquidations);
    } catch (error) {
        console.error('Error fetching liquidations:', error);
        res.status(500).json({ message: 'Failed to fetch liquidations', error: error.message });
    }
};

// Get single liquidation by ID
export const getLiquidationById = async (req, res) => {
    try {
        const { liquidationId } = req.params;
        
        const params = {
            TableName: LIQUIDATIONS_TABLE,
            Key: {
                liquidationId: liquidationId
            }
        };

        const result = await dynamoDB.send(new GetCommand(params));
        
        if (!result.Item) {
            return res.status(404).json({ message: 'Liquidation not found' });
        }
        
        res.json(result.Item);
    } catch (error) {
        console.error('Error fetching liquidation:', error);
        res.status(500).json({ message: 'Failed to fetch liquidation', error: error.message });
    }
};

// Create new liquidation
export const createLiquidation = async (req, res) => {
    try {
        const { projectId } = req.params;
        const {
            name,
            purpose,
            budgetAmount,
            expensePeriodFrom,
            expensePeriodTo,
            expenses,
            totalSpent,
            disbursement
        } = req.body;

        const liquidationId = uuidv4();
        const now = new Date().toISOString();

        const liquidation = {
            liquidationId,
            projectId,
            name,
            purpose,
            budgetAmount: parseFloat(budgetAmount),
            expensePeriodFrom,
            expensePeriodTo,
            expenses: expenses.map(exp => ({
                ...exp,
                quantity: parseFloat(exp.quantity),
                itemPrice: parseFloat(exp.itemPrice),
                amount: parseFloat(exp.amount)
            })),
            totalSpent: parseFloat(totalSpent),
            disbursement: parseFloat(disbursement),
            createdBy: req.user.id,
            createdAt: now,
            updatedAt: now
        };

        const params = {
            TableName: LIQUIDATIONS_TABLE,
            Item: liquidation
        };

        await dynamoDB.send(new PutCommand(params));
        
        res.status(201).json(liquidation);
    } catch (error) {
        console.error('Error creating liquidation:', error);
        res.status(500).json({ message: 'Failed to create liquidation', error: error.message });
    }
};

// Update liquidation
export const updateLiquidation = async (req, res) => {
    try {
        const { liquidationId } = req.params;
        const {
            name,
            purpose,
            budgetAmount,
            expensePeriodFrom,
            expensePeriodTo,
            expenses,
            totalSpent,
            disbursement
        } = req.body;

        const params = {
            TableName: LIQUIDATIONS_TABLE,
            Key: {
                liquidationId: liquidationId
            },
            UpdateExpression: `
                SET #name = :name,
                    purpose = :purpose,
                    budgetAmount = :budgetAmount,
                    expensePeriodFrom = :expensePeriodFrom,
                    expensePeriodTo = :expensePeriodTo,
                    expenses = :expenses,
                    totalSpent = :totalSpent,
                    disbursement = :disbursement,
                    updatedAt = :updatedAt
            `,
            ExpressionAttributeNames: {
                '#name': 'name'
            },
            ExpressionAttributeValues: {
                ':name': name,
                ':purpose': purpose,
                ':budgetAmount': parseFloat(budgetAmount),
                ':expensePeriodFrom': expensePeriodFrom,
                ':expensePeriodTo': expensePeriodTo,
                ':expenses': expenses.map(exp => ({
                    ...exp,
                    quantity: parseFloat(exp.quantity),
                    itemPrice: parseFloat(exp.itemPrice),
                    amount: parseFloat(exp.amount)
                })),
                ':totalSpent': parseFloat(totalSpent),
                ':disbursement': parseFloat(disbursement),
                ':updatedAt': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        };

        const result = await dynamoDB.send(new UpdateCommand(params));
        res.json(result.Attributes);
    } catch (error) {
        console.error('Error updating liquidation:', error);
        res.status(500).json({ message: 'Failed to update liquidation', error: error.message });
    }
};

// Delete liquidation
export const deleteLiquidation = async (req, res) => {
    try {
        const { liquidationId } = req.params;
        
        const params = {
            TableName: LIQUIDATIONS_TABLE,
            Key: {
                liquidationId: liquidationId
            }
        };

        await dynamoDB.send(new DeleteCommand(params));
        res.json({ message: 'Liquidation deleted successfully' });
    } catch (error) {
        console.error('Error deleting liquidation:', error);
        res.status(500).json({ message: 'Failed to delete liquidation', error: error.message });
    }
};


export const generateLiquidationPDF = async (req, res) => {
    try {
        const { liquidationId } = req.params;
        
        const params = {
            TableName: LIQUIDATIONS_TABLE,
            Key: {
                liquidationId: liquidationId
            }
        };

        const result = await dynamoDB.send(new GetCommand(params));
        const liquidation = result.Item;
        
        if (!liquidation) {
            return res.status(404).json({ message: 'Liquidation not found' });
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=liquidation-${liquidation.name.replace(/\s+/g, '-')}.pdf`);
        
        // Pipe PDF to response
        doc.pipe(res);

        // Header
        doc.fontSize(16).text('Liquidation Report', { align: 'center', underline: true });
        doc.moveDown(2);

        // Basic Information
        doc.fontSize(12);
        doc.text(`Name: ${liquidation.name}`);
        doc.text(`Purpose: ${liquidation.purpose}`);
        doc.moveDown();

        // Budget Information
        const periodFrom = new Date(liquidation.expensePeriodFrom).toLocaleDateString();
        const periodTo = new Date(liquidation.expensePeriodTo).toLocaleDateString();
        
        doc.fontSize(10);
        doc.text('Budget Information', { underline: true });
        doc.fontSize(10);
        doc.text(`Beginning Balance: PHP ${liquidation.budgetAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
        doc.text(`Expense Period: ${periodFrom} to ${periodTo}`);
        doc.moveDown();

        // Expense Report Table
        doc.fontSize(10).text('Expense Report', { underline: true });
        doc.moveDown(0.5);

        // Table headers
        const tableTop = doc.y;
        const colWidths = [180, 80, 60, 90, 90];
        const headers = ['Particulars', 'Expense Type', 'Quantity', 'Item Price (PHP)', 'Amount (PHP)'];
        
        let xPos = 50;
        doc.fontSize(9).fillColor('black');
        headers.forEach((header, i) => {
            doc.text(header, xPos, tableTop, { width: colWidths[i], align: i >= 2 ? 'right' : 'left' });
            xPos += colWidths[i];
        });
        
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.moveDown();

        // Table rows
        let yPos = tableTop + 20;
        liquidation.expenses.forEach((expense) => {
            if (yPos > 700) {
                doc.addPage();
                yPos = 50;
            }

            xPos = 50;
            doc.fontSize(8);
            doc.text(expense.particulars, xPos, yPos, { width: colWidths[0] });
            xPos += colWidths[0];
            
            doc.text(expense.expenseType, xPos, yPos, { width: colWidths[1] });
            xPos += colWidths[1];
            
            doc.text(expense.quantity.toString(), xPos, yPos, { width: colWidths[2], align: 'right' });
            xPos += colWidths[2];
            
            doc.text(`${parseFloat(expense.itemPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, xPos, yPos, { width: colWidths[3], align: 'right' });
            xPos += colWidths[3];
            
            doc.text(`${parseFloat(expense.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, xPos, yPos, { width: colWidths[4], align: 'right' });
            
            yPos += 20;
        });

        doc.moveDown(2);

        // Summary
        doc.fontSize(10).text('Summary', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(10);
        doc.text(`Amount of Cash Advance: PHP ${liquidation.budgetAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
        doc.text(`Total Amount Spent: PHP ${liquidation.totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
        
        const disbursementColor = liquidation.disbursement < 0 ? 'red' : 'green';
        doc.fillColor(disbursementColor);
        doc.text(`Disbursement: PHP ${liquidation.disbursement.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
        doc.fillColor('black');
        
        doc.moveDown(3);

        // Signature Section
        doc.fontSize(10);
        const signatureY = doc.y + 30;
        doc.text('Submitted by:', 50, signatureY);
        doc.text('Noted by:', 250, signatureY);
        doc.text('Approved by:', 450, signatureY);
        
        doc.moveTo(50, signatureY + 30).lineTo(150, signatureY + 30).stroke();
        doc.moveTo(250, signatureY + 30).lineTo(350, signatureY + 30).stroke();
        doc.moveTo(450, signatureY + 30).lineTo(550, signatureY + 30).stroke();

        // Footer
        doc.fontSize(8).text(
            `Liquidation Report | ${liquidation.name}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
        );

        // Finalize PDF
        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
    }
};