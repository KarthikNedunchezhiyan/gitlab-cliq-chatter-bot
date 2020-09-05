const HTTPS = require('https');
const CLIQ_DETAILS = require('./cliq_details');
const CONNECTOR_DETAIL = require('./connector_details');

async function map_assignees_to_cliq_members(GIT_REQUEST, GIT_RESPONSE) {
    return new Promise(async (RESOLVE, REJECT) => {
        const APP = GIT_RESPONSE.locals.catalyst_app;

        const MESSAGE_ENDPOINT = CLIQ_DETAILS.members_endpoint(GIT_REQUEST.params.chatid);
        const GITLAB_BODY = GIT_REQUEST.body;

        if (!GITLAB_BODY.assignees) {
            return RESOLVE({});
        }

        const AUTH_TOKEN = await APP.connection(CONNECTOR_DETAIL).getConnector('cliqbot').getAccessToken();

        HTTPS.get(MESSAGE_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${AUTH_TOKEN}`
            }
        }, CLIQ_RESPONSE => {
            let body = [];
            CLIQ_RESPONSE.on('data', CHUNK => {
                body.push(CHUNK);
            });
            CLIQ_RESPONSE.on('end', async () => {
                try {
                    let result_map = {};
                    const JSON_BODY = JSON.parse(Buffer.concat(body));
                    const CLIQ_MEMBERS = JSON_BODY.members;

                    for (let i = 0; i < GITLAB_BODY.assignees.length; i++) {
                        const ASSIGNEE = GITLAB_BODY.assignees[i];

                        result_map[ASSIGNEE.email] = {};

                        for (let j = 0; j < CLIQ_MEMBERS.length; j++) {
                            const MEMBER = CLIQ_MEMBERS[j];
                            if (MEMBER.email_id === ASSIGNEE.email) {
                                result_map[ASSIGNEE.email].cliq_user_id = MEMBER.user_id;
                                break;
                            }
                        }
                    }

                    RESOLVE(result_map);
                } catch (ERROR) {
                    REJECT(ERROR);
                }
            })
        }).on('error', ERROR => {
            REJECT(ERROR);
        }).end();
    });
}

module.exports = {
    map_assignees_to_cliq_members
}