var mysqlLib = require('../connection/mysql_connection');
var clickhouseLib = require('../connection/clickhouse_connect');
// var mqtt    = require('mqtt');
// const {gzip, ungzip} = require('node-gzip');

function get_jam(){
   var date = new Date();
   var jam = date.getHours();
   return jam;
}

function get_id(){
  var date = new Date();


  var tahun = date.getFullYear();
  var bulan = date.getMonth()+1;
  var res_bulan = "";
  if(bulan < 10){
      res_bulan = "0"+bulan;
  }else{  
      res_bulan = ""+bulan;
  }
  var tanggal = date.getDate();
  var res_tanggal = "";
  if(tanggal < 10){
      res_tanggal = "0"+tanggal;
  }else{  
      res_tanggal = ""+tanggal;
  }

  var jam = date.getHours();
  var menit = date.getMinutes();
  var res_menit = "";
  if(menit < 10){
      res_menit = "0"+menit;
  }else{  
      res_menit = ""+menit;
  }
  var detik = date.getSeconds();
  var res_detik = "";
  if(detik < 10){
      res_detik = "0"+detik;
  }else{  
      res_detik = ""+detik;
  }

  var concat = tahun+""+res_bulan+""+res_tanggal+""+jam+""+res_menit;

  return concat;
}

function get_subid(){
  var date = new Date();

  var tahun = date.getFullYear();
  var bulan = date.getMonth()+1;
  var res_bulan = "";
  if(bulan < 10){
      res_bulan = "0"+bulan;
  }else{  
      res_bulan = ""+bulan;
  }
  var tanggal = date.getDate();
  var res_tanggal = "";
  if(tanggal < 10){
      res_tanggal = "0"+tanggal;
  }else{  
      res_tanggal = ""+tanggal;
  }

  var jam = date.getHours();
  var menit = date.getMinutes();
  var res_menit = "";
  if(menit < 10){
      res_menit = "0"+menit;
  }else{  
      res_menit = ""+menit;
  }
  var detik = date.getSeconds();
  var res_detik = "";
  if(detik < 10){
      res_detik = "0"+detik;
  }else{  
      res_detik = ""+detik;
  }

  var concat = tahun+""+res_bulan+""+res_tanggal+""+jam+""+res_menit+""+res_detik;

  return concat;
}


function get_tanggal_jam(is_tanggal_jam){
  var date = new Date();

  var tahun = date.getFullYear();
  var bulan = date.getMonth()+1;
  var res_bulan = "";
  if(bulan < 10){
      res_bulan = "0"+bulan;
  }else{  
      res_bulan = ""+bulan;
  }
  var tanggal = date.getDate();
  var res_tanggal = "";
  if(tanggal < 10){
      res_tanggal = "0"+tanggal;
  }else{  
      res_tanggal = ""+tanggal;
  }

  var jam = date.getHours();
  var res_jam = "";
  if(jam < 10){
      res_jam = "0"+jam;
  }else{  
      res_jam = ""+jam;
  }
  var menit = date.getMinutes();
  var res_menit = "";
  if(menit < 10){
      res_menit = "0"+menit;
  }else{  
      res_menit = ""+menit;
  }
  var detik = date.getSeconds();
  var res_detik = "";
  if(detik < 10){
      res_detik = "0"+detik;
  }else{  
      res_detik = ""+detik;
  }

  var concat = "";
  if(is_tanggal_jam === "1"){
      concat = tahun+"-"+res_bulan+"-"+res_tanggal+" "+res_jam+":"+res_menit+":"+res_detik;
  }else if(is_tanggal_jam === "2"){
      concat = tahun+""+res_bulan+""+res_tanggal+""+res_jam+""+res_menit+""+res_detik;
  }else if(is_tanggal_jam === "3"){
      concat = tahun+""+res_bulan+""+res_tanggal;
  }else{
      concat = tahun+"-"+res_bulan+"-"+res_tanggal;
  }

  return concat;
}

