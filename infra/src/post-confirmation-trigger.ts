import { randomUUID } from "crypto"
import { PostConfirmationTriggerHandler } from "aws-lambda"
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient()

export const handler: PostConfirmationTriggerHandler = async (event) => {
    console.log(event)
    const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        UserAttributes: [
            {
                Name: "custom:userId",
                Value: randomUUID()
            }
        ]
    })
    
    await cognitoClient.send(command)
}