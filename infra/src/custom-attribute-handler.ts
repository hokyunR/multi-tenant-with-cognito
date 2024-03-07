import { randomUUID } from "crypto"
import { SQSEvent, PreSignUpTriggerEvent } from "aws-lambda"
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider"

const cognitoClient = new CognitoIdentityProviderClient()

export const handler = async (event: SQSEvent) => {
  for await (const record of event.Records) {
    const message = JSON.parse(record.body) as PreSignUpTriggerEvent
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: message.userPoolId,
      Username: message.userName,
      UserAttributes: [
        {
          Name: "custom:userId",
          Value: randomUUID(),
        },
      ],
    })

    await cognitoClient.send(command)
  }
}