function UnpackJSON(message){
    const parseJson = JSON.parse(obj);
    const IN_TASK = parseJson.TASK;
    const IN_ID = parseJson.ID;
    const IN_SOURCE = parseJson.SOURCE;
    const IN_OTP = parseJson.OTP;
    const IN_TANGGAL_JAM = parseJson.TANGGAL_JAM;
    const IN_VERSI = parseJson.VERSI;
    const IN_COMMAND = parseJson.COMMAND;
    const IN_HASIL = parseJson.HASIL;
    const IN_FROM = parseJson.FROM;
    const IN_TO = parseJson.TO;
    const IN_SN_HDD = parseJson.SN_HDD;
    const IN_IP_ADDRESS = parseJson.IP_ADDRESS;
    const IN_STATION = parseJson.STATION;
    const IN_CABANG = parseJson.CABANG;
    const IN_FILE = parseJson.FILE;
    const IN_NAMA_FILE = parseJson.NAMA_FILE;
    const IN_CHAT_MESSAGE = parseJson.CHAT_MESSAGE;
    const IN_REMOTE_PATH = parseJson.REMOTE_PATH;
    const IN_LOCAL_PATH = parseJson.LOCAL_PATH;
    const IN_SUB_ID = parseJson.SUB_ID;
}

function CreateMessage(TASK,ID,SOURCE,OTP,TANGGAL_JAM,VERSI,COMMAND,HASIL,FROM,TO,SN_HDD,IP_ADDRESS,STATION,CABANG,FILE,NAMA_FILE,CHAT_MESSAGE,REMOTE_PATH,LOCAL_PATH,SUB_ID){
  const IN_TASK = TASK;
  const IN_ID = ID;
  const IN_SOURCE = SOURCE;
  const IN_OTP = OTP;
  const IN_TANGGAL_JAM = TANGGAL_JAM;
  const IN_VERSI = VERSI;
  const IN_COMMAND = COMMAND;
  const IN_HASIL = HASIL;
  const IN_FROM = FROM;
  const IN_TO = TO;
  const IN_SN_HDD = SN_HDD;
  const IN_IP_ADDRESS = IP_ADDRESS;
  const IN_STATION = STATION;
  const IN_CABANG = CABANG;
  const IN_FILE = FILE;
  const IN_NAMA_FILE = NAMA_FILE;
  const IN_CHAT_MESSAGE = CHAT_MESSAGE;
  const IN_REMOTE_PATH = REMOTE_PATH;
  const IN_LOCAL_PATH = LOCAL_PATH;
  const IN_SUB_ID = SUB_ID;
  const myObj = {"TASK":IN_TASK, "ID":IN_ID, "SOURCE":IN_SOURCE,"OTP":IN_OTP,"TANGGAL_JAM":IN_TANGGAL_JAM,"VERSI":IN_VERSI,"COMMAND":IN_COMMAND,"HASIL":IN_HASIL,"FROM":IN_FROM,"TO":IN_TO,"SN_HDD":IN_SN_HDD,"IP_ADDRESS":IN_IP_ADDRESS,"STATION":IN_STATION,"CABANG":IN_CABANG,"FILE":IN_FILE,"NAMA_FILE":IN_NAMA_FILE,"CHAT_MESSAGE":IN_CHAT_MESSAGE,"REMOTE_PATH":IN_REMOTE_PATH,"LOCAL_PATH":IN_LOCAL_PATH,"SUB_ID":IN_SUB_ID};
  const res = JSON.stringify(myObj);
  return res;
}

const res_kdtk = ""
const res_nama = ""
const res_station = ""
const res_kdcab = ""

function get_identitas_toko(ip){
    return new Promise((resolve,reject) => {
        try{
            var sql_query = "SELECT TOKO,NAMA,STATION,KDCAB FROM tokomain where IP = '"+ip+"'";
            mysqlLib.executeQuery(sql_query).then((d) => {
                if(d.affectedRows > 0)
                {  
                     console.log(d.TOKO)
                     resolve(d);  
                }
                else
                { 
                      
                }
            });
        }catch(ex){
            reject(ex)
            console.log(ex.Stack);
        }
    });
}

