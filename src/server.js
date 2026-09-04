import Fastify from 'fastify';

import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import { _h } from "helpers_jsonld"
import { MongoDB } from "helpers_mongodb"

import { runTests } from './testCases.js';


let URI = 'mongodb://tactik8:Temp4now@192.168.2.243:27017/?authMechanism=DEFAULT'


const fastify = Fastify({ trustProxy: true, logger: true });

// 1. Register Swagger plugin configured for OpenAPI 3.0
await fastify.register(fastifySwagger, {
    openapi: {
        info: {
            title: 'My Fastify API',
            description: 'Auto-generated OpenAPI Spec',
            version: '1.0.0'
        },
        servers: [{ url: 'http://localhost:3000' }]
    }
});

// 2. Register Swagger UI to serve the visual docs interface
await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs'
});



// POST endpoint with schema validation
fastify.get('/test', {}, async (request, reply) => {



    let baseUrl = `${request.protocol}://${request.headers.host}`;
    let databaseID = "unitTests"
    let tenantID = "unitTestApi"

    let result = await runTests(baseUrl, databaseID, tenantID)

    console.log(result)

    return reply.code(201).send(result);
});




// -----------------------------------------------------------------------------------------------
// Base 
// -----------------------------------------------------------------------------------------------

// GET endpoint accepting query parameters
fastify.get('/api/:databaseID/:tenantID', {
    schema: {
        summary: 'Search and paginate records',
        tags: ['Records'],
        querystring: {
            type: 'object',
            properties: {
                record_id: { type: 'string', description: 'Filter by specific record ID' },
                filter: { type: 'string', description: 'Search term for text filtering' },
                limit: { type: 'integer', minimum: 1, maximum: 100, default: 10, description: 'Number of results to return' },
                offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of results to skip' },
                orderBy: { type: 'string', enum: ['created_at', 'updated_at', 'name'], default: 'created_at' },
                orderDirection: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
            }
        }
    }
}, async (request, reply) => {
    // Fastify automatically parses and coerces types based on the schema above

    let { databaseID, tenantID } = request.params;

    let record_id = request?.query?.record_id
    let filter = request.query?.filter || {}
    let limit = request.query?.limit
    let offset = request.query?.offset
    let orderBy = request.query?.orderBy
    let orderDirection = request?.query?.orderDirection

    let keys = ['record_id', 'filter', 'limit', 'offset', 'orderBy', 'orderDirection']

    let q = { ...request.query}
    for(let k of Object.keys(q)){
        if(!keys.includes(k)){
            filter[k] = q[k]
        }
    }


    if (!databaseID) {
        return reply.code(400).send({
            status: 'failed',
            error: "missing databaseID"
        });
    }

    if (!tenantID) {
        return reply.code(400).send({
            status: 'failed',
            error: "missing tenantID"
        });
    }

    let db = await MongoDB.getDB(URI, databaseID, tenantID)

    if (record_id) {
        let action = await db.get(record_id)
        return reply.code(200).send(action?.result || {});
    }

    let action = await db.search(filter, orderBy, orderDirection, limit, offset)
    return reply.code(200).send(action?.result || {});

});

// POST record
fastify.post('/api/:databaseID/:tenantID', async (request, reply) => {

    let { databaseID, tenantID } = request.params;

    let records = request.body;

    let db = await MongoDB.getDB(URI, databaseID, tenantID)

    let action = await db.post(records)


    return reply.code(200).send({});

});

// Patch record
fastify.patch('/api/:databaseID/:tenantID', async (request, reply) => {

    let { databaseID, tenantID } = request.params;

    let records = request.body;

    let db = await MongoDB.getDB(URI, databaseID, tenantID)

    let action = await db.patch(records)

    return reply.code(200).send(action?.result || {});

});

// Delete record
fastify.delete('/api/:databaseID/:tenantID', async (request, reply) => {

    let { databaseID, tenantID } = request.params;

    let {
        record_id,
        filter
    } = request.query;

    filter = filter ?? {}

    if(record_id){
        filter['@id'] = record_id
    }

    if(!filter){
        return reply.code(400).send({
            status: 'failed',
            error: "empty filter"
        });
    }

    console.log("DELETE", filter)

    let db = await MongoDB.getDB(URI, databaseID, tenantID)

    let action = await db.delete(filter)
    console.log('DELETE', action)

    return reply.code(200).send(action?.result || {});

});



// -----------------------------------------------------------------------------------------------
// Execute 
// -----------------------------------------------------------------------------------------------


