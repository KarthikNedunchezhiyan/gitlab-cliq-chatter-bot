const HTTPS = require('https');
const UTIL = require('util');
const CATALYST = require('zcatalyst-sdk-node');

const SHARED = require('./shared');
const CLIQ_DETAILS = require('../../cliq_details');
const CONNECTOR_DETAIL = require('../../connector_details');

module.exports = async function (GIT_REQUEST, GIT_RESPONSE, ROW_ID) {
    const APP = CATALYST.initialize(GIT_REQUEST);

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
                        ROWID: ROW_ID,
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

    const BODY_CHANGES = {
        thumbnail: "https://img.icons8.com/officel/2x/pull-request.png"
    }

    REQUEST_HANDLER.write(JSON.stringify(SHARED.construct_cliq_body(BODY_CHANGES, GITLAB_BODY)));
    REQUEST_HANDLER.end();
}