async function ins_transreport (topic,obj,nama_table,operation) {

  return new Promise((resolve, reject) => {
    try{
     
      const parseJson = JSON.parse(obj);
      const IN_TASK = parseJson.TASK;
      const IN_ID = parseJson.ID;
      const IN_SOURCE = parseJson.SOURCE;
      const IN_OTP = parseJson.OTP;
      const IN_TANGGAL_JAM = parseJson.TANGGAL_JAM;
      const IN_VERSI = parseJson.VERSI;
      const IN_COMMAND = parseJson.COMMAND;
      const IN_HASIL = parseJson.HASIL;
      const IN_FROM = parseJson.FROM;
      const IN_TO = parseJson.TO;
      const IN_SN_HDD = parseJson.SN_HDD;
      const IN_IP_ADDRESS = parseJson.IP_ADDRESS;
      const IN_STATION = parseJson.STATION;
      const IN_CABANG = parseJson.CABANG;
      const IN_FILE = parseJson.FILE;
      const IN_NAMA_FILE = parseJson.NAMA_FILE;
      const IN_CHAT_MESSAGE = parseJson.CHAT_MESSAGE;
      const IN_REMOTE_PATH = parseJson.REMOTE_PATH;
      const IN_LOCAL_PATH = parseJson.LOCAL_PATH;
      const IN_SUB_ID = parseJson.SUB_ID;

      var kdtk = ""
      var nm_pc = ""
      var stat = ""
      var res_in_from = ""
      var res_in_to = ""
      var res_in_kdcab = IN_CABANG

      if(IN_SOURCE === "IDMCommandListeners"){
          try{
            res_in_from = IN_TO;
            res_in_to = IN_FROM;
            var qry = "SELECT TOKO,NAMA,STATION,KDCAB FROM tokomain where IP = '"+IN_IP_ADDRESS+"'";
                  mysqlLib.executeQuery(qry).then((d) => {
                    var code = 200;
                    console.log(d)
                    kdtk = d[0].TOKO.toString();
                    nm_pc = d[0].NAMA.toString();
                    stat = d[0].STATION.toString();
                    //console.log(kdtk+" - "+nm_pc)
                      if(operation === 'REPLACE'){
                        const sql_delete = "ALTER idmcmd."+nama_table+" DELETE WHERE KDTK = '"+kdtk+"' AND STATION = '"+stat+"';";
                        console.log(sql_delete);
                        clickhouseLib.ExecuteQueryClickHouse(sql_delete);  
                      }
                      const sql_query = "INSERT INTO idmcmd."+nama_table+" VALUES('"+res_in_kdcab+"',"
                                                    + "'"+IN_TASK.toUpperCase()+"',"
                                                    + "'"+IN_ID+"',"
                                                    + "'"+IN_SUB_ID+"',"
                                                    + "'"+IN_SOURCE+"',"
                                                    + "'"+res_in_from+"',"
                                                    + "'"+res_in_to+"',"
                                                    + "'"+IN_OTP+"',"
                                                    + "'"+kdtk+"',"
                                                    + "'"+nm_pc+"',"
                                                    + "'"+stat+"',"
                                                    + "'"+IN_IP_ADDRESS+"',"
                                                    + "'"+IN_SN_HDD+"',"
                                                    + "'"+IN_COMMAND.split("'").join('"').split("\\").join('/')+"',"
                                                    + "'"+IN_HASIL.split("'").join('"').split("\\").join('/')+"',"
                                                    + "'"+IN_CHAT_MESSAGE.replace("","")+"',"
                                                    + "'"+IN_NAMA_FILE.replace("","")+"',"
                                                    + "'"+IN_REMOTE_PATH.replace("","")+"',"
                                                    + "'"+IN_LOCAL_PATH.replace("","")+"',"
                                                    + "NOW(),"
                                                    + "'"+IN_VERSI+"',"
                                                    + "NULL,"
                                                    + "NOW());";
                      console.log(sql_query);
                      clickhouseLib.ExecuteQueryClickHouse(sql_query);    
                  }).catch(e => {
                    console.log(e);
                  });   


          }catch(exc){
            kdtk = "";
            nm_pc = "";
          }
      }else if(IN_SOURCE === "IDMCommander"){
          res_in_from = IN_TO;
          res_in_to = IN_FROM;
          try {
            if(res_in_from === 'IDMReporter'){
              const sql_query = "INSERT INTO idmcmd."+nama_table+" VALUES('"+res_in_kdcab+"',"
                                                    + "'"+IN_TASK.toUpperCase()+"',"
                                                    + "'"+IN_ID+"',"
                                                    + "'"+IN_SUB_ID+"',"
                                                    + "'"+IN_SOURCE+"',"
                                                    + "'"+res_in_from+"',"
                                                    + "'"+res_in_to+"',"
                                                    + "'"+IN_OTP+"',"
                                                    + "'"+kdtk+"',"
                                                    + "'"+nm_pc+"',"
                                                    + "'"+IN_STATION+"',"
                                                    + "'"+IN_IP_ADDRESS+"',"
                                                    + "'"+IN_SN_HDD+"',"
                                                    + "'"+IN_COMMAND.split("'").join('"').split("\\").join('/')+"',"
                                                    + "'"+IN_HASIL.split("'").join('"').split("\\").join('/')+"',"
                                                    + "'"+IN_CHAT_MESSAGE.replace("","")+"',"
                                                    + "'"+IN_NAMA_FILE.replace("","")+"',"
                                                    + "'"+IN_REMOTE_PATH.replace("","")+"',"
                                                    + "'"+IN_LOCAL_PATH.replace("","")+"',"
                                                    + "NOW(),"
                                                    + "'"+IN_VERSI+"',"
                                                    + "NULL,"
                                                    + "NOW());";
              console.log(sql_query);
              clickhouseLib.ExecuteQueryClickHouse(sql_query);      
            }else{
              var qry = "SELECT TOKO,NAMA,STATION,KDCAB FROM tokomain where IP = '"+res_in_from+"'";
                  mysqlLib.executeQuery(qry).then((d) => {
                    var code = 200;
                    console.log(d)
                    kdtk = d[0].TOKO.toString();
                    nm_pc = d[0].NAMA.toString();
                    stat = d[0].STATION.toString();
                    //console.log(kdtk+" - "+nm_pc)
                      const sql_query = "INSERT INTO idmcmd."+nama_table+" VALUES('"+res_in_kdcab+"',"
                                                    + "'"+IN_TASK.toUpperCase()+"',"
                                                    + "'"+IN_ID+"',"
                                                    + "'"+IN_SUB_ID+"',"
                                                    + "'"+IN_SOURCE+"',"
                                                    + "'"+res_in_from+"',"
                                                    + "'"+res_in_to+"',"
                                                    + "'"+IN_OTP+"',"
                                                    + "'"+kdtk+"',"
                                                    + "'"+nm_pc+"',"
                                                    + "'"+IN_STATION+"',"
                                                    + "'"+IN_IP_ADDRESS+"',"
                                                    + "'"+IN_SN_HDD+"',"
                                                    + "'"+IN_COMMAND.split("'").join('"').split("\\").join('/')+"',"
                                                    + "'"+IN_HASIL.split("'").join('"').split("\\").join('/')+"',"
                                                    + "'"+IN_CHAT_MESSAGE.replace("","")+"',"
                                                    + "'"+IN_NAMA_FILE.replace("","")+"',"
                                                    + "'"+IN_REMOTE_PATH.replace("","")+"',"
                                                    + "'"+IN_LOCAL_PATH.replace("","")+"',"
                                                    + "NOW(),"
                                                    + "'"+IN_VERSI+"',"
                                                    + "NULL,"
                                                    + "NOW());";
                      console.log(sql_query);
                      clickhouseLib.ExecuteQueryClickHouse(sql_query);    
                  }).catch(e => {
                    console.log("ERROR GET ATTRIBUT TOKO : "+e);                          
                  });    
            } 

          }catch(exc) {
                  var qry = "SELECT TOKO,NAMA,STATION,KDCAB FROM tokomain where IP = '"+IP_ADDRESS+"'";
                  mysqlLib.executeQuery(qry).then((d) => {
                    var code = 200;
                    //console.log(d)
                    kdtk = d[0].TOKO.toString();
                    nm_pc = d[0].NAMA.toString();
                    const sql_query = "INSERT INTO idmcmd."+nama_table+" VALUES('"+res_in_kdcab+"',"
                                                    + "'"+IN_TASK.toUpperCase()+"',"
                                                    + "'"+IN_ID+"',"
                                                    + "'"+IN_SUB_ID+"',"
                                                    + "'"+IN_SOURCE+"',"
                                                    + "'"+res_in_from+"',"
                                                    + "'"+res_in_to+"',"
                                                    + "'"+IN_OTP+"',"
                                                    + "'"+kdtk+"',"
                                                    + "'"+nm_pc+"',"
                                                    + "'"+IN_STATION+"',"
                                                    + "'"+IN_IP_ADDRESS+"',"
                                                    + "'"+IN_SN_HDD+"',"
                                                    + "'"+IN_COMMAND.split("'").join('"').split("\\").join('/')+"',"
                                                    + "'"+IN_HASIL.split("'").join('"').split("\\").join('/')+"',"
                                                    + "'"+IN_CHAT_MESSAGE.replace("","")+"',"
                                                    + "'"+IN_NAMA_FILE.replace("","")+"',"
                                                    + "'"+IN_REMOTE_PATH.replace("","")+"',"
                                                    + "'"+IN_LOCAL_PATH.replace("","")+"',"
                                                    + "NOW(),"
                                                    + "'"+IN_VERSI+"',"
                                                    + "NULL,"
                                                    + "NOW());";
                    console.log(sql_query);
                    clickhouseLib.ExecuteQueryClickHouse(sql_query);  
                  }).catch(e => {
                    console.log(e);
                  });   
             
          }
      }else if(IN_SOURCE === "IDMReporter"){
          res_in_from = IN_FROM;
          res_in_to = IN_TO;
          console.log("SOURCE : "+IN_SOURCE);
      }else{
          const sql_query = "INSERT INTO idmcmd."+nama_table+" VALUES('"+res_in_kdcab+"',"
                                                    + "'"+IN_TASK.toUpperCase()+"',"
                                                    + "'"+IN_ID+"',"
                                                    + "'"+IN_SUB_ID+"',"
                                                    + "'"+IN_SOURCE+"',"
                                                    + "'"+res_in_from+"',"
                                                    + "'"+res_in_to+"',"
                                                    + "'"+IN_OTP+"',"
                                                    + "'"+kdtk+"',"
                                                    + "'"+nm_pc+"',"
                                                    + "'"+IN_STATION+"',"
                                                    + "'"+IN_IP_ADDRESS+"',"
                                                    + "'"+IN_SN_HDD+"',"
                                                    + "'"+IN_COMMAND.split("'").join('"').split("\\").join('/')+"',"
                                                    + "'"+IN_HASIL.split("'").join('"').split("\\").join('/')+"',"
                                                    + "'"+IN_CHAT_MESSAGE.replace("","")+"',"
                                                    + "'"+IN_NAMA_FILE.replace("","")+"',"
                                                    + "'"+IN_REMOTE_PATH.replace("","")+"',"
                                                    + "'"+IN_LOCAL_PATH.replace("","")+"',"
                                                    + "NOW(),"
                                                    + "'"+IN_VERSI+"',"
                                                    + "NULL,"
                                                    + "NOW());";
              console.log(sql_query);
              clickhouseLib.ExecuteQueryClickHouse(sql_query); 
              //console.log("SOURCE : "+IN_SOURCE);
      }
    }
    catch(ex){
      reject(ex)
      console.log(""+ topic+" > "+ex.Stack);
    }
  });  
}

