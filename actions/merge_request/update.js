const HTTPS = require('https');
const UTIL = require('util');

const SHARED = require('./shared');
const CLIQ_DETAILS = require('../../cliq_details');
const BOT_DETAILS_OBJECT = require('../../bot_details');
const CONNECTOR_DETAIL = require('../../connector_details');

module.exports = async function (GIT_REQUEST, GIT_RESPONSE, DATASTORE_ROW, ASSIGNEE_CLIQ_MEMBER_MAP) {
    const APP = GIT_RESPONSE.locals.catalyst_app;

    const MESSAGE_ENDPOINT = CLIQ_DETAILS.message_edit_endpoint(GIT_REQUEST.params.chatid, DATASTORE_ROW.message_id);
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
                let reply_text = "";

                const ASSINEES_MENTIONS = Object.keys(ASSIGNEE_CLIQ_MEMBER_MAP).map(ASSIGNEE_EMAIL => {
                    if (ASSIGNEE_CLIQ_MEMBER_MAP[ASSIGNEE_EMAIL].cliq_user_id) {
                        return `{@${ASSIGNEE_CLIQ_MEMBER_MAP[ASSIGNEE_EMAIL].cliq_user_id}}`;
                    } else {
                        return ASSIGNEE_EMAIL;
                    }
                }).sort().join(" ");

                if (GITLAB_BODY.object_attributes.state === "merged" && DATASTORE_ROW.status != "merged") {
                    reply_text = `merged by ${GITLAB_BODY.user.name} 🎉`;
                } else if (GITLAB_BODY.object_attributes.work_in_progress == false && DATASTORE_ROW.wip == true) {
                    if (ASSINEES_MENTIONS) {
                        reply_text = `hey reviewers ${ASSINEES_MENTIONS} ✋ merge request is open for review 🔫`
                    } else {
                        reply_text = `hey team ✋! merge request is open for review 🔫`
                    }
                } else if (ASSINEES_MENTIONS && Object.keys(ASSIGNEE_CLIQ_MEMBER_MAP).sort().join() !== DATASTORE_ROW.assignee_list) {
                    reply_text = `hey reviewers ${ASSINEES_MENTIONS} ✋ you have been assigned to review this merge request 🔫`
                }

                if (reply_text) {
                    const MESSAGE_ENDPOINT = CLIQ_DETAILS.message_endpoint(GIT_REQUEST.params.chatid);
                    const REQUEST_HANDLER = HTTPS.request(MESSAGE_ENDPOINT, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${AUTH_TOKEN}`
                        }
                    }, CLIQ_RESPONSE => {
                        if (!(CLIQ_RESPONSE.statusCode == 200 || CLIQ_RESPONSE.statusCode == 204)) {
                            console.error(`send reply message cliq: status_code => ${CLIQ_RESPONSE.statusCode}`);
                        }
                        GIT_RESPONSE.status(200).send("ok");
                    });
                    REQUEST_HANDLER.write(JSON.stringify({
                        bot: {
                            name: BOT_DETAILS_OBJECT.name,
                            image: BOT_DETAILS_OBJECT.image
                        },
                        text: reply_text,
                        broadcast: true,
                        reply_to: DATASTORE_ROW.message_id,
                    }));
                    REQUEST_HANDLER.end();

                } else {
                    GIT_RESPONSE.status(200).send("ok");
                }
            } else {
                console.error(`send update message cliq: status_code => ${CLIQ_RESPONSE.statusCode}, body => ${BODY}`);
                GIT_RESPONSE.status(500).send(UTIL.inspect(BODY));
            }
        });
    }).on('error', ERROR => {
        console.error(`request to cliq: ${ERROR}`);
        GIT_RESPONSE.status(500).send(UTIL.inspect(ERROR));
    });

    REQUEST_HANDLER.write(JSON.stringify(SHARED.construct_cliq_body(GITLAB_BODY, ASSIGNEE_CLIQ_MEMBER_MAP)));
    REQUEST_HANDLER.end();
}