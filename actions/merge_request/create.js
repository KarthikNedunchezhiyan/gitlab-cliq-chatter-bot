const HTTPS = require('https');
const UTIL = require('util');

const SHARED = require('./shared');
const CLIQ_DETAILS = require('../../cliq_details');
const CONNECTOR_DETAIL = require('../../connector_details');

module.exports = async function (GIT_REQUEST, GIT_RESPONSE, DATASTORE_ROW, ASSIGNEE_CLIQ_MEMBER_MAP) {
    const APP = GIT_RESPONSE.locals.catalyst_app;

    const MESSAGE_ENDPOINT = CLIQ_DETAILS.message_endpoint(GIT_REQUEST.params.chatid);
    const GITLAB_BODY = GIT_REQUEST.body;

    const AUTH_TOKEN = await APP.connection(CONNECTOR_DETAIL).getConnector('cliqbot').getAccessToken();

    const REQUEST_HANDLER = HTTPS.request(MESSAGE_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${AUTH_TOKEN}`
        }
    }, CLIQ_RESPONSE => {
        let body = [];
        CLIQ_RESPONSE.on('data', CHUNK => {
            body.push(CHUNK);
        });
        CLIQ_RESPONSE.on('end', async () => {
            if (CLIQ_RESPONSE.statusCode == 200 || CLIQ_RESPONSE.statusCode == 204) {
                const JSON_BODY = JSON.parse(Buffer.concat(body));
                const MESSAGE_ID = JSON_BODY.message_id;

                try {
                    await APP.datastore().table('message_details').updateRow({
                        ROWID: DATASTORE_ROW.ROWID,
                        message_id: MESSAGE_ID.trim()
                    });
                    GIT_RESPONSE.status(200).send("ok");
                } catch (ERROR) {
                    console.error(ERROR);
                    GIT_RESPONSE.status(500).send(UTIL.inspect(ERROR));
                }
            } else {
                const TEXT_BODY = Buffer.concat(body).toString();
                console.error(`response from cliq: status_code => ${CLIQ_RESPONSE.statusCode} , body => ${TEXT_BODY}`);
                GIT_RESPONSE.status(500).send(TEXT_BODY);
            }
        });
    }).on('error', ERROR => {
        console.error(`request to cliq: ${ERROR}`);
        GIT_RESPONSE.status(500).send(UTIL.inspect(ERROR));
    });

    REQUEST_HANDLER.write(JSON.stringify(SHARED.construct_cliq_body(GITLAB_BODY, ASSIGNEE_CLIQ_MEMBER_MAP)));
    REQUEST_HANDLER.end();
}