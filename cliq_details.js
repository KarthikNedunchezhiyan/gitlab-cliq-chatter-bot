module.exports = {
    message_endpoint: CHAT_ID =>
        `https://cliq.zoho.com/api/v2/chats/${CHAT_ID}/message`,
    message_edit_endpoint: (CHAT_ID, MESSAGE_ID) =>
        `https://cliq.zoho.com/api/v2/chats/${CHAT_ID}/messages/${MESSAGE_ID}`,
    members_endpoint: CHAT_ID =>
        `https://cliq.zoho.com/api/v2/chats/${CHAT_ID}/members`
}