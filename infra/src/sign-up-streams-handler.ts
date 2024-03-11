import * as lambda from "aws-lambda"
import { unmarshall } from "@aws-sdk/util-dynamodb"
import { AttributeValue } from "@aws-sdk/client-dynamodb"
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider"
import { userAttributesSchema } from "./entities"

const cognitoClient = new CognitoIdentityProviderClient()

export const handler: lambda.DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    const result = safeUnmarshall(record.dynamodb?.NewImage)

    if (result.success) {
      await updateUserAttributes(result.data)
    }
  }
}

const updateUserAttributes = async (data: unknown) => {
  const { user_id, tenant_id, company_name, cognito_user_name } = userAttributesSchema.parse(data)

  const command = new AdminUpdateUserAttributesCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: cognito_user_name,
    UserAttributes: [
      {
        Name: "custom:user_id",
        Value: user_id,
      },
      {
        Name: "custom:tenant_id",
        Value: tenant_id,
      },
      {
        Name: "custom:company_name",
        Value: company_name,
      },
    ],
  })

  await cognitoClient.send(command)
}

const safeUnmarshall = (image?: { [key: string]: lambda.AttributeValue }) => {
  if (!image) return { success: false as const }

  const data = unmarshall(image as { [key: string]: AttributeValue })
  return { success: true as const, data }
}
