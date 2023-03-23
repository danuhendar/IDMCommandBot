var mqtt    = require('mqtt');
const {gzip, ungzip} = require('node-gzip');
var Promise = require('promise');
var mysqlLib = require('./connection/mysql_connection');
var service_controller = require('./controller/service_controller');
const fs = require('fs');
const cron = require('node-cron');

var arr = [];
var arr_cabang = ['G025'];//['G001','G004','G005','G009','G020','G025','G026','G027','G028','G029','G030','G033','G034','G049','G050','G080','G089','G092','G097','G099','G105','G107','G113','G116','G117','G137','G146','G148','G149','G156','G157','G158','G174','G177','G301','G305','G801'];


var client  = mqtt.connect("mqtt://172.24.16.131",{clientId:"ParsingHWINFOService",clean:true,port:1883});
	
client.on("connect", function(){	
    //console.log("connected MQTT");   
    var topic_trigger_hardware_info = "TRIGGER_HARDWARE_INFO/";
	client.subscribe(topic_trigger_hardware_info,{qos:0});
  
});

client.on("error",function(error){
    console.log("Can't connect" + error);
    process.exit(1)
});

client.on('message',async function(topic, compressed, packet){
	const parseJson = JSON.parse(compressed);
    const IN_CABANG = parseJson.CABANG;
    const IN_SOURCE = parseJson.SOURCE;
    const IN_FROM = parseJson.FROM;
    const IN_STATION = "";
    //console.log(IN_SOURCE);
    let kdtk = ""
    let nm_pc = ""
      if(IN_SOURCE === "IDMCommandListeners"){
          try{
            kdtk = IN_FROM.split("_")[1].substring(0, 4);
            nm_pc = IN_FROM.split("_")[1];
            IN_STATION = IN_FROM.split("_")[2];
            run_(IN_CABANG,kdtk,IN_STATION);
          }catch(exc){
            kdtk = "";
            nm_pc = "";
          }
      }else{

      }

    
});

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}


function run_(kdcab,kode_toko,station){
	    console.log("Proses Cabang : "+kdcab+" Toko : "+kode_toko.toUpperCase());
	  
	    
	    const sql_query = "SELECT b.KDCAB,\n"+
								" b.TOKO,\n"+
								" b.NAMA AS NAMA_TOKO,\n"+
								" b.STATION,\n"+
								" IFNULL(IF(c.RESULT='','-',c.RESULT),'-') AS RESULT,\n"+
								" IFNULL(c.LAST_REPORT,'Tidak Report') AS LAST_REPORT\n"+
								" FROM tokomain b LEFT JOIN (SELECT KDCAB,KDTK,IP,STATION,MAX(RESULT) AS RESULT,MAX(ADDTIME) AS LAST_REPORT FROM transreport"+service_controller.get_tanggal_jam(0)+" WHERE KDCAB = '"+kdcab+"' AND KDTK = '"+kode_toko+"' AND STATION = '"+station+"' AND TASK = 'HARDWAREINFO' AND SOURCE = 'IDMCommandListeners' AND LENGTH(RESULT) > 1 GROUP BY IP) c \n"+
								" ON b.IP=c.IP \n"+
								" WHERE b.KDCAB = '"+kdcab+"' AND TOKO = '"+kode_toko+"' \n"+
								
								" ORDER BY b.TOKO ASC,b.STATION ASC ;";

		console.log(sql_query); 				
		mysqlLib.executeQuery(sql_query).then((d) => {
          for(var i = 0;i<d.length;i++){
            var RESULT 		= d[i].RESULT.replace('\\','/').replace('\\','/').replace('\\','/').replace('\\','/').replace('\\','/').replace('\\','/').replace('\\','/').replace('\\','/').replace('\\','/').toString();  
            var TOKO     	= d[i].TOKO.toString();
            var STATION     = d[i].STATION.toString();  
            let data 		= RESULT.replace("Model","").replace("Model","").replace("Model","").replace("Status","").replace("Status","").replace("Status","").replace(/\r?\n|\r/g, " ").trim();
			let nama_file 	= './data/'+kdcab+'_'+TOKO+'_'+STATION+'.json';
			fs.writeFileSync(nama_file, data);
			sleep(1000)

			read(nama_file);
			 
          }
      	});
}

