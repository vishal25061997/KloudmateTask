const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

exports.handler = async (event) => {
    try {
        // Extract required attributes from Lambda Telemetry API event
        const { functionName, region, accountId, executionId, executionTime, logs } = event;

        // Process logs to detect errors
        const errors = logs.filter(log => log.level === 'ERROR');

        if (errors.length > 0) {
            // Extract details of the first error
            const error = errors[0];
            
            // Extract relevant information from the error log
            const errorMessage = error.message;
            const stackTrace = error.stackTrace;

            // Store error information in DynamoDB
            const params = {
                TableName: 'ErrorLogs',
                Item: {
                    FunctionName: functionName,
                    FunctionRegion: region,
                    FunctionAccountId: accountId,
                    ExecutionId: executionId,
                    ExecutionTime: executionTime,
                    ErrorType: 'LambdaError',
                    ErrorMessage: errorMessage,
                    StackTrace: stackTrace
                }
            };

            await dynamoDB.put(params).promise();

            // Send notification to SNS Topic
            const snsParams = {
                TopicArn: 'YOUR_SNS_TOPIC_ARN',
                Subject: 'Lambda Error Notification',
                Message: `An error occurred in Lambda function "${functionName}":\n\n${errorMessage}`
            };

            await sns.publish(snsParams).promise();
        }

        return {
            statusCode: 200,
            body: 'Logs processed successfully'
        };
    } catch (error) {
        console.error('Error processing logs:', error);
        return {
            statusCode: 500,
            body: 'Error processing logs'
        };
    }
};
