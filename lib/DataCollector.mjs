import { accountCheck, accountRemove } from "./extension.mjs";
import { getResult, trueFalse, listCheckbox } from "./prompt.mjs";
import { log } from "./console.mjs";
import { DataPath, global } from "../index.mjs";

import fs from "fs";
import path from "path";

var client = null, cache, conf;
var guildid, channelid, waynotify, webhookurl, usernotify, autocaptcha, apiuser, apikey, musicpath, gemorder, prefix;
var autodaily, autopray, autoquote, autoother, autogem, autosleep, autoresume, autorefresh, autolootbox, autoslash;

function listAccount(data) {
    const obj = listCheckbox("list", "Giriş yapmak için bir hesap seçin", [
        ...new Set(Object.values(data).map(user => user.tag)), 
        {name: "Yeni Hesap Ekle (Token ile Giriş Yap)", value: 0},
        {name: "Yeni Hesap Ekle (QR Kod ile Giriş Yap)", value: 1},
        {name: "Yeni Hesap Ekle (Parola ile Giriş Yap - MFA Gerekli)", value: 2},
    ])
    obj.filter = (value) => {
        const user = Object.values(data).find(u => u.tag == value);
        if(user) return Buffer.from(user.token.split(".")[0], "base64").toString();
        else return value;
    }
    return obj;
};

function getToken() {
    return {
        type: "input",
        validate(token) {
            return token.split(".").length === 3 ? true : "Geçersiz token.";
        },
        message: "Tokeninizi Girin"
    };
}

function getAccount() {
    return [{
        type: "input",
        message: "Email/Telefon Numaranızı Girin: ",
        validate(ans) {
            return ans.match(/^((\+?\d{1,2}\s?)?(\d{3}\s?\d{3}\s?\d{4}|\d{10}))|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/) ? true : "Geçersiz email/telefon numarası.";
        }
    }, {
        type: "password",
        message: "Parolanızı Girin: ",
        validate(ans) {
            return ans.match(/^.+$/) ? true : "Geçersiz parola.";
        }
    }, {
        type: "input",
        message: "2FA/Yedek Kodunuzu Girin: ",
        validate: (ans) => {
            return ans.match(/^([0-9]{6}|[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4})$/) ? true : "Geçerşiz 2FA/yedek kodu."
        }
    }];

}

function listGuild(cache) {
    const obj = listCheckbox("list", "Botun çalışacağı sunucuyu seçin", client.guilds.cache.map(guild => ({name: guild.name, value: guild.id})))
    if(cache && client.guilds.cache.get(cache)) obj.default = () => {
        const guild = client.guilds.cache.get(cache)
        return guild.id
    };
    return obj;
}

function listChannel(cache) {
    const guild = client.guilds.cache.get(guildid);
    const channelList = guild.channels.cache.filter(cnl => ["GUILD_NEWS", "GUILD_TEXT"].includes(cnl.type) && cnl.permissionsFor(guild.members.me).has(["VIEW_CHANNEL", "SEND_MESSAGES"]))
    const obj = listCheckbox("checkbox", "Botun çalışacağı kanalı seçin (Birden fazla kanal seçilirse çalışma kanalı rastgele olarak değişecektir)", [{name: "Sunucu seçimine geri dön", value: -1}, ...channelList.map(ch => ({name: ch.name, value: ch.id}))])
    obj.validate = (ans) => {return ans.length > 0 ? true : "Lütfen en az bir kanal seçin." }
    if(cache && channelList.some(cn => cache.indexOf(cn.id) >= 0)) obj.default = [...channelList.filter(channel => cache.indexOf(channel.id) >= 0).map(channel => channel.id)];
    return obj;
}

function wayNotify(cache) {
    const obj = listCheckbox(
        "checkbox", 
        "Selfbot bir captcha aldığında nasıl bilgilendirilmek istediğinizi seçin", 
        [
            {name: "Müzik", value: 3},
            {name: "Webhook", value: 0}, 
            {name: "Direkt Mesaj (Sadece Arkadaşlar)", value: 1}, 
            {name: "Arama (Sadece Arkadaşlar)", value: 2}
        ]
    )
    if(cache) obj.default = cache;
    return obj;
}

