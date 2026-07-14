/**
 * Hand-authored OpenAPI 3.0 description of the Tracer API. Served as raw JSON at
 * /openapi.json and rendered by Swagger UI at /docs. Kept representative rather
 * than exhaustive — the core resources and auth flows.
 */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Tracer API',
    version: '1.0.0',
    description:
      'Multi-tenant issue tracker API. Auth uses a JWT in an HTTP-only cookie ' +
      '(`tracer_token`); send credentialed requests. RBAC: owner > admin > member.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local' }],
  tags: [
    { name: 'Auth' },
    { name: 'Organizations' },
    { name: 'Projects' },
    { name: 'Issues' },
    { name: 'Comments' },
    { name: 'Notifications' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'tracer_token' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
          emailVerified: { type: 'boolean' },
        },
      },
      Org: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          role: { type: 'string', enum: ['owner', 'admin', 'member'] },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          key: { type: 'string', example: 'TRC' },
          description: { type: 'string', nullable: true },
        },
      },
      Issue: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          identifier: { type: 'string', example: 'TRC-14' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'done', 'cancelled'],
          },
          priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
          assigneeId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          body: { type: 'string' },
          authorId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Auth'],
        summary: 'Health check',
        security: [],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account (sets session cookie)',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'name', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  name: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '409': {
            description: 'Email already exists',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in (sets session cookie)',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' }, '401': { description: 'Invalid credentials' } },
      },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Log out', responses: { '200': { description: 'OK' } } },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          '401': { description: 'Unauthenticated' },
        },
      },
    },
    '/orgs': {
      get: {
        tags: ['Organizations'],
        summary: "List the caller's organizations",
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Organizations'],
        summary: 'Create an organization (creator becomes owner)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/orgs/{orgId}/projects': {
      parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        tags: ['Projects'],
        summary: 'List projects (member+)',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a project (admin+)',
        responses: { '201': { description: 'Created' }, '403': { description: 'Forbidden' } },
      },
    },
    '/projects/{projectId}/issues': {
      parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        tags: ['Issues'],
        summary: 'List issues (filter: status, priority, assignee; paginated)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'assignee', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'offset', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Issues'],
        summary: 'Create an issue (member+); assigns a sequential per-project identifier',
        responses: { '201': { description: 'Created' } },
      },
    },
    '/issues/{issueId}': {
      parameters: [{ name: 'issueId', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        tags: ['Issues'],
        summary: 'Get an issue with project/assignee/reporter',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { issue: { $ref: '#/components/schemas/Issue' } },
                },
              },
            },
          },
          '404': { description: 'Not found' },
        },
      },
      patch: { tags: ['Issues'], summary: 'Update an issue (member+)', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Issues'], summary: 'Delete an issue (member+)', responses: { '204': { description: 'Deleted' } } },
    },
    '/issues/{issueId}/comments': {
      parameters: [{ name: 'issueId', in: 'path', required: true, schema: { type: 'string' } }],
      get: { tags: ['Comments'], summary: 'List comments', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Comments'], summary: 'Add a comment', responses: { '201': { description: 'Created' } } },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications + unread count',
        responses: { '200': { description: 'OK' } },
      },
    },
  },
} as const;
