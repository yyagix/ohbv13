export default {
    info: "Botun komutları yerine getirmesini / istenileni söylemesini sağlar.",
    callback: (message, ...args) => {
        message.channel.send(args.join(" "));
    }
}