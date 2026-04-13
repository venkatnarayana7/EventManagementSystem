import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as path from "node:path";
import { Construct } from "constructs";
import { resourceName } from "../config/naming";

interface StorageStackProps extends cdk.StackProps {
  envName: string;
}

export class StorageStack extends cdk.Stack {
  public readonly mediaBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const adminFrontendAssetPath = path.resolve(__dirname, "../../../frontend/admin/site");

    const portalBucketProps: s3.BucketProps = {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false
    };

    const adminFrontendBucket = new s3.Bucket(this, "AdminFrontendBucket", {
      ...portalBucketProps,
      bucketName: resourceName(props.envName, "frontend-admin")
    });

    new s3.Bucket(this, "TeacherFrontendBucket", {
      ...portalBucketProps,
      bucketName: resourceName(props.envName, "frontend-teacher")
    });

    new s3.Bucket(this, "StudentFrontendBucket", {
      ...portalBucketProps,
      bucketName: resourceName(props.envName, "frontend-student")
    });

    this.mediaBucket = new s3.Bucket(this, "MediaBucket", {
      bucketName: resourceName(props.envName, "media-uploads"),
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.HEAD],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"]
        }
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false
    });

    const adminFrontendOai = new cloudfront.OriginAccessIdentity(this, "AdminFrontendOai");
    adminFrontendBucket.grantRead(adminFrontendOai);

    const adminDistribution = new cloudfront.Distribution(this, "AdminFrontendDistribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(adminFrontendBucket, {
          originAccessIdentity: adminFrontendOai
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      }
    });

    new s3deploy.BucketDeployment(this, "AdminFrontendDeployment", {
      sources: [s3deploy.Source.asset(adminFrontendAssetPath)],
      destinationBucket: adminFrontendBucket,
      distribution: adminDistribution,
      distributionPaths: ["/*"]
    });

    const mediaOai = new cloudfront.OriginAccessIdentity(this, "MediaOai");
    this.mediaBucket.grantRead(mediaOai);

    const distribution = new cloudfront.Distribution(this, "MediaDistribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.mediaBucket, {
          originAccessIdentity: mediaOai
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      }
    });

    new cdk.CfnOutput(this, "MediaBucketName", {
      value: this.mediaBucket.bucketName
    });

    new cdk.CfnOutput(this, "AdminFrontendBucketName", {
      value: adminFrontendBucket.bucketName
    });

    new cdk.CfnOutput(this, "AdminFrontendUrl", {
      value: `https://${adminDistribution.domainName}`
    });

    new cdk.CfnOutput(this, "MediaDistributionDomainName", {
      value: distribution.domainName
    });
  }
}