function webhook(cache) {
    const obj = {
        type: "input",
        message: "Webhook bağlantınızı girin",
        validate(ans) {
            return ans.match(/(^.*(discord|discordapp)\.com\/api\/webhooks\/([\d]+)\/([a-zA-Z0-9_-]+)$)/gm) ? true : "Geçersiz webhook."
        }
    }
    if(cache) obj.default = cache;
    return obj;
}

function userNotify(cache){
    const obj = {
        type: "input",
        message: "Webhook/Arama/Direkt Mesaj ile bilgilendirilmek istediğiniz kullanıcı ID'sini girin",
        async validate(ans) {
            if(waynotify.includes(1) || waynotify.includes(2)) {
                if(ans.match(/^\d{17,19}$/)) {
                    if(ans == client.user.id) return "Selfbot ID'si Arama/Direkt Mesaj seçeneği için geçerli değildir."
                    const target = client.users.cache.get(ans);
                    if(!target) return "Girilen kullanıcı bulunamadı.";
                    if(target.relationships == "FRIEND") return true;
                    else if(target.relationships == "PENDING_INCOMING") {
                        try {
                            await target.setFriend();
                            return true;
                        } catch (error) {
                            return "Kullanıcı arkadaşlık isteğini kabul edemedi."
                        }
                    }
                    else if(target.relationships == "PENDING_OUTGOING") return "Lütfen selfbot'un arkadaşlık isteğini kabul edin."
                    else if(target.relationships == "NONE") {
                        try {
                            await target.sendFriendRequest();
                            return "Lütfen selfbot'un arkadaşlık isteğini kabul edin."
                        } catch (error) {
                            return "Girilen kullanıcıya arkadaşlık isteği gönderilemedi."
                        }
                    }
                }
            }
            return ans.match(/^(\d{17,19}|)$/) ? true : "Geçersiz kullanıcı ID'si."
        }
    }
    if(cache) obj.default = cache;
    return obj;
}

function music1(cache) {
    const obj = {
        type: "input",
        message: "Müzik dosyası dizinini girin",
        validate(answer) {
            if(!answer.match(/^([a-zA-Z]:)?(\/?[^\/\0]+)+(\/[^\/\0]+)?$/)) return "Geçersiz dosya dizini.";
            const supportedAudioExtensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.aac'];
            if(!fs.existsSync(answer)) return "Dosya dizini bulunamadı.";
            const stats = fs.statSync(answer)
            if(stats.isDirectory()) {
                if(fs.readdirSync(answer).some(file => supportedAudioExtensions.includes(path.extname(path.join(answer, file))))) return true;
                else return "Girilen dosya dizininde desteklenen bir dosya bulunamadı. (.wav, .mp3, .m4a, .flac, .ogg, .aac)"
            }
            if((stats.isFile() && supportedAudioExtensions.includes(path.extname(answer)))) return true;
            return "Geçersiz dosya dizini.";
        }
    };
    if(cache) obj.default = cache;
    return obj;
}

function music2(folder) {
    const supportedAudioExtensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.aac'];
    const files = fs.readdirSync(folder)
    const supportedFiles = files.filter(file => supportedAudioExtensions.includes(path.extname(file)))

    const obj = {
        type: "list",
        message: "Müzik dosyanızı seçin",
        choices: [
            {name: "Geri", value: "none"},
            ...supportedFiles.map(file => ({name: file, value: path.resolve(folder, file)}))
        ]
    }
    return obj
}

function captchaAPI(cache) {
    const obj = {
        type: "list",
        message: "[BETA] Botun captcha çözmeyi denemek için kullanılacağı bir captcha hizmeti seçin",
        choices: [
            {name: "Geç", value: 0},
            {name: "TrueCaptcha (Ücretsiz)", value: 1},
            {name: "2Captcha (Ücretli)", value: 2},
            {name: "Nosia Captcha Çözme API [Yakında]", disabled: true}
        ],
        loop: false
    }
    if(cache) obj.default = cache;
    return obj;
}


