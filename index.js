"use strict"
require('dotenv').config();
const EXPRESS = require('express');
const CATALYST = require('zcatalyst-sdk-node');
const UTIL = require('util');
const CUSTOM_UTILS = require('./utils');

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

		GIT_RESPONSE.locals.catalyst_app = CATALYST_APP;

		const GITLAB_BODY = GIT_REQUEST.body;
		const CORE_CONTENT = GITLAB_BODY.object_attributes;
		const RESOURCE_ID = `1${GITLAB_BODY.project.id.toString().padStart(9, 0)}${CORE_CONTENT.id.toString().padStart(9, 0)}`;
		const ASSIGNEE_CLIQ_MEMBER_MAP = await CUSTOM_UTILS.map_assignees_to_cliq_members(GIT_REQUEST, GIT_RESPONSE);
		const ASSIGNEES = Object.keys(ASSIGNEE_CLIQ_MEMBER_MAP).sort().join();

		try {
			const ROW = await CATALYST_APP.datastore().table('message_details').insertRow({
				resource_id: RESOURCE_ID.trim(),
				status: CORE_CONTENT.state,
				assignee_list: ASSIGNEES,
				wip: CORE_CONTENT.work_in_progress
			});

			/**
			 * This action handles MR create.
			 */
			await ACTIONS.MERGE_REQUEST.CREATE(GIT_REQUEST, GIT_RESPONSE, ROW, ASSIGNEE_CLIQ_MEMBER_MAP);
		} catch (ERROR) {
			if (ERROR && ERROR.message && ERROR.message.includes && ERROR.message.includes("DUPLICATE_VALUE")) {
				const ROWS = await CATALYST_APP.zcql().executeZCQLQuery(`SELECT * from message_details where message_details.resource_id=${RESOURCE_ID} limit 1`);
				const ROW = ROWS[0].message_details;

				/** 
				 *  Updating the datastore if any information changed
				 */
				if (ROW.status !== CORE_CONTENT.state || ROW.assignee_list !== ASSIGNEES || ROW.wip !== CORE_CONTENT.work_in_progress) {
					await CATALYST_APP.datastore().table('message_details').updateRow({
						ROWID: ROW.ROWID,
						status: CORE_CONTENT.state,
						assignee_list: ASSIGNEES,
						wip: CORE_CONTENT.work_in_progress
					});
				}

				/**
				 * This action handles MR updates.
				 */
				await ACTIONS.MERGE_REQUEST.UPDATE(GIT_REQUEST, GIT_RESPONSE, ROW, ASSIGNEE_CLIQ_MEMBER_MAP);
			} else {
				console.error(`insert row in message_details table: ${ERROR}`);
				GIT_RESPONSE.status(500).send(UTIL.inspect(ERROR));
			}
		}
	} catch (ERROR) {
		console.error(`handle merge request: ${ERROR}`);
		GIT_RESPONSE.status(500).send(UTIL.inspect(ERROR));
	}
});

APP.all("/ruok", (_REQUEST, RESPONSE) => {
	RESPONSE.status(200).send("iamok");
});

module.exports = APP;
