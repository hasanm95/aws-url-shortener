const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    try {
        // Extract the shortCode from parameters from route path '/{code}'
        const shortCode = event.pathParameters?.code;
        if (!shortCode) {
            return {
                statusCode: 400,
                headers: { 
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify({ 
                    error: "Short code parameter is missing" 
                })
            };
        }

        // Lookup in db
        const dbCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                code: shortCode
            }
        })
        const result = await docClient.send(dbCommand)

        // if code not in db
        if (!result.Item || !result.Item.url) {
            return {
                statusCode: 404,
                headers: { 
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify({ 
                    error: "Shortened URL not found" 
                })
            };
        }

        // Increment click count
        const updateDbCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                code: shortCode
            },
            UpdateExpression: "SET clickCount = if_not_exists(clickCount, :start) + :inc",
            ExpressionAttributeValues: {
                ":inc": 1,
                ":start": 0
            }
        })
        docClient.send(updateDbCommand).catch(err => console.error("Background analytics update failed:", err))

        // Return HTTP 301 Redirect
        return {
            statusCode: 301,
            headers: {
                "Location": result.Item.url,
                "Cache-Control": "public, max-age=86400"
            },
            body: ""
        };
    } catch (error) {
        console.error("FULL REDIRECT CRASH ERROR:", error.stack || error.message || error);
        return {
            statusCode: 500,
            headers: { 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ 
                error: "Internal Server Error" 
            })
        };
    }
}