function apiUser(cache) {
    const obj = {
        type: "input",
        message: "API Kullanıcı ID'nizi Girin",
        validate(ans) {
            return ans.match(/^\S+$/) ? true : "Geçersiz API kullanıcı ID'si."
        }
    }
    if(cache) obj.default = cache;
    return obj;
}

function apiKey(cache) {
    const obj = {
        type: "input",
        message: "API Anahtarınızı Girin",
        validate(ans) {
            return ans.match(/^[a-zA-Z0-9]{20,}$/) ? true : "Geçersiz API anahtarı."
        }
    }
    if(cache) obj.default = cache;
    return obj;
}

function botPrefix(cache) {
    const obj = {
        type: "input",
        message: "[BETA] Bot Önekinizi Girin (Yalnızca Bildirim Alıcısının ve Selfbot Hesabının Erişimi Olacaktır), Atlamak İçin Boş Bırakın",
        validate(ans) {
            if(!ans) return true
            return ans.match(/^[^0-9\s]{1,5}$/) ? true : "Geçersiz önek.";
        },
        filter(ans) {
            return ans.match(/^\s*$/) ? null : ans;
        }
    }
    if(cache) obj.default = cache
    return obj;
}

function gemOrder(cache) {
    const obj = listCheckbox(
        "list", 
        "Hunt için gem kullanma sırası seçin", 
        [
            {name: "En İyi'den En Kötü'ye", value: 0},
            {name: "En Kötü'den En İyi'ye", value: 1}
        ]
    )
    if(cache) obj.default = cache;
    return obj;
}

function resolveData(tag, token, guildID, channelID = [], wayNotify = [], musicPath, webhookURL, userNotify, captchaAPI, apiUser, apiKey, cmdPrefix, autoDaily, autoPray, autoSlash, autoGem, autoLootbox, gemOrder, autoQuote, autoOther, autoRefresh, autoSleep, autoResume) {
    return {
        tag,
        token,
        guildID,
        channelID,
        wayNotify,
        musicPath,
        webhookURL,
        userNotify,
        captchaAPI,
        apiUser,
        apiKey,
        cmdPrefix,
        autoDaily,
        autoPray,
        autoSlash,
        autoGem,
        autoLootbox,
        gemOrder,
        autoQuote,
        autoOther,
        autoRefresh,
        autoSleep,
        autoResume
    }
}

