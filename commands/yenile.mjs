import { aCheck } from "../lib/SelfbotWorker.mjs"
export default {
    info: "Konfigürasyonu yeniden yükler.",
    callback: (message, ...args) => {
        try {
            aCheck(true);
            message.reply("Konfigürasyon başarıyla yenilendi.")
        } catch (error) {
            message.reply("Konfigürasyonu yenileme başarısız oldu.")
        }
    }
}