// Post endpoint accepting query parameters
fastify.post('/api/:databaseID/:tenantID/execute', {
    schema: {
        summary: 'Execute action',
        tags: ['Records']
    }
}, async (request, reply) => {
    // Fastify automatically parses and coerces types based on the schema above

    let { databaseID, tenantID } = request.params;
    let executeAction = request.body;

    
    let db = await MongoDB.getDB(URI, databaseID, tenantID)

    let action = await db.execute(executeAction)

    return reply.code(200).send(action?.result || {});

});




// -----------------------------------------------------------------------------------------------
// Record 
// -----------------------------------------------------------------------------------------------

// GET endpoint accepting query parameters
fastify.get('/api/:databaseID/:tenantID/:record_id', {
    schema: {
        summary: 'Search and paginate records',
        tags: ['Records']
    }
}, async (request, reply) => {
    // Fastify automatically parses and coerces types based on the schema above

    let { databaseID, tenantID, record_id } = request.params;

    if (!databaseID) {
        return reply.code(400).send({
            status: 'failed',
            error: "missing databaseID"
        });
    }

    if (!tenantID) {
        return reply.code(400).send({
            status: 'failed',
            error: "missing tenantID"
        });
    }


    let db = await MongoDB.getDB(URI, databaseID, tenantID)

    if (record_id) {
        let result = await db.get(record_id)
        return result
    }

    let result = {}
    return reply.code(200).send(result);

});


// Post endpoint accepting query parameters
fastify.post('/api/:databaseID/:tenantID/:record_id', {
    schema: {
        summary: 'Post/replace record',
        tags: ['Records']
    }
}, async (request, reply) => {
    // Fastify automatically parses and coerces types based on the schema above

    let { databaseID, tenantID, record_id } = request.params;
    let records = request.body;

    records = Array.isArray(records) ? records : [records]
    records = records.filter(x => x?.['@id'] == record_id)


    let db = await MongoDB.getDB(URI, databaseID, tenantID)

    let action = await db.post(records)

    return reply.code(200).send(action?.result || {});
});


fastify.patch('/api/:databaseID/:tenantID/:record_id', {
    schema: {
        summary: 'Patch record',
        tags: ['Records']
    }
}, async (request, reply) => {
    // Fastify automatically parses and coerces types based on the schema above

    let { databaseID, tenantID, record_id } = request.params;
    let records = request.body;

    records = Array.isArray(records) ? records : [records]
    records = records.filter(x => x?.['@id'] == record_id)


    let db = await MongoDB.getDB(URI, databaseID, tenantID)

    let action = await db.patch(records)

    return reply.code(200).send(action?.result || {});
});


// Post endpoint accepting query parameters
fastify.delete('/api/:databaseID/:tenantID/:record_id', {
    schema: {
        summary: 'Delete record',
        tags: ['Records']
    }
}, async (request, reply) => {

    let { databaseID, tenantID, record_id } = request.params;

    let db = await MongoDB.getDB(URI, databaseID, tenantID)

    let action = await db.delete({ "@id": record_id })

    return reply.code(200).send(action?.result || {});
});




// -----------------------------------------------------------------------------------------------
// ItemList 
// -----------------------------------------------------------------------------------------------

// Get add item to list
fastify.get('/api/:databaseID/:tenantID/:record_id/itemListElement', async (request, reply) => {

    let { databaseID, tenantID, record_id } = request.params;

    let items = request.body;

    let action = {
        "@type": "AppendAction",
        "targetCollection": {
            "@id": record_id
        },
        "object": items
    }

    let db = await MongoDB.getDB(URI, databaseID, tenantID)

   // action = await db.execute(action)
// return reply.code(200).send(action?.result || {});

});



// POST add item to list
fastify.post('/api/:databaseID/:tenantID/:record_id/itemListElement', async (request, reply) => {

    let { databaseID, tenantID, record_id } = request.params;

    let items = request.body;

    let action = {
        "@type": "AppendAction",
        "targetCollection": {
            "@id": record_id
        },
        "object": items
    }


    let db = await MongoDB.getDB(URI, databaseID, tenantID)

    action = await db.execute(action)

    return reply.code(200).send(action?.result || {});

});


// Delete item from list
fastify.delete('/api/:databaseID/:tenantID/:record_id/itemListElement', async (request, reply) => {

    let { databaseID, tenantID, record_id } = request.params;

    let items = request.body;

    let action = {
        "@type": "DeleteAction",
        "targetCollection": {
            "@id": record_id
        },
        "object": items
    }


    let db = await MongoDB.getDB(URI, databaseID, tenantID)

    action = await db.execute(action)

    return reply.code(200).send(action?.result || {});

});






// Top-level await is fully supported in ES6 modules
try {
    await fastify.listen({ port: 3000 });
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}