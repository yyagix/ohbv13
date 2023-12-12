export default {
    info: "Bot gecikmesini gösterir.",
    callback: (message, ...args) => {
        message.reply(`🏓 Pong! Bot gecikmesi **${message.client.ws.ping}** milisaniye.`);
    }
}