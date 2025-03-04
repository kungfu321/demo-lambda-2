import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import { Page, Layout, Card, Text, BlockStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { id } = params;

  try {
    const response = await admin.graphql(
      `query GetMetaobject($id: ID!) {
        metaobject(id: $id) {
          id
          handle
          type
          fields {
            key
            value
            type
            definition {
              name
              type
            }
          }
          updatedAt
          createdAt
        }
      }`,
      {
        variables: {
          id: `gid://shopify/Metaobject/${id}`,
        },
      }
    );

    const { data } = await response.json();
    return Response.json({ metaobject: data.metaobject });
  } catch (error) {
    return Response.json(
      { error: `Failed to load metaobject: ${error}` },
      { status: 500 }
    );
  }
};

export default function MetaobjectDetail() {
  const { metaobject, error } = useLoaderData<typeof loader>();
  const { handle } = useParams();

  if (error) {
    return (
      <Page>
        <Text variant="bodyMd" as="p" tone="critical">
          {error}
        </Text>
      </Page>
    );
  }

  return (
    <Page
      title={`${metaobject.handle}`}
      backAction={{
        content: "Back",
        url: `/app/cms/${handle}`,
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h3" variant="headingLg">
                  Details
                </Text>
                <Text as="p" variant="bodyMd">
                  Type: {metaobject.type}
                </Text>
                <Text as="p" variant="bodyMd">
                  Created: {new Date(metaobject.createdAt).toLocaleString()}
                </Text>
                <Text as="p" variant="bodyMd">
                  Updated: {new Date(metaobject.updatedAt).toLocaleString()}
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  Fields
                </Text>
                {metaobject.fields.map((field) => (
                  <Card key={field.key}>
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm">
                        {field.definition.name}
                      </Text>
                      <Text as="p" variant="bodyMd">
                        Type: {field.definition.type}
                      </Text>
                      <Text as="p" variant="bodyMd">
                        Value: {field.value}
                      </Text>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
