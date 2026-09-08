






export async function runTests(baseUrl, databaseID, tenantID) {


    let actions = []

    actions.push(await cleanDB(baseUrl, databaseID, tenantID))

    actions.push(await testBase(baseUrl, databaseID, tenantID))

    actions.push(await testExecute(baseUrl, databaseID, tenantID))

    actions.push(await cleanDB(baseUrl, databaseID, tenantID))


    return actions

}


async function cleanDB(baseUrl, databaseID, tenantID) {

    let test = getAction('Cleaning database')


    let records = await searchRecords(baseUrl, databaseID, tenantID, {}) || []
    records = records?.itemListElement || []
    records = records.map(x => x.item)

    for (let r of records) {
        await deleteRecord(baseUrl, databaseID, tenantID, r?.["@id"])
    }

    let records2 = await searchRecords(baseUrl, databaseID, tenantID, {}) || []
    records2 = records2?.itemListElement || []
    records2 = records2.map(x => x.item)

    test.result = `Initial: ${records.length} records. After ${records2.length} records.`

    return test
}


async function testBase(baseUrl, databaseID, tenantID) {

    let test = getAction('Base test')

    let record = {
        "@type": "Thing",
        "@id": "https://www.test.com/unitTestSample1",
        "name": "unitTestSample1"
    }

    let record_id = record?.['@id']

    let r
    let result
    let unitTest
    let testName


    // Initial delete, ensure record doesn't exist
    r = await deleteRecord(baseUrl, databaseID, tenantID, record?.['@id'])


    // test 0. get 
    testName = 'Initial get, should be empty'
    unitTest = getAction(testName, test)
    r = await getRecord(baseUrl, databaseID, tenantID, record?.['@id'])
    if (r?.['@id']) {
        unitTest = setFailed(unitTest, `Failed - Expected {} returned ${JSON.stringify(r)}`)
        test = setFailed(test, testName)
        return test
    }

    // test 1. post 
    testName = 'Initial post, post record and check it was created'
    unitTest = getAction(testName, test)
    r = await postRecords(baseUrl, databaseID, tenantID, record)
    r = await getRecord(baseUrl, databaseID, tenantID, record?.['@id'])
    if (r?.['@id'] != record?.['@id']) {
        unitTest = setFailed(unitTest, `Failed - Expected ${JSON.stringify(record)} returned ${JSON.stringify(r)}`)
        test = setFailed(test, testName)
        return test
    }

    // test 2. patch 
    testName = 'Update, patch record check if added ok'
    unitTest = getAction(testName, test)
    let newRecord = {"@id": record?.['@id'], 'newName': "testname"}
    r = await patchRecords(baseUrl, databaseID, tenantID, newRecord)
    r = await getRecord(baseUrl, databaseID, tenantID, record?.['@id'])
    if (r?.['@id'] != record?.['@id']) {
        unitTest = setFailed(unitTest, `Failed 1 - Expected ${JSON.stringify(record)} returned ${JSON.stringify(r)}`)
        test = setFailed(test, testName)
        return test
    }
    if (r?.name != record?.name) {
        unitTest = setFailed(unitTest, `Failed 2 - Expected ${JSON.stringify(record)} returned ${JSON.stringify(r)}`)
        test = setFailed(test, testName)
        return test
    }
     if (r?.newName != newRecord?.newName) {
        unitTest = setFailed(unitTest, `Failed 3 - Expected ${JSON.stringify(record)} returned ${JSON.stringify(r)}`)
        test = setFailed(test, testName)
        return test
    }

    // test 2. delete 
    testName = 'Test delete - check record no longer exist'
    unitTest = getAction(testName, test)
    r = await deleteRecord(baseUrl, databaseID, tenantID, record_id)
    r = await getRecord(baseUrl, databaseID, tenantID, record?.['@id'])
    if (r?.['@id']) {
        unitTest = setFailed(unitTest, `Failed - Expected ${JSON.stringify({})} returned ${JSON.stringify(r)}`)
        test = setFailed(test, testName)
        return test
    }

    return test
}




