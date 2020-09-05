const HTTPS = require('https');
const UTIL = require('util');
const CATALYST = require('zcatalyst-sdk-node');

const SHARED = require('./shared');
const CLIQ_DETAILS = require('../../cliq_details');
const CONNECTOR_DETAIL = require('../../connector_details');

module.exports = async function (GIT_REQUEST, GIT_RESPONSE, MESSAGE_ID) {
    const APP = CATALYST.initialize(GIT_REQUEST);

    const MESSAGE_ENDPOINT = CLIQ_DETAILS.message_edit_endpoint(GIT_REQUEST.params.chatid, MESSAGE_ID);
    const GITLAB_BODY = GIT_REQUEST.body;

    const AUTH_TOKEN = await APP.connection(CONNECTOR_DETAIL).getConnector('cliqbot').getAccessToken();

    const REQUEST_HANDLER = HTTPS.request(MESSAGE_ENDPOINT, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${AUTH_TOKEN}`
        }
    }, CLIQ_RESPONSE => {
        let body = [];
        CLIQ_RESPONSE.on('data', CHUNK => {
            body.push(CHUNK);
        });
        CLIQ_RESPONSE.on('end', async () => {
            const BODY = Buffer.concat(body).toString();

            if (CLIQ_RESPONSE.statusCode == 200 || CLIQ_RESPONSE.statusCode == 204) {
                GIT_RESPONSE.status(200).send("ok");
            } else {
                console.error(`send update message cliq: status_code => ${CLIQ_RESPONSE.statusCode}, body => ${BODY}`);
                GIT_RESPONSE.status(500).send(UTIL.inspect(BODY));
            }
        });
    }).on('error', ERROR => {
        console.error(`request to cliq: ${ERROR}`);
        GIT_RESPONSE.status(500).send(UTIL.inspect(ERROR));
    });

    const BODY_CHANGES = {
        thumbnail: "https://img.icons8.com/officel/2x/pull-request.png"
    }

    REQUEST_HANDLER.write(JSON.stringify(SHARED.construct_cliq_body(BODY_CHANGES, GITLAB_BODY)));
    REQUEST_HANDLER.end();
}