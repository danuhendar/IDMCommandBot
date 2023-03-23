var mqtt = require('mqtt')  
//var fs = require('fs')  
var broker = 'mqtt://172.24.16.131'  
var client = mqtt.connect(broker)  
//var forecast = fs.readFileSync('../forecast.json').toString();    
client.publish("10.51.60.117/", "Hello")  
client.end(); 
console.log('Successful!'); 
