// T29: OpenAPI 3.0 description of the PetCare REST API.
// Served as Swagger UI at /api-docs and as raw JSON at /api-docs.json.
// Keep this file in step with the routes in src/routes when an endpoint changes.

const errorResponse = (description, example) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { message: example },
    },
  },
});

const jsonBody = (schemaRef, example, required = true) => ({
  required,
  content: {
    'application/json': {
      schema: { $ref: `#/components/schemas/${schemaRef}` },
      ...(example ? { example } : {}),
    },
  },
});

const jsonResponse = (description, schema, example) => ({
  description,
  content: {
    'application/json': {
      schema,
      ...(example ? { example } : {}),
    },
  },
});

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const auth = [{ bearerAuth: [] }];

const R401 = errorResponse(
  'Missing, invalid or expired token',
  'Authentication required'
);
const R500 = errorResponse('Unexpected server error', 'Internal server error');

const petIdParam = {
  name: 'petId',
  in: 'path',
  required: true,
  description: 'ID of a pet that belongs to the logged-in user',
  schema: { type: 'integer', minimum: 1, example: 1 },
};

const idParam = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'integer', minimum: 1, example: 1 },
});

const notFoundPet = errorResponse(
  "Pet does not exist, is deleted, or belongs to another user (all answer 404 so other people's data is never revealed)",
  'Pet not found'
);

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'PetCare API',
    version: '1.0.0',
    description: [
      'REST API for the PetCare pet health book: pets, weight history, vet visits,',
      'vaccination history and vaccination reminders.',
      '',
      '**How to try it**',
      '1. Call `POST /api/auth/login` (demo account: `demo@petcare.com`, ask the team for the password) or `POST /api/auth/register`.',
      '2. Copy the `token` from the response.',
      '3. Press the **Authorize** button at the top right, paste the token (without the word `Bearer`) and confirm.',
      '4. Every endpoint with a padlock icon now works from the **Try it out** button.',
      '',
      '**Conventions**',
      '- Requests and responses are JSON. Dates are `YYYY-MM-DD` unless stated otherwise.',
      '- Protected endpoints need the header `Authorization: Bearer <token>`. The token is valid for 7 days.',
      '- Errors always look like `{ "message": "..." }`.',
      "- Ownership rule: a pet, weight record, visit or vaccination of another user answers **404**, exactly like one that does not exist.",
      '- Deleting a pet is a soft delete: it disappears from every list but the row is kept.',
      '- Decimal columns (`weight_kg`, `cost`) are returned as strings such as `"4.20"` to keep their exact value.',
    ].join('\n'),
  },
  servers: [
    {
      url: '/',
      description: 'Same server that is showing this page (works locally and online)',
    },
    {
      url: 'https://petcare-project-et4v.onrender.com',
      description: 'Production API on Render',
    },
  ],
  tags: [
    { name: 'System', description: 'Service status' },
    { name: 'Auth', description: 'Register and log in' },
    { name: 'Users', description: 'Profile of the logged-in user' },
    { name: 'Species', description: 'Pet species (public)' },
    { name: 'Pets', description: 'Pet profiles' },
    { name: 'Weights', description: 'Weight history of a pet' },
    { name: 'Vet visits', description: 'Veterinary visit history of a pet' },
    {
      name: 'Vaccinations',
      description: 'Vaccine types and the vaccination history of a pet',
    },
    {
      name: 'Reminders',
      description: 'Vaccinations that are overdue or due soon',
    },
  ],
  paths: {
    '/': {
      get: {
        tags: ['System'],
        summary: 'Check that the API is running',
        responses: {
          200: jsonResponse('API is up', {
            type: 'object',
            properties: { message: { type: 'string' } },
          }, { message: 'API is running' }),
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Check the database connection',
        responses: {
          200: jsonResponse('Database reachable', {
            type: 'object',
            properties: { message: { type: 'string' } },
          }, { message: 'Database connected' }),
          500: errorResponse('Database not reachable', 'Database connection failed'),
        },
      },
    },

    // ---------------------------------------------------------------- Auth
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account',
        description:
          'Creates a user with role `USER` and signs the user in (returns a token).',
        requestBody: jsonBody('RegisterRequest', {
          name: 'Bao Phan',
          email: 'bao@example.com',
          password: 'at-least-8-chars',
        }),
        responses: {
          201: jsonResponse('Account created', ref('AuthResponse')),
          400: errorResponse(
            'Missing name, invalid email, or password shorter than 8 characters',
            'Password must be at least 8 characters'
          ),
          409: errorResponse('Email already registered', 'Email already in use'),
          500: R500,
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        requestBody: jsonBody('LoginRequest', {
          email: 'demo@petcare.com',
          password: 'your-password',
        }),
        responses: {
          200: jsonResponse('Logged in', ref('AuthResponse')),
          400: errorResponse(
            'Email or password missing',
            'Email and password are required'
          ),
          401: errorResponse(
            'Wrong email or wrong password (same message on purpose)',
            'Invalid email or password'
          ),
          403: errorResponse('Account was banned by an admin', 'Account is banned'),
          500: R500,
        },
      },
    },

    // --------------------------------------------------------------- Users
    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get my profile',
        security: auth,
        responses: {
          200: jsonResponse('Profile', ref('UserProfile')),
          401: R401,
          404: errorResponse('User no longer exists', 'User not found'),
          500: R500,
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update my profile',
        description:
          'Send at least one field. Email and role cannot be changed here.',
        security: auth,
        requestBody: jsonBody('UpdateProfileRequest', {
          name: 'Bao Phan',
          remind_before_days: 14,
        }),
        responses: {
          200: jsonResponse('Updated profile', ref('UserProfile')),
          400: errorResponse(
            'Name not 1 to 100 characters, remind_before_days not a whole number 1 to 365, or nothing to update',
            'remind_before_days must be a whole number from 1 to 365'
          ),
          401: R401,
          404: errorResponse('User no longer exists', 'User not found'),
          500: R500,
        },
      },
    },

    // ------------------------------------------------------------- Species
    '/api/species': {
      get: {
        tags: ['Species'],
        summary: 'List pet species',
        description: 'Public. Sorted by name.',
        responses: {
          200: jsonResponse(
            'Species list',
            { type: 'array', items: ref('Species') },
            [
              { id: 2, name: 'Cat' },
              { id: 1, name: 'Dog' },
              { id: 3, name: 'Rabbit' },
            ]
          ),
          500: R500,
        },
      },
    },

    // ---------------------------------------------------------------- Pets
    '/api/pets': {
      get: {
        tags: ['Pets'],
        summary: 'List my pets',
        description: 'Only active pets of the logged-in user, newest first.',
        security: auth,
        responses: {
          200: jsonResponse('Pets', { type: 'array', items: ref('Pet') }),
          401: R401,
          500: R500,
        },
      },
      post: {
        tags: ['Pets'],
        summary: 'Add a pet',
        security: auth,
        requestBody: jsonBody('PetInput', {
          name: 'Milo',
          species_id: 1,
          breed: 'Poodle',
          gender: 'MALE',
          birth_date: '2023-05-12',
          color: 'Brown',
          note: 'Friendly and active',
        }),
        responses: {
          201: jsonResponse(
            'Pet created',
            {
              type: 'object',
              properties: {
                message: { type: 'string' },
                id: { type: 'integer', description: 'ID of the new pet' },
              },
            },
            { message: 'Pet created successfully', id: 4 }
          ),
          400: errorResponse(
            'Missing name or species_id, invalid gender, text too long, or birth_date not YYYY-MM-DD',
            'Valid name and species_id are required'
          ),
          401: R401,
          500: R500,
        },
      },
    },
    '/api/pets/{id}': {
      get: {
        tags: ['Pets'],
        summary: 'Get one pet',
        security: auth,
        parameters: [idParam('id', 'Pet ID')],
        responses: {
          200: jsonResponse('Pet', ref('Pet')),
          400: errorResponse('ID is not a positive integer', 'Invalid pet ID'),
          401: R401,
          404: notFoundPet,
          500: R500,
        },
      },
      put: {
        tags: ['Pets'],
        summary: 'Replace the details of a pet',
        description:
          'Full update: `name` and `species_id` are required, optional fields you leave out are set to `null` (`gender` falls back to `UNKNOWN`).',
        security: auth,
        parameters: [idParam('id', 'Pet ID')],
        requestBody: jsonBody('PetInput', {
          name: 'Milo',
          species_id: 1,
          breed: 'Poodle',
          gender: 'MALE',
          birth_date: '2023-05-12',
          color: 'Brown',
          note: 'Now 5 kg',
        }),
        responses: {
          200: jsonResponse(
            'Pet updated',
            { type: 'object', properties: { message: { type: 'string' } } },
            { message: 'Pet updated successfully' }
          ),
          400: errorResponse(
            'Invalid ID, name, species_id, gender, text field or birth_date',
            'Invalid gender'
          ),
          401: R401,
          404: notFoundPet,
          500: R500,
        },
      },
      delete: {
        tags: ['Pets'],
        summary: 'Delete a pet (soft delete)',
        description:
          'The pet is hidden from every list and its reminders stop. The data is kept.',
        security: auth,
        parameters: [idParam('id', 'Pet ID')],
        responses: {
          200: jsonResponse(
            'Pet deleted',
            { type: 'object', properties: { message: { type: 'string' } } },
            { message: 'Pet deleted successfully' }
          ),
          400: errorResponse('ID is not a positive integer', 'Invalid pet ID'),
          401: R401,
          404: notFoundPet,
          500: R500,
        },
      },
    },

    // ------------------------------------------------------------- Weights
    '/api/pets/{petId}/weights': {
      get: {
        tags: ['Weights'],
        summary: 'Weight history of a pet',
        description: 'Newest measurement first.',
        security: auth,
        parameters: [petIdParam],
        responses: {
          200: jsonResponse('Weight history', {
            type: 'object',
            properties: {
              message: { type: 'string' },
              data: { type: 'array', items: ref('WeightLog') },
            },
          }),
          400: errorResponse('Pet ID is not a positive integer', 'Invalid pet ID.'),
          401: R401,
          404: notFoundPet,
        },
      },
      post: {
        tags: ['Weights'],
        summary: 'Add a weight measurement',
        description:
          'Only one measurement is allowed per pet at the same date and time.',
        security: auth,
        parameters: [petIdParam],
        requestBody: jsonBody('WeightInput', {
          weight_kg: 4.7,
          measured_at: '2026-10-01 09:00',
          note: 'Monthly weight check',
        }),
        responses: {
          201: jsonResponse('Measurement saved', {
            type: 'object',
            properties: {
              message: { type: 'string' },
              data: ref('WeightLog'),
            },
          }),
          400: errorResponse(
            'weight_kg not a positive number with at most 2 decimals, invalid measured_at, or note too long',
            'Weight must be a positive number with up to 2 decimal places.'
          ),
          401: R401,
          404: notFoundPet,
          409: errorResponse(
            'There is already a measurement at this date and time',
            'A weight record already exists at this date and time.'
          ),
        },
      },
    },
    '/api/pets/{petId}/weights/{weightId}': {
      put: {
        tags: ['Weights'],
        summary: 'Update a weight measurement',
        security: auth,
        parameters: [petIdParam, idParam('weightId', 'Weight record ID')],
        requestBody: jsonBody('WeightInput', {
          weight_kg: 4.8,
          measured_at: '2026-10-01 09:00',
          note: 'Corrected',
        }),
        responses: {
          200: jsonResponse('Measurement updated', {
            type: 'object',
            properties: {
              message: { type: 'string' },
              data: ref('WeightLog'),
            },
          }),
          400: errorResponse('Invalid ID or invalid body', 'Invalid weight record ID.'),
          401: R401,
          404: errorResponse(
            'Pet or weight record not found',
            'Weight record not found.'
          ),
          409: errorResponse(
            'There is already a measurement at this date and time',
            'A weight record already exists at this date and time.'
          ),
        },
      },
      delete: {
        tags: ['Weights'],
        summary: 'Delete a weight measurement',
        security: auth,
        parameters: [petIdParam, idParam('weightId', 'Weight record ID')],
        responses: {
          200: jsonResponse(
            'Deleted',
            { type: 'object', properties: { message: { type: 'string' } } },
            { message: 'Weight record deleted successfully.' }
          ),
          400: errorResponse('Invalid ID', 'Invalid weight record ID.'),
          401: R401,
          404: errorResponse(
            'Pet or weight record not found',
            'Weight record not found.'
          ),
        },
      },
    },

    // ----------------------------------------------------------- Vet visits
    '/api/pets/{petId}/visits': {
      get: {
        tags: ['Vet visits'],
        summary: 'Vet visit history of a pet',
        description: 'Newest visit first.',
        security: auth,
        parameters: [petIdParam],
        responses: {
          200: jsonResponse('Visits', { type: 'array', items: ref('VetVisit') }),
          400: errorResponse('Pet ID is not a positive integer', 'Invalid pet ID'),
          401: R401,
          404: notFoundPet,
        },
      },
      post: {
        tags: ['Vet visits'],
        summary: 'Add a vet visit',
        security: auth,
        parameters: [petIdParam],
        requestBody: jsonBody('VetVisitInput', {
          visit_date: '2026-07-10',
          clinic: 'PetCare Demo Clinic',
          reason: 'Routine health check',
          diagnosis: 'Healthy',
          cost: 250000,
          note: 'Annual checkup',
        }),
        responses: {
          201: jsonResponse(
            'Visit created',
            {
              type: 'object',
              properties: {
                message: { type: 'string' },
                id: { type: 'integer' },
              },
            },
            { message: 'Veterinary visit created', id: 7 }
          ),
          400: errorResponse(
            'Invalid visit_date, invalid cost, or a text field that is too long',
            'A valid visit_date (YYYY-MM-DD) is required'
          ),
          401: R401,
          404: notFoundPet,
        },
      },
    },
    '/api/pets/{petId}/visits/{visitId}': {
      delete: {
        tags: ['Vet visits'],
        summary: 'Delete a vet visit',
        security: auth,
        parameters: [petIdParam, idParam('visitId', 'Visit ID')],
        responses: {
          200: jsonResponse(
            'Deleted',
            { type: 'object', properties: { message: { type: 'string' } } },
            { message: 'Veterinary visit deleted' }
          ),
          400: errorResponse('Invalid ID', 'Invalid visit ID'),
          401: R401,
          404: errorResponse('Pet or visit not found', 'Visit not found'),
        },
      },
    },

    // ---------------------------------------------------------- Vaccinations
    '/api/vaccine-types': {
      get: {
        tags: ['Vaccinations'],
        summary: 'List vaccine types',
        description:
          'Active vaccine types, optionally only the ones for one species.',
        security: auth,
        parameters: [
          {
            name: 'speciesId',
            in: 'query',
            required: false,
            description: 'Only vaccine types of this species',
            schema: { type: 'integer', minimum: 1, example: 1 },
          },
        ],
        responses: {
          200: jsonResponse('Vaccine types', {
            type: 'array',
            items: ref('VaccineType'),
          }),
          400: errorResponse('speciesId is not a positive integer', 'Invalid speciesId'),
          401: R401,
        },
      },
    },
    '/api/pets/{petId}/vaccinations': {
      get: {
        tags: ['Vaccinations'],
        summary: 'Vaccination history of a pet',
        description: 'Newest dose first.',
        security: auth,
        parameters: [petIdParam],
        responses: {
          200: jsonResponse('Vaccinations', {
            type: 'array',
            items: ref('Vaccination'),
          }),
          400: errorResponse('Pet ID is not a positive integer', 'Invalid pet ID'),
          401: R401,
          404: notFoundPet,
        },
      },
      post: {
        tags: ['Vaccinations'],
        summary: 'Record a vaccination',
        description: [
          'Rules:',
          '- `vaccine_type_id` must be an active vaccine type of the **same species** as the pet.',
          '- `given_date` must be a real date and cannot be in the future.',
          '- If `next_due_date` is left out, it is calculated as `given_date + interval_days` of the vaccine type.',
          '- A manual `next_due_date` cannot be before `given_date`.',
        ].join('\n'),
        security: auth,
        parameters: [petIdParam],
        requestBody: jsonBody('VaccinationInput', {
          vaccine_type_id: 4,
          given_date: '2026-05-15',
          clinic: 'PetCare Demo Clinic',
          note: 'First dose',
        }),
        responses: {
          201: jsonResponse('Vaccination created', {
            type: 'object',
            properties: {
              message: { type: 'string' },
              data: ref('Vaccination'),
            },
          }),
          400: errorResponse(
            'Invalid input, for example the vaccine is for another species or given_date is in the future',
            'This vaccine type is not for this pet species'
          ),
          401: R401,
          404: notFoundPet,
        },
      },
    },
    '/api/vaccinations/{id}': {
      put: {
        tags: ['Vaccinations'],
        summary: 'Update a vaccination',
        description: 'Same body and rules as recording a vaccination.',
        security: auth,
        parameters: [idParam('id', 'Vaccination ID')],
        requestBody: jsonBody('VaccinationInput', {
          vaccine_type_id: 4,
          given_date: '2026-05-16',
          next_due_date: '2027-05-16',
          clinic: 'PetCare Demo Clinic',
        }),
        responses: {
          200: jsonResponse('Vaccination updated', {
            type: 'object',
            properties: {
              message: { type: 'string' },
              data: ref('Vaccination'),
            },
          }),
          400: errorResponse('Invalid ID or invalid body', 'next_due_date cannot be before given_date'),
          401: R401,
          404: errorResponse(
            'Vaccination does not exist or belongs to another user',
            'Vaccination not found'
          ),
        },
      },
      delete: {
        tags: ['Vaccinations'],
        summary: 'Delete a vaccination',
        security: auth,
        parameters: [idParam('id', 'Vaccination ID')],
        responses: {
          200: jsonResponse(
            'Deleted',
            { type: 'object', properties: { message: { type: 'string' } } },
            { message: 'Vaccination deleted' }
          ),
          400: errorResponse('ID is not a positive integer', 'Invalid vaccination ID'),
          401: R401,
          404: errorResponse(
            'Vaccination does not exist or belongs to another user',
            'Vaccination not found'
          ),
        },
      },
    },

    // ------------------------------------------------------------ Reminders
    '/api/reminders/upcoming': {
      get: {
        tags: ['Reminders'],
        summary: 'Vaccination reminders for all my pets',
        description: [
          'Groups the vaccinations of all my active pets by urgency.',
          '- `OVERDUE`: `next_due_date` is before today.',
          '- `DUE_SOON`: due today or within the reminder window.',
          '- `LATER`: due after the window.',
          '',
          'Only the **latest dose** of each (pet, vaccine type) counts, so an old dose is not reminded again after the pet was vaccinated again.',
          'The window is `days` if given, otherwise the `remind_before_days` of my profile.',
        ].join('\n'),
        security: auth,
        parameters: [
          {
            name: 'days',
            in: 'query',
            required: false,
            description: 'Reminder window in days (1 to 365)',
            schema: { type: 'integer', minimum: 1, maximum: 365, example: 30 },
          },
        ],
        responses: {
          200: jsonResponse('Reminders', ref('RemindersResponse')),
          400: errorResponse(
            'days is not a whole number from 1 to 365',
            'days must be a whole number from 1 to 365'
          ),
          401: R401,
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Paste the `token` returned by login or register. The token is valid for 7 days.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Bao Phan' },
          email: { type: 'string', format: 'email', example: 'bao@example.com' },
          password: { type: 'string', minLength: 8 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'demo@petcare.com' },
          password: { type: 'string' },
        },
      },
      AuthUser: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Demo User' },
          email: { type: 'string', example: 'demo@petcare.com' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT, send it as a Bearer token' },
          user: ref('AuthUser'),
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Demo User' },
          email: { type: 'string', example: 'demo@petcare.com' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
          remind_before_days: {
            type: 'integer',
            description: 'How many days before a due date the reminders start',
            example: 7,
          },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        description: 'At least one field is required',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          remind_before_days: { type: 'integer', minimum: 1, maximum: 365 },
        },
      },
      Species: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Dog' },
        },
      },
      Pet: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 4 },
          name: { type: 'string', example: 'Milo' },
          species_id: { type: 'integer', example: 1 },
          breed: { type: 'string', nullable: true, example: 'Poodle' },
          gender: { type: 'string', enum: ['MALE', 'FEMALE', 'UNKNOWN'] },
          birth_date: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Returned as an ISO timestamp, the date part is the birth date',
            example: '2023-05-12T00:00:00.000Z',
          },
          color: { type: 'string', nullable: true, example: 'Brown' },
          avatar_url: { type: 'string', nullable: true },
          note: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      PetInput: {
        type: 'object',
        required: ['name', 'species_id'],
        properties: {
          name: { type: 'string', maxLength: 100, example: 'Milo' },
          species_id: {
            type: 'integer',
            minimum: 1,
            description: 'ID from GET /api/species',
            example: 1,
          },
          gender: {
            type: 'string',
            enum: ['MALE', 'FEMALE', 'UNKNOWN'],
            default: 'UNKNOWN',
          },
          breed: { type: 'string', maxLength: 100, nullable: true },
          birth_date: {
            type: 'string',
            format: 'date',
            nullable: true,
            example: '2023-05-12',
          },
          color: { type: 'string', maxLength: 100, nullable: true },
          avatar_url: { type: 'string', maxLength: 500, nullable: true },
          note: { type: 'string', maxLength: 5000, nullable: true },
        },
      },
      WeightLog: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          pet_id: { type: 'integer', example: 4 },
          weight_kg: {
            type: 'string',
            description: 'Decimal returned as a string',
            example: '4.70',
          },
          measured_at: {
            type: 'string',
            format: 'date-time',
            example: '2026-10-01T09:00:00.000Z',
          },
          note: { type: 'string', nullable: true },
        },
      },
      WeightInput: {
        type: 'object',
        required: ['weight_kg', 'measured_at'],
        properties: {
          weight_kg: {
            type: 'number',
            description: 'Greater than 0, at most 9999.99, up to 2 decimals',
            example: 4.7,
          },
          measured_at: {
            type: 'string',
            description: '`YYYY-MM-DD HH:mm` (seconds optional). A `T` instead of the space is accepted.',
            example: '2026-10-01 09:00',
          },
          note: { type: 'string', maxLength: 5000, nullable: true },
        },
      },
      VetVisit: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 7 },
          pet_id: { type: 'integer', example: 4 },
          visit_date: { type: 'string', format: 'date', example: '2026-07-10' },
          clinic: { type: 'string', nullable: true },
          reason: { type: 'string', nullable: true },
          diagnosis: { type: 'string', nullable: true },
          cost: {
            type: 'string',
            nullable: true,
            description: 'Decimal returned as a string',
            example: '250000.00',
          },
          note: { type: 'string', nullable: true },
        },
      },
      VetVisitInput: {
        type: 'object',
        required: ['visit_date'],
        properties: {
          visit_date: { type: 'string', format: 'date', example: '2026-07-10' },
          clinic: { type: 'string', maxLength: 255, nullable: true },
          reason: { type: 'string', nullable: true },
          diagnosis: { type: 'string', nullable: true },
          cost: {
            type: 'number',
            minimum: 0,
            maximum: 9999999999.99,
            nullable: true,
            description: 'Up to 2 decimals',
            example: 250000,
          },
          note: { type: 'string', nullable: true },
        },
      },
      VaccineType: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 4 },
          name: { type: 'string', example: 'Rabies - Dog' },
          species_id: { type: 'integer', example: 1 },
          interval_days: {
            type: 'integer',
            nullable: true,
            description: 'Days until the next dose',
            example: 365,
          },
          description: { type: 'string', nullable: true },
        },
      },
      Vaccination: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          pet_id: { type: 'integer', example: 4 },
          vaccine_type_id: { type: 'integer', example: 4 },
          vaccine_name: { type: 'string', example: 'Rabies - Dog' },
          given_date: { type: 'string', format: 'date', example: '2026-05-15' },
          next_due_date: {
            type: 'string',
            format: 'date',
            nullable: true,
            example: '2027-05-15',
          },
          clinic: { type: 'string', nullable: true },
          note: { type: 'string', nullable: true },
        },
      },
      VaccinationInput: {
        type: 'object',
        required: ['vaccine_type_id', 'given_date'],
        properties: {
          vaccine_type_id: {
            type: 'integer',
            minimum: 1,
            description: 'ID from GET /api/vaccine-types, must match the pet species',
            example: 4,
          },
          given_date: {
            type: 'string',
            format: 'date',
            description: 'Cannot be in the future',
            example: '2026-05-15',
          },
          next_due_date: {
            type: 'string',
            format: 'date',
            nullable: true,
            description:
              'Optional. Left out, it is given_date + interval_days. Cannot be before given_date.',
          },
          clinic: { type: 'string', maxLength: 255, nullable: true },
          note: { type: 'string', nullable: true },
        },
      },
      ReminderItem: {
        type: 'object',
        properties: {
          vaccination_id: { type: 'integer', example: 1 },
          pet_id: { type: 'integer', example: 4 },
          pet_name: { type: 'string', example: 'Milo' },
          vaccine_type_id: { type: 'integer', example: 4 },
          vaccine_name: { type: 'string', example: 'Rabies - Dog' },
          given_date: { type: 'string', format: 'date', example: '2025-11-10' },
          next_due_date: { type: 'string', format: 'date', example: '2026-11-10' },
          clinic: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['OVERDUE', 'DUE_SOON', 'LATER'] },
          days_until_due: {
            type: 'integer',
            description: 'Negative when overdue',
            example: -10,
          },
        },
      },
      RemindersResponse: {
        type: 'object',
        properties: {
          today: { type: 'string', format: 'date', example: '2026-11-20' },
          remind_before_days: { type: 'integer', example: 7 },
          summary: {
            type: 'object',
            properties: {
              overdue: { type: 'integer', example: 1 },
              due_soon: { type: 'integer', example: 0 },
              later: { type: 'integer', example: 2 },
              total: { type: 'integer', example: 3 },
            },
          },
          overdue: { type: 'array', items: ref('ReminderItem') },
          due_soon: { type: 'array', items: ref('ReminderItem') },
          later: { type: 'array', items: ref('ReminderItem') },
        },
      },
    },
  },
};

module.exports = openapi;