function read(file){
	fs.readFile(file, (err, data) => {
	    
	    try{
	    	 let student = JSON.parse(data);
			 for(var i =0;i<student.length;i++)
			 {
					    let ID = student[i].ID;
					    let CREATE_DATE = student[i].CREATE_DATE;
					    let CABANG = student[i].CABANG;
					    let TRIGGER_BY = student[i].TRIGGER_BY;
					    let SHOP = student[i].SHOP;
					    let IP = student[i].IP;
					    let STATION = student[i].STATION;
					    let PROCESSLIST = student[i].PROCESSLIST;
					    let CPU_USAGE = student[i].CPU_USAGE;
					    let CPU_USAGE_GLOBAL = student[i].CPU_USAGE_GLOBAL;
					    let CPU_TEMP_CORE_1 = student[i].CPU_TEMP_CORE_1;
					    let CPU_TEMP_CORE_2 = student[i].CPU_TEMP_CORE_2;
					    let CPU_TEMP_CORE_3 = student[i].CPU_TEMP_CORE_3;
					    let CPU_TEMP_CORE_4 = student[i].CPU_TEMP_CORE_4;
					    let MEMORY_USAGE = student[i].MEMORY_USAGE;
					    let MEMORY_AVAILABLE = student[i].MEMORY_AVAILABLE;
					    let MEMORY_TOTAL = student[i].MEMORY_TOTAL;
					    let PROCESSOR = student[i].PROCESSOR_CHIPSET;

					    let KAPASITAS_HDD_C = student[i].KAPASITAS_HDD_C;
					    let FREE_HDD_C = student[i].FREE_HDD_C;

					    let KAPASITAS_HDD_D = student[i].KAPASITAS_HDD_D;
					    let FREE_HDD_D = student[i].FREE_HDD_D;
					    
					    let KAPASITAS_HDD_E = student[i].KAPASITAS_HDD_E;
					    let FREE_HDD_E = student[i].FREE_HDD_E;
					    
					    let OS = student[i].OSNAME;
					    let LICENSED = student[i].LICENSED;
					    let HDD_STATUS = student[i].HDD_STATUS;
					    let INSTALLED_PROGRAM = student[i].INSTALLED_PROGRAM;
					    let UPTIME = student[i].UPTIME;

					    if(CREATE_DATE !== ''){
					    	var sql_query = "INSERT INTO hardware_info VALUES(NULL,'"+CREATE_DATE+"','"+TRIGGER_BY+"','"+CABANG+"','"+SHOP+"','"+IP+"','"+STATION+"','"+PROCESSLIST+"','"+CPU_USAGE.replace('-','0')+"','"+CPU_USAGE_GLOBAL.replace('-','0')+"','"+CPU_TEMP_CORE_1.replace('-','0')+"','"+CPU_TEMP_CORE_2.replace('-','0')+"','"+CPU_TEMP_CORE_3.replace('-','0')+"','"+CPU_TEMP_CORE_4.replace('-','0')+"','"+MEMORY_USAGE.replace('-','0')+"','"+MEMORY_AVAILABLE.replace('-','0')+"','"+MEMORY_TOTAL.replace('-','0')+"','"+UPTIME+"','"+PROCESSOR+"','"+KAPASITAS_HDD_C.replace('-','0')+"','"+KAPASITAS_HDD_D.replace('-','0')+"','"+KAPASITAS_HDD_E.replace('-','0')+"','"+FREE_HDD_C.replace('-','0')+"','"+FREE_HDD_D.replace('-','0')+"','"+FREE_HDD_E.replace('-','0')+"','"+OS+"','"+LICENSED+"','"+HDD_STATUS+"','"+INSTALLED_PROGRAM+"');";
						    mysqlLib.executeQuery(sql_query).then((d) => {
					            if(d.affectedRows > 0)
						        {  
						          console.log("file was successfull process");  
						        }
						        else
						        { 
						          console.log("file was failed process");
						        }
					      	});	
					    }else{

					    }
					  

				    }
	    } catch(exc){
	    	console.log("file was failed process, "+exc.message);
	    }
	   
	});
}

 

/*
  * * * * * *
  | | | | | |
  | | | | | day of week
  | | | | month
  | | | day of month
  | | hour
  | minute
  second ( optional )
*/
// Remove the error.log file every twenty-first day of the month.
// 0 0 */3 * * *
// * * */1 * * *
// cron.schedule('0 0 */1 * * *', async function() {
//   	console.log('--------------------------------');
//   	console.log('Cron Job Berjalan Setiap 1 Jam');
//     run_();
	          
// });






