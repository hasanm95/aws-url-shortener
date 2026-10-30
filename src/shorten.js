const crypto = require('crypto');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);

const TABLE_NAME = process.env.TABLE_NAME;

function generateUniqueKey(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const randomBytes = crypto.randomBytes(length);for (let i = 0; i < length; i++) {
        result += chars[randomBytes[i] % chars.length];
    }
    return result
}

exports.handler = async (events) => {
    try {
        // Check if the body exists 
        if (!events.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing body" })
            }
        }

        // Parse the body
        const data = JSON.parse(events.body)
        const originalURL = data.url;

        if (!originalURL) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "URL is required" })
            };
        }

        // Generate the unique short code
        const shortCode = generateUniqueKey(6)

        // Save to db
        console.log("Table Name ===> ", TABLE_NAME, shortCode)

        const item = {
            code: shortCode,
            url: originalURL,
            createdAt: new Date().toISOString()
        }

        const dbCommand = new PutCommand({
            TableName: TABLE_NAME,
            Item: item
        })

        await docClient.send(dbCommand);

        return {
            statusCode: 201,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: shortCode })
        }

    } catch (error) {
        console.error("Error shortening URL:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" })
        };
    }
}