function get_list_cabang(){

    var res_hasil = "";
    try{
      const sql_query = "SELECT TRIM(branch_code) AS branch_code FROM idm_org_branch ORDER BY branch_code ASC;";
      // console.log(sql_query)
      mysqlLib.executeQuery(sql_query).then((d) => {
          
          var arr = [];
          for(var i = 0;i<d.length;i++){
            //console.log(d[i].branch_code);  
            arr.push(d[i].branch_code.trim());
          }
          var hasil = {"data":arr};
          res_hasil = JSON.stringify(hasil);
         
          //console.log(res_hasil);
      });
       
      
    }
    catch(ex){
      console.log("ERROR : "+ex.Stack);
    }
}

function get_location_user(chat_id){

    const res_hasil = "";
    try{
      const sql_query = "SELECT LOCATION FROM idm_org_structure WHERE CHAT_ID = '"+chat_id+"' ORDER BY branch_code ASC;";
      console.log(sql_query)
      mysqlLib.executeQuery(sql_query).then((d) => {
          res_hasil = d[0].LOCATION.trim();
          return res_hasil;
      });
    }
    catch(ex){
      console.log("ERROR : "+ex.Stack);
      return ex.Stack;
    }
    
    
}

module.exports.ins_transreport = ins_transreport
module.exports.get_list_cabang = get_list_cabang
module.exports.get_id = get_id
module.exports.get_subid = get_subid
module.exports.get_tanggal_jam = get_tanggal_jam
module.exports.CreateMessage = CreateMessage
module.exports.get_location_user = get_location_user
module.exports.get_jam = get_jam