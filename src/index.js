import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

// GET endpoint
fastify.get('/api/greet', async (request, reply) => {
    return { message: 'Hello from Fastify with ES6!' };
});



// POST endpoint with schema validation
fastify.post('/api/users', {
    schema: {
        body: {
            type: 'object',
            required: ['name', 'email'],
            properties: {
                name: { type: 'string' },
                email: { type: 'string', format: 'email' }
            }
        }
    }
}, async (request, reply) => {
    const { name, email } = request.body;

    return reply.code(201).send({
        status: 'success',
        data: { name, email }
    });
});



// POST endpoint with schema validation
fastify.post('/api/users', {
    schema: {
        body: {
            type: 'object',
            required: ['name', 'email'],
            properties: {
                name: { type: 'string' },
                email: { type: 'string', format: 'email' }
            }
        }
    }
}, async (request, reply) => {
    const { name, email } = request.body;

    return reply.code(201).send({
        status: 'success',
        data: { name, email }
    });
});

// Top-level await is fully supported in ES6 modules
try {
    await fastify.listen({ port: 3000 });
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}