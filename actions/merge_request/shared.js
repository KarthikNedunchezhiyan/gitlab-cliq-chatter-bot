const DEFAULT_LABEL_TEXT = "no labels included";
const DEFAULT_DESCRIPTION_TEXT = "no description included";

const BOT_DETAILS_OBJECT = require('../../bot_details');

function construct_cliq_body(BODY_CHANGES, GITLAB_BODY) {
    const CORE_CONTENT = GITLAB_BODY.object_attributes;

    const LABEL_TEXT = GITLAB_BODY.labels.map(LABEL => "@" + LABEL.title).join(" ") || DEFAULT_LABEL_TEXT;
    const DESCRIPTION_TEXT = CORE_CONTENT.description || DEFAULT_DESCRIPTION_TEXT;

    return {
        bot: {
            name: BOT_DETAILS_OBJECT.name,
            image: BOT_DETAILS_OBJECT.image
        },
        card: {
            title: `Merge request ${CORE_CONTENT.state} by ${GITLAB_BODY.user.name}`,
            thumbnail: BODY_CHANGES.thumbnail,
        },
        text: `[${CORE_CONTENT.title}](${CORE_CONTENT.url}) 
! ${LABEL_TEXT}`,
        "slides": [{
            "type": "label",
            "data": [{ "": DESCRIPTION_TEXT }]
        }]
    }
}

module.exports = {
    construct_cliq_body
}