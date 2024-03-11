import * as path from "path"
import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs"
import * as logs from "aws-cdk-lib/aws-logs"
import * as eventSources from "aws-cdk-lib/aws-lambda-event-sources"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import { Construct } from "constructs"

export class AuthStack extends Stack {
  public userPool: cognito.UserPool

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "multi-tenant-user-pool",
      // user can only be invited by admin
      selfSignUpEnabled: false,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      signInAliases: {
        email: true,
      },
      customAttributes: {
        user_id: new cognito.StringAttribute({ minLen: 1, maxLen: 128, mutable: true }),
        tenant_id: new cognito.StringAttribute({ minLen: 1, maxLen: 128, mutable: true }),
        company_name: new cognito.StringAttribute({ minLen: 1, maxLen: 128, mutable: true }),
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
      readAttributes: new cognito.ClientAttributes().withStandardAttributes({ email: true, emailVerified: true }),
      writeAttributes: new cognito.ClientAttributes().withStandardAttributes({ email: true }),
    })

    new CfnOutput(this, "user-pool-id", { value: userPool.userPoolId })
    new CfnOutput(this, "user-pool-client-id", { value: userPoolClient.userPoolClientId })

    this.userPool = userPool

    const userTable = new dynamodb.Table(this, "UserTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      // Only for development
      removalPolicy: RemovalPolicy.DESTROY,
    })

    const preSignUpTrigger = new nodejs.NodejsFunction(this, "PreSignUpTrigger", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../src/pre-sign-up-trigger.ts"),
      handler: "handler",
      architecture: lambda.Architecture.X86_64,
      logRetention: logs.RetentionDays.ONE_MONTH,
      environment: {
        USER_TABLE_NAME: userTable.tableName,
      },
      description: "Updated at: 2024-03-11T08:17:54.765Z",
    })
    userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpTrigger)
    userTable.grantWriteData(preSignUpTrigger)

    const signUpStreamsHandler = new nodejs.NodejsFunction(this, "SignUpStreamsHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../src/sign-up-streams-handler.ts"),
      handler: "handler",
      architecture: lambda.Architecture.X86_64,
      logRetention: logs.RetentionDays.ONE_MONTH,
      environment: {
        USER_POOL_ID: userPool.userPoolId,
      },
      description: "Updated at: 2024-03-11T08:17:54.765Z",
    })
    userPool.grant(signUpStreamsHandler, "cognito-idp:AdminUpdateUserAttributes")
    userTable.grantStreamRead(signUpStreamsHandler)
    const dynamoEventSource = new eventSources.DynamoEventSource(userTable, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 1,
      retryAttempts: 3,
      filters: [
        lambda.FilterCriteria.filter({
          eventName: lambda.FilterRule.isEqual("INSERT"),
          dynamodb: {
            NewImage: {
              user_id: {
                S: lambda.FilterRule.exists(),
              },
              tenant_id: {
                S: lambda.FilterRule.exists(),
              },
            },
          },
        }),
      ],
    })
    signUpStreamsHandler.addEventSource(dynamoEventSource)
  }
}