export async function collectData(data) {
    console.clear()
    let account
    while(!client) {
        account = await getResult(listAccount(data))
        if (account === 0) {
            const token = await getResult(getToken());
            log("Hesap kontrol ediliyor...", "i");
            client = await accountCheck(token);
        } else if (account === 1) {
            client = await accountCheck();
        } else if(account === 2) {
            const profile = getAccount();
            const username = await getResult(profile[0])
            const password = await getResult(profile[1])
            const mfaCode = await getResult(profile[2])
            log("Hesap kontrol ediliyor...", "i");
            client = await accountCheck([username, password, mfaCode]);
        } else {
            const obj = data[account];
            cache = obj;
            log("Hesap kontrol ediliyor...", "i");
            client = await accountCheck(obj.token)
        }
    }
    if(typeof client == "string") {
        log(client, "e");
        if(data[account]) accountRemove(account, data);
        process.exit(1);
 
    }
    guildid = await getResult(listGuild(cache?.guildID));
    channelid = await getResult(listChannel(cache?.channelID));
    while (channelid.includes(-1)) {
        guildid = await getResult(listGuild(cache?.guildID));
        channelid = await getResult(listChannel(cache?.channelID));
    }

    waynotify = await getResult(wayNotify(cache?.wayNotify));
    if(waynotify.includes(3)) {
        musicpath = await getResult(music1(cache?.musicPath));
        while (true) {
            if (!musicpath || musicpath == "none") musicpath = await getResult(music1(cache?.musicPath));
            else if (fs.statSync(musicpath).isDirectory()) musicpath = await getResult(music2(musicpath));
            else break;
        }
    }
    if(waynotify.includes(0)) webhookurl = await getResult(webhook(cache?.webhookURL));
    if(waynotify.includes(0) || waynotify.includes(1) || waynotify.includes(2)) usernotify = await getResult(userNotify(cache?.userNotify));
    autocaptcha = await getResult(captchaAPI(cache?.captchaAPI))
    if(autocaptcha === 1) {
        apiuser = await getResult(apiUser(cache?.apiUser), "Bu Web Sitesine Gidin ve Kaydolun / Giriş Yapın \nArdından [API Sekmesindeki] \x1b[1m\"userid\"\x1b[0m Değerini Kopyalayın ve Buraya Yapıştırın\nWeb Sitesi: https://truecaptcha.org/api.html")
        apikey = await getResult(apiKey(cache?.apiKey), "Bu Web Sitesine Gidin ve Kaydolun / Giriş Yapın \nArdından [API Sekmesindeki] \x1b[1m\"apikey\"\x1b[0m Değerini Kopyalayın ve Buraya Yapıştırın\nWeb Sitesi: https://truecaptcha.org/api.html")
    }
    else if(autocaptcha === 2) apikey = await getResult(apiKey(cache?.apiKey), "Bu Web Sitesine Gidin ve Kaydolun / Giriş Yapın \nArdından [Pano Sekmesindeki] Hesap Ayarlarında \x1b[1m\"API Key\"\x1b[0m Değerini Kopyalayın ve Buraya Yapıştırın\nWeb Sitesi: https://2captcha.com/enterpage")
    prefix = await getResult(botPrefix(cache?.cmdPrefix))
    autodaily = await getResult(trueFalse("Günlük Ödülü Otomatik Olarak Almayı Aç / Kapat", cache?.autoDaily))
    autopray = await getResult(trueFalse("Pray Komudunu Otomatik Kullanmayı Aç / Kapat", cache?.autoPray))
    autoslash = await getResult(trueFalse("Eğik Çizgi Komudunu Otomatik Kullanmayı Aç / Kapat", cache?.autoSlash))
    autogem = await getResult(trueFalse("Gemleri Otomatik Kullanmayı Aç / Kapat", cache?.autoGem))
    if(autogem) gemorder = await getResult(gemOrder(cache?.gemOrder))
    if(autogem) autolootbox = await getResult(trueFalse("Loot Boxları Otomatik Kullanmayı Aç / Kapat", cache?.autoLootbox))
    autoquote = await getResult(trueFalse("Seviye Atlamak İçin Otomatik Rastgele Mesajlar Göndermeyi Aç / Kapat", cache?.autoQuote))
    autoother = await getResult(trueFalse("Run/Pup/Piku Komutlarını Otomatik Kullanmayı Aç / Kapat", cache?.autoOther))
    autorefresh = await getResult(trueFalse("Yeni Bir Güne Girince Konfigürasyonu Sıfırlamayı Aç / Kapat", cache?.autoRefresh))
    autosleep = await getResult(trueFalse("Bir Süreden Sonra Otomatik Olarak Durmayı Aç / Kapat", cache?.autoSleep))
    autoresume = await getResult(trueFalse("Captcha Çözüldüğünde Otomatik Olarak Devam Etmeyi Aç / Kapat", cache?.autoResume))

    conf = resolveData(client.user.username, client.token, guildid, channelid, waynotify, musicpath, webhookurl, usernotify, autocaptcha, apiuser, apikey, prefix, autodaily, autopray, autoslash, autogem, autolootbox, gemorder, autoquote, autoother, autorefresh, autosleep, autoresume)
    data[client.user.id] = conf;
    fs.writeFileSync(DataPath, JSON.stringify(data), "utf8")
    log("Veriler şuraya kaydedildi: " + DataPath, "i")
    return { client, conf };
}