require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const pool = require('./src/config/db');
const openapiSpec = require('./src/docs/openapi');

const petsRouter = require('./src/routes/pets.routes');

const speciesRouter = require('./src/routes/species.routes');

const weightsRouter = require('./src/routes/weights.routes');
const vetVisitsRouter = require('./src/routes/vetVisits.routes');
const vaccinationsRouter = require('./src/routes/vaccinations.routes');
const remindersRouter = require('./src/routes/reminders.routes');


const app = express();
app.use(cors());
app.use(express.json());

// T29: API documentation (Swagger UI) at /api-docs, raw OpenAPI JSON at /api-docs.json
app.get('/api-docs.json', (req, res) => res.json(openapiSpec));
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'PetCare API Docs',
    swaggerOptions: { persistAuthorization: true },
  })
);

app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/users', require('./src/routes/users.routes'));

app.use('/api/pets', petsRouter);


app.use('/api/species', speciesRouter);

app.use('/api/pets', weightsRouter);
app.use('/api/pets', vetVisitsRouter);

// T18: vaccine types + vaccination history (paths are written inside the router)
app.use('/api', vaccinationsRouter);

// T20: vaccination reminders
app.use('/api/reminders', remindersRouter);

app.get('/', (req, res) => res.json({ message: 'API is running' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ message: 'Database connected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Xử lý lỗi chung
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));