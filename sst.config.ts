/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "demo-lambda-2",
      // removal: input?.stage === "production" ? "retain" : "remove",
      // protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: "ap-southeast-1",
        }
      }
    };
  },
  async run() {
    const table = new sst.aws.Dynamo("SessionTable", {
      fields: {
        id: "string",
        shop: "string",
        scope: "string",
        accessToken: "string",
      },
      primaryIndex: { hashKey: "id" },
      globalIndexes: {
        byShop: { hashKey: "shop" },
        byAccessToken: { hashKey: "accessToken" },
        byScope: { hashKey: "scope" },
      }
    });
    new sst.aws.Remix("MyWeb", {
      link: [table],
      environment: {
        SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY!,
        SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET!,
        SCOPES: process.env.SCOPES!,
        SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL!,
      }
    });
  },
});
