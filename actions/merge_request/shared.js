const DEFAULT_LABEL_TEXT = "no labels included";
const DEFAULT_DESCRIPTION_TEXT = "no description included";
const DEFAULT_ASSIGNEE_TEXT = "no assignees assigned"

const BOT_DETAILS_OBJECT = require('../../bot_details');

function construct_cliq_body(GITLAB_BODY, ASSIGNEE_CLIQ_MEMBER_MAP) {
    const CORE_CONTENT = GITLAB_BODY.object_attributes;

    const LABEL_TEXT = GITLAB_BODY.labels.map(LABEL => "@" + LABEL.title).sort().join(" ") || DEFAULT_LABEL_TEXT;
    const DESCRIPTION_TEXT = CORE_CONTENT.description || DEFAULT_DESCRIPTION_TEXT;
    const ASSINEE_TEXT = Object.keys(ASSIGNEE_CLIQ_MEMBER_MAP).map(ASSIGNEE_EMAIL => {
        if (ASSIGNEE_CLIQ_MEMBER_MAP[ASSIGNEE_EMAIL].cliq_user_id) {
            return `{@${ASSIGNEE_CLIQ_MEMBER_MAP[ASSIGNEE_EMAIL].cliq_user_id}}`;
        } else {
            return ASSIGNEE_EMAIL;
        }
    }).sort().join(" ") || DEFAULT_ASSIGNEE_TEXT;

    let title_prefix = "";

    switch (CORE_CONTENT.state) {
        case "merged":
        case "closed":
            title_prefix = "`[INACTIVE]`"
            break;
        default:
            title_prefix = `*"[ACTIVE]"*​`
    }

    return {
        bot: {
            name: BOT_DETAILS_OBJECT.name,
            image: BOT_DETAILS_OBJECT.image
        },
        card: {
            title: `${title_prefix} Merge request ${CORE_CONTENT.state} by ${GITLAB_BODY.user.name}`,
            thumbnail: "https://img.icons8.com/officel/2x/pull-request.png",
        },
        sync_message: true,
        broadcast: true,
        text: `[${CORE_CONTENT.title}](${CORE_CONTENT.url}) 
! ${LABEL_TEXT}
! *assignees:* ${ASSINEE_TEXT}`,
        "slides": [{
            "type": "label",
            "data": [{ "": DESCRIPTION_TEXT }]
        }]
    }
}

module.exports = {
    construct_cliq_body
}