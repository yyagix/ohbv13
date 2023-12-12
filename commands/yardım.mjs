import { global } from "../index.mjs";

export default {
    info: "Botun komutlarını ve komutların bilgilerini gösterir.",
    callback: (message, ...args) => {
        let doc = ""
        const arr = Object.keys(global.commands)
        for(const element of arr) {
            doc += `**${element}:** ${global.commands[element].info}\n`;
        }
        if(args[0]) {
            if(arr.includes(args[0])) message.reply(`**${args[0]}:** ${global.commands[args[0]].info}\n`);
            else message.reply("Hiçbir komut bulunamadı.");
        } else message.reply(doc);
    }
}   