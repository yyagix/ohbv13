import { global } from "../index.mjs"
import { timeHandler } from "../lib/extension.mjs";
export default {
    info: "Bot bilgilerini gösterir.",
    callback: (message, ...args) => {
        const status = global.captchaDetected ? global.paused ? "**DURDURULDU**" : "**CAPTCHA ÇÖZÜLMESİ BEKLENİYOR**" : "ÇALIŞIYOR";
        message.reply(`**Çalışma süresi:** ${timeHandler(global.startTime, Date.now())}\n**Durum:** ${status}`)
    }
}