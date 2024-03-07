import { PreSignUpTriggerHandler } from "aws-lambda"
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs"

const sqsClient = new SQSClient()

export const handler: PreSignUpTriggerHandler = async (event) => {
  const command = new SendMessageCommand({
    QueueUrl: process.env.QUEUE_URL,
    MessageBody: JSON.stringify(event),
  })

  await sqsClient.send(command)

  return event
}
