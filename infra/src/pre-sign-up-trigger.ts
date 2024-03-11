import { PreSignUpTriggerEvent, PreSignUpTriggerHandler } from "aws-lambda"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb"
import { randomUUID } from "crypto"
import { userAttributesCreateSchema, UserAttributesCreateParam, UserAttributes, Item } from "./entities"

const ddbDocClient = DynamoDBDocument.from(new DynamoDBClient())

export const handler: PreSignUpTriggerHandler = async (event) => {
  const userAttributes = userAttributesCreateSchema.parse({
    ...event.request.userAttributes,
    cognito_user_name: event.userName,
    company_name: getCompanyName(event),
  })

  await ddbDocClient.put({
    TableName: process.env.USER_TABLE_NAME,
    Item: createUserItem(userAttributes),
  })

  return event
}

const createUserItem = (param: UserAttributesCreateParam) => {
  const createdAt = new Date().toISOString()
  const {
    email,
    user_id = randomUUID(),
    tenant_id = randomUUID(),
    company_name,
    cognito_user_name,
    created_at = createdAt,
    updated_at = createdAt,
    email_verified = "No",
  } = param

  return {
    pk: `#TENANT#${tenant_id}#USER#${user_id}`,
    user_id,
    email,
    tenant_id,
    company_name,
    cognito_user_name,
    created_at,
    updated_at,
    email_verified,
  } satisfies Item<UserAttributes>
}

const getCompanyName = (event: PreSignUpTriggerEvent) => {
  return isAvikus(event.request.userAttributes.email) ? "avikus" : event.request.userAttributes.company_name
}

const isAvikus = (email: string) => email.includes("@avikus.ai")
