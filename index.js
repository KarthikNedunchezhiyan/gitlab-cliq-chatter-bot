"use strict"
require('dotenv').config();
const EXPRESS = require('express');
const CATALYST = require('zcatalyst-sdk-node');
const UTIL = require('util');

const APP = EXPRESS();
APP.use(EXPRESS.json());

const ACTIONS = {
	MERGE_REQUEST: {
		CREATE: require('./actions/merge_request/create'),
		UPDATE: require('./actions/merge_request/update')
	}
}

APP.post("/:chatid/mr_event", async (GIT_REQUEST, GIT_RESPONSE) => {
	try {
		const CATALYST_APP = CATALYST.initialize(GIT_REQUEST);

		const GITLAB_BODY = GIT_REQUEST.body;
		const RESOURCE_ID = `1${GITLAB_BODY.project.id.toString().padStart(9, 0)}${GITLAB_BODY.object_attributes.id.toString().padStart(9, 0)}`;
		console.log(`resource_id: ${RESOURCE_ID} , pid: ${GITLAB_BODY.project.id} , mid: ${GITLAB_BODY.object_attributes.id}`);
		try {
			const ROW = await CATALYST_APP.datastore().table('message_details').insertRow({
				resource_id: RESOURCE_ID.trim(),
			});

			/**
			 * This action handles MR create
			 */
			await ACTIONS.MERGE_REQUEST.CREATE(GIT_REQUEST, GIT_RESPONSE, ROW.ROWID);
		} catch (ERROR) {
			if (ERROR && ERROR.message && ERROR.message.includes && ERROR.message.includes("DUPLICATE_VALUE")) {
				const ROWS = await CATALYST_APP.zcql().executeZCQLQuery(`SELECT * from message_details where message_details.resource_id=${RESOURCE_ID} limit 1`);
				const MESSAGE_ID = ROWS[0].message_details.message_id;
				console.log(`message_id: ${MESSAGE_ID}`);
				/**
			     * This action handles MR updates
			     */
				await ACTIONS.MERGE_REQUEST.UPDATE(GIT_REQUEST, GIT_RESPONSE, MESSAGE_ID);
			} else {
				console.error(`insert row in message_details table: ${ERROR}`);
				GIT_RESPONSE.status(500).send(UTIL.inspect(ERROR));
			}
		}
	} catch (ERROR) {
		console.log(`handle merge request: ${ERROR}`);
		GIT_RESPONSE.status(500).send(UTIL.inspect(ERROR));
	}
});

APP.all("/ruok", (_REQUEST, RESPONSE) => {
	RESPONSE.status(200).send("iamok");
});

module.exports = APP;
