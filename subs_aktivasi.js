var mqtt    = require('mqtt');
const {gzip, ungzip} = require('node-gzip');
var Promise = require('promise');
var mysqlLib = require('./connection/mysql_connection');
var service_controller = require('./controller/service_controller');
const fs = require('fs');
const cron = require('node-cron');


const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}


var client  = mqtt.connect("mqtt://172.24.16.131",{clientId:"SUBS_AKTIVASI",clean:true,port:1883});
client.on("connect",function(){	
    console.log("connected MQTT");
});
client.on("error",function(error){
    console.log("Can't connect" + error);
    process.exit(1)
});

var topic_init_service = "AKTIVASI_WINDOWS/#";
client.subscribe(topic_init_service,{qos:0});


// client.on('message', function (topic, message) {
//   // message is Buffer
//   console.log(message.toString())
//   //client.end()
// })

client.on('message',async function(topic, compressed){
    try{
    	const decompressed = await ungzip(compressed);
		console.log(decompressed.toString());
    }catch(exc){
    	console.log(exc)	
    }
 
	//await service_controller.ins_init(topic,decompressed);
});