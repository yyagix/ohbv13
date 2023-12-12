import { global } from "../index.mjs"
import { main } from "../lib/SelfbotWorker.mjs"
export default {
    info: "Botun çalışmasını başlatır.",
    callback: (message, ...args) => {
        if(global.captchaDetected) {
            if(global.paused) {
                global.captchaDetected = false
                global.paused = false
                message.reply("Bot başarıyla çalıştırıldı.")
                main();
            }
            else return message.reply("**EYLEM GEREKLİ!** Botu duraklatmadan önce captcha görselini çözmelisiniz.")
        } else return message.reply("Bot zaten çalışır durumda.")
    }
}