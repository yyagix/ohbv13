export default {
    info: "Botu devredışı bırakır / kapatır.",
    callback: (message, ...args) => {
        message.reply("Bot kapatılıyor.")
        process.kill(process.pid, "SIGINT");
    }
}