async function testExecute(baseUrl, databaseID, tenantID) {

    let test = getAction('Execute test')

    let record = {
        "@type": "ItemList",
        "@id": "https://www.test.com/unitTestSample2",
        "name": "unitTestSample2",
        "itemListElement": []
    }


    let item = {
        "@type": "Thing",
        "@id": "https://www.test.com/unitTestSample2Item1",
        "name": "unitTestSample2Item1"
    }

    let testAction = {
        "@type": "AppendAction",
        "targetCollection": { "@id": record?.["@id"] },
        "object": item
    }

    let record_id = record?.['@id']

    let r
    let result
    let unitTest
    let testName


    // Initial delete, ensure record doesn't exist
    r = await deleteRecord(baseUrl, databaseID, tenantID, record?.['@id'])
    r = await deleteRecord(baseUrl, databaseID, tenantID, item?.['@id'])

    // test 0. get 
    testName = 'Initial get, should be empty'
    unitTest = getAction(testName, test)
    r = await getRecord(baseUrl, databaseID, tenantID, record?.['@id'])
    if (r?.['@id']) {
        unitTest = setFailed(unitTest, `Failed - Expected {} returned ${JSON.stringify(r)}`)
        test = setFailed(test, testName)
        return test
    }

    // Create itemList record
    testName = 'Initial post, post itemList and check it was created'
    unitTest = getAction(testName, test)
    r = await postRecords(baseUrl, databaseID, tenantID, record)
    r = await getRecord(baseUrl, databaseID, tenantID, record?.['@id'])
    if (r?.['@id'] != record?.['@id']) {
        unitTest = setFailed(unitTest, `Failed - Expected ${JSON.stringify(record)} returned ${JSON.stringify(r)}`)
        test = setFailed(test, testName)
        return test
    }

    // test execute
    testName = 'Execute append action'
    unitTest = getAction(testName, test)
    r = await executeAction(baseUrl, databaseID, tenantID, testAction)
    r = await getRecord(baseUrl, databaseID, tenantID, record?.['@id'])
    let items = Array.isArray(r?.itemListElement) ? r?.itemListElement : [r?.itemListElement]
    if (items.length != 1) {
        unitTest = setFailed(unitTest, `Failed - Expected only one item, returned ${JSON.stringify(r)}`)
        test = setFailed(test, testName)
        return test
    }

    return test

}




function getAction(name, parentTest) {
    let action = {
        "@type": "Action",
        "name": name || "",
        "actionStatus": "CompletedActionStatus"
    }

    if (parentTest) {
        parentTest.hasPart = parentTest?.hasPart || []
        parentTest.hasPart.push(action)
        action.name = String(parentTest.hasPart.length - 1) + ". " + action.name
    }

    return action
}

function setFailed(action, error) {

    action.actionStatus = "FailedActionStatus"
    action.error = String(error)
    return action
}

async function getRecord(baseUrl, databaseID, tenantID, record_id) {

    let r
    let result

    // test 1. get 
    let url = new URL(`/api/${databaseID}/${tenantID}`, baseUrl)
    url.searchParams.set("record_id", record_id);

    r = await fetch(url.toString())
    result = await r.json()

    return result

}

async function searchRecords(baseUrl, databaseID, tenantID, params) {

    let r
    let result

    // test 1. get 
    let url = new URL(`/api/${databaseID}/${tenantID}`, baseUrl)

    if (params) {
        for (let k of Object.keys(params)) {
            if (k == 'filter') {
                for (let k1 of Object.keys(params[k])) {
                    url.searchParams.set(k1, params[k][k1]);
                }
            } else {
                url.searchParams.set(k, params[k]);
            }
        }
    }

    r = await fetch(url.toString())
    result = await r.json()

    return result

}

async function postRecords(baseUrl, databaseID, tenantID, data) {

    let r
    let result

    // test 1. get 
    let url = new URL(`/api/${databaseID}/${tenantID}`, baseUrl)

    r = await fetch(url.toString(), {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json' // Tell the server you're sending JSON
        },
        body: JSON.stringify(data) // Convert the JS object into a JSON string
    });


    result = await r.json()

    return result

}


async function patchRecords(baseUrl, databaseID, tenantID, data) {

    let r
    let result

    // test 1. get 
    let url = new URL(`/api/${databaseID}/${tenantID}`, baseUrl)

    r = await fetch(url.toString(), {
        method: 'PATCH', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json' // Tell the server you're sending JSON
        },
        body: JSON.stringify(data) // Convert the JS object into a JSON string
    });


    result = await r.json()

    return result

}
async function deleteRecord(baseUrl, databaseID, tenantID, record_id) {

    let r
    let result

    // test 1. get 
    let url = new URL(`/api/${databaseID}/${tenantID}`, baseUrl)
    url.searchParams.set("record_id", record_id);


    r = await fetch(url.toString(), {
        method: 'DELETE'

    });



    result = await r.json()

    return result

}



async function executeAction(baseUrl, databaseID, tenantID, action) {

    let r
    let result

    // test 1. get 
    let url = new URL(`/api/${databaseID}/${tenantID}/execute`, baseUrl)


    r = await fetch(url.toString(), {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json' // Tell the server you're sending JSON
        },
        body: JSON.stringify(action) // Convert the JS object into a JSON string
    });

    result = await r.json()

    return result

}

// myUrl.searchParams.set("page", "2");
