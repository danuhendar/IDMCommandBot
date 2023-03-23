
var mqtt    = require('mqtt');
const {gzip, ungzip} = require('node-gzip');
var Promise = require('promise');
var mysqlLib = require('./connection/mysql_connection');
var clickhouseLib = require('./connection/clickhouse_connect');
var service_controller = require('./controller/service_controller');
const fs = require('fs');
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');

fs.readFile('appconfig.json', (err, data) => {
    if (err) throw err;
    let student = JSON.parse(data);
});

//-- deklarasi sleep --//
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}



// replace the value below with the Telegram token you receive from @BotFather
const token = '5408760134:AAEC_nJp9KClpr7ewlQSwrqBPh9J2HVrkjc';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const Username = msg.chat.username;
});

//-- MQTT Session --//
var client  = mqtt.connect("mqtt://172.24.16.131",{clientId:"IDMCommandBOT_Baru",clean:true,port:1883,retain:false});
client.on("connect", function(){    
    console.log("connected MQTT"); 
    subs_DCCommand('SECURITY_LOGIN/+/REQUEST/#');
});

client.on("error",function(error){
    console.log("Can't connect MQTT Broker : " + error);
    process.exit(1)
});

client.on('message',async function(topic, compressed){
    try{
        const decompressed = await ungzip(compressed);
        console.log("MESSAGE RECEIVED FROM BE TO TOPIC "+topic+" : "+decompressed);
        const parseJson = JSON.parse(decompressed);
        // const IN_SOURCE = parseJson.SOURCE;
        // const IN_TASK = parseJson.TASK;
        // const IN_FROM = parseJson.FROM;
    }catch(exc){
        console.log("ERROR TERIMA MESAGE : "+exc+" topic : "+topic+" pesan : "+compressed)  
    }
});

async function pub_Command_Backup(){

    var res_message = {
            "TASK": "BACKUP",
            "ID": service_controller.get_id(),
            "SOURCE": "IDMCommandBot",
            "COMMAND": "",
            "OTP": "-",
            "TANGGAL_JAM": service_controller.get_tanggal_jam("1"),
            "VERSI": "1.0.1",
            "HASIL": "-",
            "FROM": "IDMCommandBot",
            "TO": "IDMReporter",
            "SN_HDD": "-",
            "IP_ADDRESS": "192.168.131.104",
            "STATION": "-",
            "CABANG": "HO",
            "FILE": "-",
            "NAMA_FILE": "-",
            "CHAT_MESSAGE": "-",
            "REMOTE_PATH": "-",
            "LOCAL_PATH": "-",
            "SUB_ID": service_controller.get_subid()
        };

        var topic_init_service = "REQ_BACKUP/";
        const compressed = await gzip(JSON.stringify(res_message));  
        client.publish(topic_init_service,compressed);
        console.log(service_controller.get_tanggal_jam("1")+" - Publish : "+topic_init_service);
        //await sleep(120000) 
}

async function  pub_Command(chat_id,kode_cabang_user,nik_pemberi_otp,nama_pemberi_otp,kdcab_bc,sub_id,nama_pemohon){
        var chat_message = {"CHAT_ID":chat_id,"NIK_PEMBERI_OTP":nik_pemberi_otp,"NAMA_PEMBERI_OTP":nama_pemberi_otp,"CREATE_OTP":service_controller.get_tanggal_jam("1"),"KDCAB_BC":kdcab_bc,"SUB_ID":sub_id,"NAMA_PEMOHON":nama_pemohon};

        var res_message = {
            "TASK": "OTP",
            "ID": service_controller.get_id(),
            "SOURCE": "IDMCommander",
            "COMMAND": JSON.stringify(chat_message),
            "OTP": "-",
            "TANGGAL_JAM": service_controller.get_tanggal_jam("1"),
            "VERSI": "1.0.1",
            "HASIL": "-",
            "FROM": "IDMCommandBot",
            "TO": "IDMReporter",
            "SN_HDD": "-",
            "IP_ADDRESS": "192.168.131.104",
            "STATION": "-",
            "CABANG": kode_cabang_user,
            "FILE": "-",
            "NAMA_FILE": "-",
            "CHAT_MESSAGE": chat_message,
            "REMOTE_PATH": "-",
            "LOCAL_PATH": "-",
            "SUB_ID": service_controller.get_subid()
        };

        var topic_init_service = "REQ_OTP/IDMCommandBot/";
        const compressed = await gzip(JSON.stringify(res_message));  
        client.publish(topic_init_service,compressed);
        console.log(service_controller.get_tanggal_jam("1")+" - Publish : "+topic_init_service);
        //await sleep(120000)  
}
 
 
function subs_DCCommand(topic_){
    //var topic_ = 'RES_OTP/'+from+'/';
    client.subscribe(topic_,{qos:0});
    console.log("SUBSCRIBE TOPIC : "+topic_);
}