import * as path from "path"
import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs"
import * as logs from "aws-cdk-lib/aws-logs"
import * as sqs from "aws-cdk-lib/aws-sqs"
import * as eventSources from "aws-cdk-lib/aws-lambda-event-sources"
import { Construct } from "constructs"

export class AuthStack extends Stack {
  public userPool: cognito.UserPool

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "multi-tenant-user-pool",
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      signInAliases: {
        email: true,
      },
      customAttributes: {
        userId: new cognito.StringAttribute({ minLen: 12, maxLen: 48, mutable: true }),
        tenantId: new cognito.StringAttribute({ minLen: 12, maxLen: 48, mutable: true }),
      },
      // Only for development
      removalPolicy: RemovalPolicy.DESTROY,
    })

    new cognito.CfnUserPoolGroup(this, "SystemAdministrator", {
      userPoolId: userPool.userPoolId,
      groupName: "SystemAdministrator",
    })

    new cognito.CfnUserPoolGroup(this, "TenantAdministrator)", {
      userPoolId: userPool.userPoolId,
      groupName: "TenantAdministrator",
    })

    new cognito.CfnUserPoolGroup(this, "User", {
      userPoolId: userPool.userPoolId,
      groupName: "User",
    })

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({ email: true, emailVerified: true })
        .withCustomAttributes("custom:userId", "custom:tenantId"),
      writeAttributes: new cognito.ClientAttributes().withStandardAttributes({ email: true }),
    })

    new CfnOutput(this, "user-pool-id", { value: userPool.userPoolId })
    new CfnOutput(this, "user-pool-client-id", { value: userPoolClient.userPoolClientId })

    this.userPool = userPool

    const deadLetterQueue = new sqs.Queue(this, "DeadLetterQueue")
    const preSignUpEventQueue = new sqs.Queue(this, "PreSignUpEventQueue", {
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: deadLetterQueue,
      },
    })

    const preSignUpTrigger = new nodejs.NodejsFunction(this, "PreSignUpTrigger", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../src/pre-sign-up-trigger.ts"),
      handler: "handler",
      logRetention: logs.RetentionDays.ONE_MONTH,
      environment: {
        QUEUE_URL: preSignUpEventQueue.queueUrl,
      },
    })
    preSignUpEventQueue.grantSendMessages(preSignUpTrigger)

    const customAttributeHandler = new nodejs.NodejsFunction(this, "CustomAttributeHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../src/custom-attribute-handler.ts"),
      handler: "handler",
      logRetention: logs.RetentionDays.ONE_MONTH,
      description: `Created at: ${new Date().toISOString()}`,
    })
    customAttributeHandler.addEventSource(new eventSources.SqsEventSource(preSignUpEventQueue))
    preSignUpEventQueue.grantConsumeMessages(customAttributeHandler)
    userPool.grant(customAttributeHandler, "cognito-idp:AdminUpdateUserAttributes")

    userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpTrigger)
  }
}
