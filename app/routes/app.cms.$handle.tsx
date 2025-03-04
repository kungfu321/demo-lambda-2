import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useParams, useNavigate } from "@remix-run/react";
import { Page, Layout, Card, Text, DataTable, Link, Button } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

interface MetaobjectField {
  key: string;
  value: string;
  type: string;
}

interface FieldDefinition {
  key: string;
  name: string;
}

interface Metaobject {
  id: string;
  handle: string;
  type: string;
  fields: MetaobjectField[];
}

interface GraphQLResponse {
  data: {
    metaobjects: {
      nodes: Array<{
        id?: string;
        handle?: string;
        type?: string;
        fields: MetaobjectField[];
      }>;
    };
    metaobjectDefinitionByType: {
      fieldDefinitions: FieldDefinition[];
    };
  };
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { handle } = params;
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');

  try {
    const response = await admin.graphql(
      `query GetMetaobjects($type: String!, $cursor: String) {
        metaobjects(type: $type, first: 10, after: $cursor) {
          nodes {
            fields {
              key
              value
              type
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
        metaobjectDefinitionByType(type: $type) {
          fieldDefinitions {
            key
            name
          }
        }
      }`,
      {
        variables: {
          type: handle,
          cursor: cursor || null,
        },
      }
    );

    const { data } = (await response.json()) as GraphQLResponse;
    const fieldDefinitions = data.metaobjectDefinitionByType.fieldDefinitions;
    const metaobjects = data.metaobjects.nodes.map(node => ({
      ...node,
      id: node.id || '',
      handle: node.handle || '',
      type: node.type || ''
    }));
    const pageInfo = data.metaobjects.pageInfo;
    return Response.json({ metaobjects, fieldDefinitions, pageInfo });
  } catch (error) {
    return Response.json(
      { metaobjects: [], error: `Failed to load metaobjects: ${error}` },
      { status: 500 }
    );
  }
};

export default function MetaobjectList() {
  const { metaobjects, fieldDefinitions, pageInfo, error } = useLoaderData<typeof loader>();
  const { handle } = useParams();
  const navigate = useNavigate();

  if (error) {
    return (
      <Page>
        <Text variant="bodyMd" as="p" tone="critical">
          {error}
        </Text>
      </Page>
    );
  }

  const rows = metaobjects.map(metaobject => {
    return fieldDefinitions.map(def => {
      const field = metaobject.fields.find(f => f.key === def.key);
      return field ? field.value : '';
    });
  });

  const handleNextPage = () => {
    if (pageInfo.hasNextPage) {
      navigate(`/app/cms/${handle}?cursor=${pageInfo.endCursor}`);
    }
  };

  return (
    <Page title={`${handle} Metaobjects`} fullWidth>
      <Layout>
        <Layout.Section>
          <Card>
            {metaobjects.length === 0 ? (
              <Text as="p" variant="bodyMd">
                No metaobjects found for type: {handle}
              </Text>
            ) : (
              <>
                <DataTable
                  columnContentTypes={fieldDefinitions.map(() => 'text')}
                  headings={fieldDefinitions.map((def: FieldDefinition) => def.name)}
                  rows={rows}
                />
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <Button
                    onClick={handleNextPage}
                    disabled={!pageInfo.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
