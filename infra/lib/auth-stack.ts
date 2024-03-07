import * as path from "path"
import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs"
import * as logs from "aws-cdk-lib/aws-logs"
import * as sqs from "aws-cdk-lib/aws-sqs"
import * as destinations from "aws-cdk-lib/aws-lambda-destinations"
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
        userId: new cognito.StringAttribute({ minLen: 12, maxLen: 48, mutable: false }),
        tenantId: new cognito.StringAttribute({ minLen: 12, maxLen: 48, mutable: false }),
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

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", { userPool })

    new CfnOutput(this, "user-pool-id", { value: userPool.userPoolId })
    new CfnOutput(this, "user-pool-client-id", { value: userPoolClient.userPoolClientId })

    this.userPool = userPool

    const deadLetterQueue = new sqs.Queue(this, "DeadLetterQueue")
    const preSignUpLambda = new nodejs.NodejsFunction(this, "PreSignUpLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, "../src/post-confirmation-trigger.ts"),
      handler: "handler",
      logRetention: logs.RetentionDays.ONE_MONTH,
      onFailure: new destinations.SqsDestination(deadLetterQueue)
    })

    userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, preSignUpLambda)
  }
}


