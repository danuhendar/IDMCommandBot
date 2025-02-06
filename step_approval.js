
var mqtt    = require('mqtt');
const {gzip, ungzip} = require('node-gzip');
var Promise = require('promise');
var mysqlLib = require('./connection/mysql_connection');
var service_controller = require('./controller/service_controller');
const fs = require('fs');
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const {NodeSSH} = require('node-ssh')

const ssh = new NodeSSH()



fs.readFile('appconfig.json', (err, data) => {
    if (err) throw err;
    let student = JSON.parse(data);
});



var client  = mqtt.connect("mqtt://172.24.16.131",{clientId:"IDMCommandBOT_Baru",clean:true,port:1883,retain:false});
client.on("connect", function(){    
    console.log("connected MQTT");
    subs_DCCommand('RES_OTP/IDMCommandBot');
    subs_DCCommand('NOTIFIKASI_BOT/');
    subs_DCCommand('RES_DRC/IDMCommandBot');
    subs_DCCommand('SECURITY_LOGIN/+/IDMCommandV2Bot/');
    subs_DCCommand('MONITORING_BACKEND/');
});

client.on("error",function(error){
    console.log("Can't connect MQTT Broker : " + error);
    process.exit(1)
});

// replace the value below with the Telegram token you receive from @BotFather
const token = '5408760134:AAEC_nJp9KClpr7ewlQSwrqBPh9J2HVrkjc';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});
bot.onText(/\/start/, (msg) => {
    try{    
            const sql_query = "SELECT EXISTS(SELECT BRANCH AS LOCATION FROM idmcmd2.ws_personil WHERE ChatIDTelegram = '"+msg.chat.id+"') AS HASIL;";
            //console.log(sql_query)
            mysqlLib.executeQuery(sql_query).then((d) => {
                  const res_hasil = d[0].HASIL;
                  if(res_hasil == '1'){
                      //-- pengecekan list pengajuan broadcast --//       
                     bot.sendMessage(msg.chat.id, 'Selamat Datang, Pak '+msg.chat.username+' di IDMCommandBot');         
                 }else{
                     bot.sendMessage(msg.chat.id, 'Selamat Datang, Pak '+msg.chat.username+' di IDMCommandBot, anda belum terdaftar di idmcommandbot. Silahkan melakukan memilih menu shortcut /daftar untuk mendaftarkan user anda. Terimakasih')
                 }
                 
            });
    }catch(exc){
           bot.sendMessage(msg.chat.id, "Mohon maaf terjadi kesalahan, "+exc.Stack);
           
    }

   
});


const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const Username = msg.chat.username;

    if(msg.text.toString().includes('list_broadcast')){
        //-- pengecekan jabtan --//
        const sql_query = "SELECT BRANCH AS LOCATION,NIK,NAMA,JABATAN,LOKASI FROM idmcmd2.ws_personil WHERE ChatIDTelegram = '"+chatId+"';";
        console.log(sql_query)
        mysqlLib.executeQuery(sql_query).then((d) => {
            const res_hasil = d[0].LOCATION.trim();
            const res_nik = d[0].NIK;
            const res_nama = d[0].NAMA;
            const res_jabatan = d[0].JABATAN;
            const res_lokasi_personil = d[0].LOKASI;
            //-- pengecekan list pengajuan broadcast --//
            if(res_jabatan == 'REGIONAL_MANAGER'){
                const sql_query_list_bc = "SELECT COUNT(CREATE_DATE) AS JUMLAH FROM broadcast_pengajuan_new WHERE IS_APPROVAL = '0' AND STEP_APPROVAL = '"+res_jabatan+"' AND DATE(CREATE_DATE) = CURDATE() AND OTP = '';"
                //console.log(sql_query_list_bc);
                mysqlLib.executeQuery(sql_query_list_bc).then((d) => {
                const res_hasil_list_bc = parseFloat(d[0].JUMLAH);
                
                if(res_hasil_list_bc > 0){
                           //-- proses list broadcast command --//
                           const sql_query_bc_command = "SELECT CONCAT('/CMD','_',KDCAB,'_',SUB_ID,'_',REPLACE(NAMA,' ','')) AS ID FROM broadcast_pengajuan_new WHERE IS_APPROVAL = '0' AND DATE(CREATE_DATE) = CURDATE();"
                           mysqlLib.executeQuery(sql_query_bc_command).then((d) => {
                              //const list_bc_command = "";
                             var data = ""; 
                             for(var i = 0;i<d.length;i++){
                               const list_bc_command = d[i].ID;
                               if(i == (d.length-1)){
                                    data += list_bc_command;
                               }else{
                                    data += list_bc_command+"\n"; 
                               }
                               //console.log(list_bc_command)
                            } 
                            
                            //console.log(data)
                            try{
                                bot.sendMessage(msg.chat.id, "Berikut daftar broadcast command yang diajukan : \n"+data);
                            }catch(Ex){
                                console.error('Error : '+Ex.Message)
                            }
                            
                          }); 
                         
                      }else{
                            try{
                                bot.sendMessage(msg.chat.id, "Tidak ada daftar broadcast command yang diajukan oleh tim anda");
                            }catch(Ex){
                                console.error('Error : '+Ex.Message) 
                            }
                      }

                });
            }else{
                var res_KODE_CABANG = '';
                var res_repl_JABATAN = '';
                if(res_lokasi_personil == 'CABANG'){
                    res_KODE_CABANG = res_hasil
                    res_repl_JABATAN = res_jabatan+''
                }else if(res_lokasi_personil == 'REGIONAL'){
                    res_KODE_CABANG = res_hasil.split('RE0').join('REG');
                    res_repl_JABATAN = res_jabatan
                }
                const sql_query_list_bc = "SELECT COUNT(CREATE_DATE) AS JUMLAH "+
                                            " FROM idmcmd2.broadcast_pengajuan_new "+
                                            " WHERE IS_APPROVAL = '0' "+
                                            " AND STEP_APPROVAL = '"+res_repl_JABATAN+"' "+
                                            " AND DATE(CREATE_DATE) = CURDATE() "+
                                            " AND KDCAB = '"+res_KODE_CABANG+"'" +
                                            " AND OTP = '';"
                //const sql_query_list_bc = "SELECT COUNT(CREATE_DATE) AS JUMLAH FROM broadcast_pengajuan_new WHERE IS_APPROVAL = '0' AND STEP_APPROVAL = '"+res_jabatan+"' AND DATE(CREATE_DATE) = CURDATE() AND KDCAB = (SELECT BRANCH AS LOCATION FROM idmcmd2.ws_personil WHERE ChatIDTelegram = '"+msg.chat.id+"' ORDER BY NIK ASC LIMIT 0,1) AND OTP = '';"
                console.log(sql_query_list_bc);
                mysqlLib.executeQuery(sql_query_list_bc).then((d) =>     {
                const res_hasil_list_bc = parseFloat(d[0].JUMLAH);
                console.log('res_hasil_list_bc : '+res_hasil_list_bc)
                if(res_hasil_list_bc > 0){
                           //-- proses list broadcast command --//
                           const sql_query_bc_command = "SELECT CONCAT('/CMD','_',KDCAB,'_',SUB_ID,'_',REPLACE(NAMA,' ','')) AS ID FROM broadcast_pengajuan_new WHERE IS_APPROVAL = '0' AND DATE(CREATE_DATE) = CURDATE() AND STEP_APPROVAL = '"+res_repl_JABATAN+"' AND KDCAB = '"+res_KODE_CABANG+"' AND OTP = '';"
                           console.log(sql_query_bc_command)
                           mysqlLib.executeQuery(sql_query_bc_command).then((d) => {
                              //const list_bc_command = "";
                             var data = ""; 
                             for(var i = 0;i<d.length;i++){
                               const list_bc_command = d[i].ID;
                               if(i == (d.length-1)){
                                    data += list_bc_command;
                               }else{
                                    data += list_bc_command+"\n"; 
                               }
                               //console.log(list_bc_command)
                            } 
                            
                            //console.log(data)
                            try{
                                bot.sendMessage(msg.chat.id, "Berikut daftar broadcast command yang diajukan : \n"+data);    
                            }catch(Ex){
                                console.error('Error : '+Ex.Message) 
                            }
                            
                          }); 
                         
                      }else{
                            try{
                                bot.sendMessage(msg.chat.id, "Tidak ada daftar broadcast command yang diajukan oleh tim anda");
                            }catch(Ex){
                                console.error('Error : '+Ex.Message) 
                            }
                          
                      }

                });
            }
            

        });

        

    }else if (msg.text.toString().includes('OTP')) {
        
        const kdcab = msg.text.toString().split('_')[1];
        const sub_id = msg.text.toString().split('_')[2];
        const nama = msg.text.toString().split('_')[3];
        
        try{
            //-- pengecekan apakah data broadcast pengajuan sudah terapproval atau belum --//
            const sql_query_cek_data_pengajuan = "SELECT EXISTS(SELECT CREATE_DATE FROM broadcast_pengajuan_new WHERE IS_APPROVAL = '0' AND SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"' ) AS HASIL_CEK_DATA"
            console.log(sql_query_cek_data_pengajuan)
             
            mysqlLib.executeQuery(sql_query_cek_data_pengajuan).then((d) => {
                  //-- jika belum ter-approval maka lakukan proses generate OTP --//  
                  const hasil_cek_data = parseFloat(d[0].HASIL_CEK_DATA);
                  if(hasil_cek_data == 1){
                        //-- cek otorisasi OTP --//
                        //== IFNULL((SELECT IF(JABATAN='SUPPORT','SUPERVISOR',IF(JABATAN='SUPERVISOR','MANAGER','HO')) FROM `pattern_command` WHERE JUMLAH_KLIEN <= a.JUMLAH_CLIENT ORDER BY JUMLAH_KLIEN DESC LIMIT 0,1),'-') AS OTORISASI
                        // SELECT a.CREATE_DATE,a.KDCAB,a.JUMLAH_CLIENT,a.COMMAND_KIRIM,a.NIK,a.NAMA,a.JABATAN,a.TIPE,a.TOPIC_BC,(CASE a.IS_APPROVAL WHEN '0' THEN 'Pengajuan' WHEN '1' THEN 'OK' WHEN '2' THEN 'NOK' ELSE '' END) AS IS_APPROVAL,a.KETERANGAN,IFNULL((SELECT IF(JABATAN='SUPPORT','SUPERVISOR',IF(JABATAN='SUPERVISOR','MANAGER','HO')) FROM `pattern_command` WHERE JUMLAH_KLIEN <= a.JUMLAH_CLIENT ORDER BY JUMLAH_KLIEN DESC LIMIT 0,1),'-') AS OTORISASI,NIK_PEMBERI_OTP,NAMA_PEMBERI_OTP,DATE_FORMAT(CREATE_OTP,'%Y-%m-%d %H:%i:%s') AS CREATE_OTP  FROM broadcast_pengajuan a  WHERE IS_APPROVAL = '0' AND SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"'  ORDER BY a.CREATE_DATE DESC LIMIT 0,100
                        // const sql_cek_otorisasi = "SELECT SPLIT_STRING(a.JABATAN,'_',1) AS JABATAN,"+
                        //                                         " a.STEP_APPROVAL,"+
                        //                                         " IF(a.JABATAN='REGIONAL_MANAGER' OR a.JABATAN='EDP_HO',"+
                        //                                             " 'MANAGER_EDPHO',"+
                        //                                             " IF(LEFT(a.KDCAB,1)='G',"+
                        //                                                 " IF(a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'SUPERVISOR_CABANG' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)),'SUPERVISOR_CABANG','MANAGER_CABANG')"+
                        //                                             " ,"+
                        //                                                 " IF(a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'SUPERVISOR_REGION' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)),'SUPERVISOR_REGION',"+
                        //                                                     " IF(a.PROSENTASE_CLIENT>(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'SUPERVISOR_REGION' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)) AND a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'DEPUTI_MANAGER_REGION' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)),'DEPUTI_MANAGER_REGION',"+
                        //                                                         " IF(FLOOR(a.PROSENTASE_CLIENT)>(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'DEPUTI_MANAGER_REGION' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)) AND FLOOR(a.PROSENTASE_CLIENT)<=(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'MANAGER_REGION' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)),'MANAGER_REGION',"+
                        //                                                             " IF(a.PROSENTASE_CLIENT>(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'MANAGER_REGION' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)) AND a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'REGIONAL_MANAGER' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)),'MANAGER_EDPHO','MANAGER_EDPHO')"+
                        //                                                         " )"+
                        //                                                     " )"+
                        //                                                 " )"+
                        //                                             " ) "+
                                                                    
                        //                                         " ) AS OTORISASI"+
                        //                                         " FROM broadcast_pengajuan_new a  WHERE a.IS_APPROVAL = '0' AND a.SUB_ID = '"+sub_id+"' AND a.KDCAB = '"+kdcab+"' AND REPLACE(a.NAMA,' ','') = '"+nama+"'"
                        const sql_cek_otorisasi = "SELECT SPLIT_STRING(a.JABATAN,'_',1) AS JABATAN, "+
                                                    " a.STEP_APPROVAL, "+
                                                    " IF(a.STEP_APPROVAL='SUPERVISOR' AND LEFT(a.KDCAB,1)='G','MANAGER', "+
                                                    "        IF(a.STEP_APPROVAL='MANAGER' AND LEFT(a.KDCAB,1)='G','MANAGER', "+
                                                    "            IF(a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM ws_pattern_command WHERE JABATAN = 'SUPERVISOR' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR) AND LOKASI = 'REGIONAL'),'SUPERVISOR',"+  
                                                    "                IF(a.PROSENTASE_CLIENT>(SELECT JUMLAH_KLIEN FROM ws_pattern_command WHERE JABATAN = 'SUPERVISOR' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR) AND LOKASI = 'REGIONAL') AND a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM ws_pattern_command WHERE JABATAN = 'DEPUTY MANAGER' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR) AND LOKASI = 'REGIONAL'),'DEPUTY MANAGER','MANAGER') "+    
                                                    "            ) "+
                                                    "        ) "+
                                                    ") AS OTORISASI "+
                                                    " FROM broadcast_pengajuan_new a  "+
                                                    " WHERE a.IS_APPROVAL = '0' "+
                                                    " AND a.SUB_ID =  '"+sub_id+"' "+
                                                    " AND a.KDCAB = '"+kdcab+"' "+
                                                    " AND REPLACE(a.NAMA,' ','') = '"+nama+"' "+
                                                    " ;"
                        console.log("sql_cek_otorisasi : "+sql_cek_otorisasi)
                        
                        mysqlLib.executeQuery(sql_cek_otorisasi).then((d) => {
                              const res_otorisasi = d[0].OTORISASI;
                              //const res_jabatan = d[0].JABATAN.trim();
                                const sql_query = "SELECT BRANCH AS LOCATION,NIK,NAMA,JABATAN FROM idmcmd2.ws_personil WHERE ChatIDTelegram = '"+chatId+"' ORDER BY NIK ASC;";
                                console.log("sql_query_chat_id : "+sql_query)
                                mysqlLib.executeQuery(sql_query).then((d) => {
                                      const res_hasil = d[0].LOCATION;
                                      const res_nik = d[0].NIK;
                                      const res_nama = d[0].NAMA;
                                      const res_jabatan = d[0].JABATAN;

                                        if(res_otorisasi == res_jabatan){
                                            console.log("OTORISASI SUDAH SAMA : "+res_otorisasi+" - "+res_jabatan);
                                            //const message_send = "<b>Mohon maaf anda tidak bisa melakukan generate OTP atas pengajuan tersebut. Jumlah klien melebihi batas jangkauan Supervisor untuk melakukan Broadcast Command</b>"    
                                            //bot.sendMessage(chatId, message_send,{parse_mode: 'HTML'});
                                            try{
                                                bot.sendMessage(msg.chat.id, "Mohon tunggu, idmcommand akan memberikan OTP");
                                                pub_Command(chatId,res_hasil,res_nik,res_nama,kdcab,sub_id,nama);
                                            }catch(Ex){
                                                console.error('Error : '+Ex.Message) 
                                            }
                                            //console.log("Data ada");
                                        }else{
                                            console.log("OTORISASI BELUM SAMA : "+res_otorisasi+" - "+res_jabatan);
                                            try{
                                                bot.sendMessage(msg.chat.id, "Mohon tunggu, OTP akan idmcommand akan memberikan OTP");
                                                pub_Command(chatId,res_hasil,res_nik,res_nama,kdcab,sub_id,nama);
                                            }catch(Ex){
                                                console.error('Error : '+Ex.Message) 
                                            }
                                            

                                        }  

                                      
                                });
                                
                        });
                        
                  //-- jika sudah ter-approval muncul pesan bahwasanya data broadcast pengajuan sudah di eksekusi --//      
                  }else{
                        console.log("Not Data exists");
                        const sql_query = "SELECT DATE_FORMAT(CREATE_OTP,'%d %M %Y %H:%i:%s') AS CREATE_OTP,NAMA_PEMBERI_OTP FROM broadcast_pengajuan_new WHERE IS_APPROVAL = '0' AND SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"' ";
                        //console.log(sql_query)
                        mysqlLib.executeQuery(sql_query).then((d) => {
                            const res_tanggal_proses = d[0].CREATE_OTP;
                            const res_nama_pemberi_otp = d[0].NAMA_PEMBERI_OTP;
                               
                            var message_send = "Data pengajuan broadcast tersebut sudah ter-proses :</b>\n\n"
                                                +"Tanggal Pemberian OTP :\n"
                                                +""+res_tanggal_proses+""+"\n\n"
                                                +"Nama Pemberi OTP :\n"
                                                +""+res_nama_pemberi_otp+""+"\n\n\n"
                                                +"Lihat daftar pengajuan broadcast"+"\n"
                                                +"/start"
                                               ;
                            try{
                                bot.sendMessage(chatId, message_send);
                            }catch(Ex){
                                console.error('Error : '+Ex.Message) 
                            }                                
                            
                        });
                  }
                  
            });
            
           

            
        }catch(exc){
            console.log("ERROR : "+exc.tostring())
            try{
                bot.sendMessage(msg.chat.id, "Mohon maaf terjadi gangguan, silahkan kontak administrator idmcommand !!!");   
            }catch(Ex){
                console.error('Error : '+Ex.Message) 
            }
            
        }

        
    }else if (msg.text.toString().includes('APPROVAL')) {
        
        const kdcab = msg.text.toString().split('_')[1];
        const sub_id = msg.text.toString().split('_')[2];
        const nama = msg.text.toString().split('_')[3];
        
        try{
            const sql_query_step_approval = "SELECT STEP_APPROVAL FROM broadcast_pengajuan_new WHERE SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"'";
            //console.log(sql_query_step_approval)
            mysqlLib.executeQuery(sql_query_step_approval).then((d) => {
                const step_approval = d[0].STEP_APPROVAL;
                //-- pengecekan apakah data broadcast pengajuan sudah terapproval atau belum --//
                const sql_query_cek_data_pengajuan = "SELECT EXISTS(SELECT CREATE_DATE FROM broadcast_pengajuan_new WHERE SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"' AND STEP_APPROVAL = '"+step_approval+"') AS HASIL_CEK_DATA"
                //console.log(sql_query_cek_data_pengajuan)
                mysqlLib.executeQuery(sql_query_cek_data_pengajuan).then((d) => {
                      //-- jika belum ter-approval maka lakukan proses generate OTP --//  
                      const hasil_cek_data = parseFloat(d[0].HASIL_CEK_DATA);
                      if(hasil_cek_data == 1){
                            //-- cek otorisasi OTP --//
                            //== IFNULL((SELECT IF(JABATAN='SUPPORT','SUPERVISOR',IF(JABATAN='SUPERVISOR','MANAGER','HO')) FROM `pattern_command` WHERE JUMLAH_KLIEN <= a.JUMLAH_CLIENT ORDER BY JUMLAH_KLIEN DESC LIMIT 0,1),'-') AS OTORISASI
                            // SELECT a.CREATE_DATE,a.KDCAB,a.JUMLAH_CLIENT,a.COMMAND_KIRIM,a.NIK,a.NAMA,a.JABATAN,a.TIPE,a.TOPIC_BC,(CASE a.IS_APPROVAL WHEN '0' THEN 'Pengajuan' WHEN '1' THEN 'OK' WHEN '2' THEN 'NOK' ELSE '' END) AS IS_APPROVAL,a.KETERANGAN,IFNULL((SELECT IF(JABATAN='SUPPORT','SUPERVISOR',IF(JABATAN='SUPERVISOR','MANAGER','HO')) FROM `pattern_command` WHERE JUMLAH_KLIEN <= a.JUMLAH_CLIENT ORDER BY JUMLAH_KLIEN DESC LIMIT 0,1),'-') AS OTORISASI,NIK_PEMBERI_OTP,NAMA_PEMBERI_OTP,DATE_FORMAT(CREATE_OTP,'%Y-%m-%d %H:%i:%s') AS CREATE_OTP  FROM broadcast_pengajuan a  WHERE IS_APPROVAL = '0' AND SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"'  ORDER BY a.CREATE_DATE DESC LIMIT 0,100
                            // const sql_cek_otorisasi = "SELECT SPLIT_STRING(a.JABATAN,'_',1) AS JABATAN,"+
                            //                                     " a.STEP_APPROVAL,"+
                            //                                     " IF(a.JABATAN='REGIONAL_MANAGER' OR a.JABATAN='EDP_HO',"+
                            //                                         " 'MANAGER_EDPHO',"+
                            //                                         " IF(LEFT(a.KDCAB,1)='G',"+
                            //                                             " IF(a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'SUPERVISOR_CABANG' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)),'SUPERVISOR_CABANG','MANAGER_CABANG')"+
                            //                                         " ,"+
                            //                                             " IF(a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'SUPERVISOR_REGION' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)),'SUPERVISOR_REGION',"+
                            //                                                 " IF(a.PROSENTASE_CLIENT>(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'SUPERVISOR_REGION' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)) AND a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'DEPUTI_MANAGER_REGION' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)),'DEPUTI_MANAGER_REGION',"+
                            //                                                     " IF(FLOOR(a.PROSENTASE_CLIENT)>(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'DEPUTI_MANAGER_REGION' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)) AND FLOOR(a.PROSENTASE_CLIENT)<=(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'MANAGER_REGION' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)),'MANAGER_REGION',"+
                            //                                                         " IF(a.PROSENTASE_CLIENT>(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'MANAGER_REGION' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)) AND a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM m_pattern_command WHERE JABATAN = 'REGIONAL_MANAGER' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR)),'MANAGER_EDPHO','MANAGER_EDPHO')"+
                            //                                                     " )"+
                            //                                                 " )"+
                            //                                             " )"+
                            //                                         " ) "+
                                                                    
                            //                                     " ) AS OTORISASI"+
                            //                                     " FROM broadcast_pengajuan_new a  WHERE a.IS_APPROVAL = '0' AND a.SUB_ID = '"+sub_id+"' AND a.KDCAB = '"+kdcab+"' AND REPLACE(a.NAMA,' ','') = '"+nama+"'"
                            const sql_cek_otorisasi = "SELECT SPLIT_STRING(a.JABATAN,'_',1) AS JABATAN, "+
                                                        " a.STEP_APPROVAL, "+
                                                        " IF(a.STEP_APPROVAL='SUPERVISOR' AND LEFT(a.KDCAB,1)='G','MANAGER', "+
                                                        "        IF(a.STEP_APPROVAL='MANAGER' AND LEFT(a.KDCAB,1)='G','MANAGER', "+
                                                        "            IF(a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM ws_pattern_command WHERE JABATAN = 'SUPERVISOR' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR) AND LOKASI = 'REGIONAL'),'SUPERVISOR',"+  
                                                        "                IF(a.PROSENTASE_CLIENT>(SELECT JUMLAH_KLIEN FROM ws_pattern_command WHERE JABATAN = 'SUPERVISOR' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR) AND LOKASI = 'REGIONAL') AND a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM ws_pattern_command WHERE JABATAN = 'DEPUTY MANAGER' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR) AND LOKASI = 'REGIONAL'),'DEPUTY MANAGER','MANAGER') "+    
                                                        "            ) "+
                                                        "        ) "+
                                                        ") AS OTORISASI "+
                                                        " FROM broadcast_pengajuan_new a  "+
                                                        " WHERE a.IS_APPROVAL = '0' "+
                                                        " AND a.SUB_ID =  '"+sub_id+"' "+
                                                        " AND a.KDCAB = '"+kdcab+"' "+
                                                        " AND REPLACE(a.NAMA,' ','') = '"+nama+"' "+
                                                        " ;"
                            console.log(sql_cek_otorisasi)
                            mysqlLib.executeQuery(sql_cek_otorisasi).then((d) => {
                                  const res_otorisasi = d[0].OTORISASI.trim();
                                  const res_step_approval = d[0].STEP_APPROVAL.trim();
                                  //const res_jabatan = d[0].JABATAN.trim();
                                    const sql_query = "SELECT BRANCH AS LOCATION,NIK,NAMA,JABATAN FROM idmcmd2.ws_personil WHERE ChatIDTelegram = '"+chatId+"' ORDER BY NIK ASC;";
                                    //console.log(sql_query)
                                    mysqlLib.executeQuery(sql_query).then((d) => {
                                          const res_hasil = d[0].LOCATION;
                                          const res_nik = d[0].NIK;
                                          const res_nama = d[0].NAMA;
                                          const res_jabatan = d[0].JABATAN;

                                            if(res_otorisasi == res_jabatan){
                                                //const message_send = "<b>Mohon maaf anda tidak bisa melakukan generate OTP atas pengajuan tersebut. Jumlah klien melebihi batas jangkauan Supervisor untuk melakukan Broadcast Command</b>"    
                                                //bot.sendMessage(chatId, message_send,{parse_mode: 'HTML'});
                                                
                                              
                                            }else{
                                                //-- kirim pesan kepada user yang sedang melakukan approval --//
                                                try{
                                                    bot.sendMessage(msg.chat.id, "Mohon tunggu, Proses approval sedang diproses");    
                                                }catch(Ex){
                                                    console.error('Error : '+Ex.Message) 
                                                }
                                                
                                                var next_step_approval = "";
                                                if(res_step_approval == "SUPERVISOR" && kdcab.substring(0,1) == 'G'){
                                                    next_step_approval = "MANAGER";    
                                                }else if(res_step_approval == "SUPERVISOR" && kdcab.substring(0,1) == 'R'){
                                                    next_step_approval = "DEPUTY MANAGER";
                                                }else if(res_step_approval == "DEPUTY MANAGER"){
                                                    next_step_approval = "MANAGER";
                                                }


                                                var jam = service_controller.get_jam();
                                                var greeting = '';
                                                if(jam == 4 && jam <= 10){
                                                    greeting = 'Pagi';
                                                }else if(jam > 10 && jam <= 14){
                                                    greeting = 'Siang';
                                                }else if(jam > 14 && jam <= 17){
                                                    greeting = 'Sore';
                                                }else if(jam > 17 && jam <= 23){
                                                    greeting = 'Malam';
                                                }

                                                const sql_update_step_approval = "UPDATE broadcast_pengajuan_new SET STEP_APPROVAL = '"+next_step_approval+"' WHERE SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"'";
                                                //console.log(sql_update_step_approval);
                                                mysqlLib.executeQuery(sql_update_step_approval).then((d) => {
                                                    //console.log("HASIL : "+d.affectedRows)
                                                    if(parseFloat(d.affectedRows)>0){
                                                        bot.sendMessage(msg.chat.id, "Approval "+step_approval.toLowerCase()+" berhasil. Terimakasih");
                                                        
                                                        //-- kirim pesan kepada user selanjutnya yang akan melakukan approval --//
                                                        const sql_identitas_broadcast = "SELECT NIK,NAMA,CONCAT('/CMD','_',KDCAB,'_',SUB_ID,'_',REPLACE(NAMA,' ','')) AS ID,IF(LENGTH(COMMAND_KIRIM)>200,CONCAT(CONVERT(COMMAND_KIRIM,CHAR(200)),' dst.'),COMMAND_KIRIM) AS COMMAND_KIRIM,JUMLAH_CLIENT FROM broadcast_pengajuan_new WHERE SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"';";
                                                        //console.log(sql_identitas_broadcast);
                                                        mysqlLib.executeQuery(sql_identitas_broadcast).then((d) => {
                                                            var nik_pemohon = d[0].NIK;
                                                            var nama_pemohon = d[0].NAMA;
                                                            var id = d[0].ID;
                                                            var command_kirim = d[0].COMMAND_KIRIM;
                                                            var jumlah_client = d[0].JUMLAH_CLIENT;

                                                            var sql_info_next_step_approval = "";
                                                            if(next_step_approval == "REGIONAL_MANAGER" || next_step_approval == "MANAGER_EDPHO"){
                                                                sql_info_next_step_approval = "SELECT ChatIDTelegram AS CHAT_ID,NAMA FROM ws_personil where JABATAN = '"+next_step_approval+"' AND BRANCH = 'EDP HO';";
                                                            }else{
                                                                sql_info_next_step_approval = "SELECT ChatIDTelegram as CHAT_ID,NAMA FROM idmcmd2.ws_personil where JABATAN = '"+next_step_approval+"' AND BRANCH = '"+res_hasil+"';";
                                                            }
                                                            
                                                            //console.log(sql_info_next_step_approval);
                                                            mysqlLib.executeQuery(sql_info_next_step_approval).then((d) => {
                                                                //console.log("HASIL : "+d.affectedRows)
                                                                for(var i = 0;i<d.length;i++){
                                                                    const chat_id_next_step_approval = d[i].CHAT_ID.trim();
                                                                    const nama_next_step_approval = d[i].NAMA;
                                                                    
                                                                    
                                                                    var message_send = "<b>Selamat "+greeting+" Pak <i>"+nama_next_step_approval+"</i>, anda mendapatkan permohonan broadcast command/sql :</b>\n\n"
                                                                                        +"<b>Nama Pemohon :</b>\n"
                                                                                        +"<i>"+nama_pemohon+"</i>"+"\n\n"
                                                                                        +"<b>ID :</b>\n"
                                                                                        +"<i>"+id+"</i>"+"\n\n\n"
                                                                                       ;
                                                                    try{
                                                                        bot.sendMessage(chat_id_next_step_approval, message_send,{parse_mode: 'HTML'});
                                                                    }catch(Ex){
                                                                        console.error('Error : '+Ex.Message) 
                                                                    }
                                                                }
                                                            });

                                                            //-- kirim pesan kepada user pemohon yang mengajukan broadcast --//
                                                            const sql_identitas_pemohon = "SELECT ChatIDTelegram as CHAT_ID FROM idmcmd2.ws_personil WHERE NIK = '"+nik_pemohon+"';";
                                                            //console.log(sql_identitas_pemohon);
                                                                mysqlLib.executeQuery(sql_identitas_pemohon).then((d) => {
                                                                var chat_id_pemohon = d[0].CHAT_ID;
                                                                //console.log("CHAT ID PEMOHON : "+chat_id_pemohon);
                                                                var message_send_ke_pemohon = "<b>Selamat "+greeting+" Pak <i>"+nama_pemohon+"</i>, berikut tracking permohonan broadcast command/sql anda :</b>\n\n"
                                                                                            +"<b>Nama Pemohon :</b>\n"
                                                                                            +"<i>"+nama_pemohon+"</i>"+"\n\n"
                                                                                            +"<b>Telah di approve oleh :</b>\n"
                                                                                            +"<i>"+res_nama+" ("+res_jabatan+") "+"</i>"+"\n\n"
                                                                                            +"<b>Tanggal/Jam :</b>\n"
                                                                                            +"<i>"+service_controller.get_tanggal_jam("1")+" WIB</i>"+"\n\n"
                                                                                            +"<b>Command :</b>\n"
                                                                                            +"<i>"+command_kirim+"</i>"+"\n\n"
                                                                                            +"<b>Jumlah Klien :</b>\n"
                                                                                            +"<i>"+jumlah_client+"</i>"+"\n\n"
                                                                                            +"<b>ID :</b>\n"
                                                                                            +"<i>"+id.replace("/CMD_","")+"</i>"+"\n\n\n"
                                                                                           ;
                                                                try{
                                                                    bot.sendMessage(chat_id_pemohon, message_send_ke_pemohon,{parse_mode: 'HTML'});
                                                                }catch(Ex){
                                                                    console.error('Error : '+Ex.Message) 
                                                                }                        
                                                                
                                                            });

                                                        });

                                                    }else{
                                                        try{
                                                            bot.sendMessage(msg.chat.id, "Approval "+step_approval.toLowerCase()+" gagal. Silahkan hubungi administrator idmcommand untuk proses pengecekan. Terimakasih");
                                                        }catch(Ex){
                                                            console.error('Error : '+Ex.Message) 
                                                        }  
                                                        
                                                    }
                                                });
                                                //console.log("Data ada");
                                            }  

                                          
                                    });
                                    
                            });
                      //-- jika sudah ter-approval muncul pesan bahwasanya data broadcast pengajuan sudah di eksekusi --//      
                      }else{
                            //console.log("Not Data exists");
                            const sql_query = "SELECT DATE_FORMAT(CREATE_OTP,'%d %M %Y %H:%i:%s') AS CREATE_OTP,NAMA_PEMBERI_OTP FROM broadcast_pengajuan_new WHERE IS_APPROVAL = '0' AND SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"' ";
                            //console.log(sql_query)
                            mysqlLib.executeQuery(sql_query).then((d) => {
                                const res_tanggal_proses = d[0].CREATE_OTP;
                                const res_nama_pemberi_otp = d[0].NAMA_PEMBERI_OTP;
                                   
                                var message_send = "<b>Data pengajuan broadcast tersebut sudah ter-proses :</b>\n\n"
                                                    +"<b>Tanggal Pemberian OTP :</b>\n"
                                                    +"<i>"+res_tanggal_proses+"</i>"+"\n\n"
                                                    +"<b>Nama Pemberi OTP :</b>\n"
                                                    +"<i>"+res_nama_pemberi_otp+"</i>"+"\n\n\n"
                                                    +"Lihat daftar pengajuan broadcast"+"\n"
                                                    +"/start"
                                                   ;
                                try{
                                    bot.sendMessage(chatId, message_send,{parse_mode: 'HTML'});
                                }catch(Ex){
                                    console.error('Error : '+Ex.Message) 
                                }                                
                                
                            });
                      }
                      
                });

            });
           
           

            
        }catch(exc){
            console.log("ERROR : "+exc.tostring())
            bot.sendMessage(msg.chat.id, "Mohon maaf terjadi gangguan, silahkan kontak administrator idmcommand !!!");   
        }

        
    }
    else if(msg.text.toString().includes('daftar')){
        // send a message to the chat acknowledging receipt of their message
        try{    
            const sql_query = "SELECT EXISTS(SELECT Branch FROM idmcmd2.ws_personil WHERE ChatIDTelegram = '"+msg.chat.id+"') AS HASIL;";
            //console.log(sql_query)
            mysqlLib.executeQuery(sql_query).then((d) => {
                  const res_hasil = d[0].HASIL;
                  if(res_hasil == '1'){
                     //-- pengecekan list pengajuan broadcast --//     
                    try{
                        bot.sendMessage(msg.chat.id, 'Anda sudah terdaftar pada sistem IDMCommandBot');         
                    }catch(Ex){
                        console.error('Error : '+Ex.Message) 
                    }
                     
                 }else{
                    try{
                        bot.sendMessage(msg.chat.id, "Masukan NIK anda contoh : #2013001002");
                    }catch(Ex){
                        console.error('Error : '+Ex.Message) 
                    }
                    
                 }
            });
        }catch(exc){
            try{
                bot.sendMessage(msg.chat.id, "Mohon maaf terjadi kesalahan, "+exc.Stack);
            }catch(Ex){
                console.error('Error : '+Ex.Message) 
            }
           
        }
        
       
    }else if(msg.text.toString().includes('#')){
        const nik_user = msg.text.toString().split("#").join('');
        const sql_query_cek_nik = "SELECT EXISTS(SELECT NIK FROM idmcmd2.ws_personil WHERE NIK = '"+nik_user+"') AS HASIL;";
        //console.log(sql_query_cek_nik)
        mysqlLib.executeQuery(sql_query_cek_nik).then((d) => {
            const res_hasil_cek_nik = d[0].HASIL;
            if(res_hasil_cek_nik == '1'){

                const sql_query_jabatan = "SELECT IF(a.JABATAN='ADMINISTRATOR' OR a.JABATAN LIKE 'SUPERVISOR%' OR a.JABATAN LIKE '%MANAGER%' OR a.JABATAN LIKE 'SUPPORT%' OR a.JABATAN LIKE 'EDP%' OR a.JABATAN LIKE '%DEPUTY%' OR a.JABATAN LIKE '%KOORDINATOR%','1','0') AS HASIL FROM idmcmd2.ws_personil a WHERE a.NIK = '"+nik_user+"';";
                //console.log(sql_query_jabatan)
                mysqlLib.executeQuery(sql_query_jabatan).then(async (d) => {
                     const res_hasil_jabatan = d[0].HASIL.trim();
                     if(res_hasil_jabatan == '1'){
                        try{
                                //-- proses update chat id berdasarkan nik yang mendaftar --//
                                const sql_query = "UPDATE idmcmd2.ws_personil SET ChatIDTelegram = '"+chatId+"' WHERE NIK = '"+nik_user+"';";
                                //console.log(sql_query)

                                mysqlLib.executeQuery(sql_query).then((d) => {
                                    try{
                                        bot.sendMessage(msg.chat.id, 'Selamat, Anda telah terdaftar pada idmcommandbot'); 
                                    }catch(Ex){
                                        console.error('Error : '+Ex.Message) 
                                    }
                                    
                                });   

                                //-- pengecekan list pengajuan broadcast --//
                                let res_repl_lokasi = await mysqlLib.executeQuery("SELECT IF(LEFT(Branch,3)='RE0',REPLACE(Branch,'RE0','REG'),Branch) AS LOKASI FROM idmcmd2.ws_personil WHERE ChatIDTelegram = '"+msg.chat.id+"' ORDER BY NIK ASC LIMIT 0,1");
                                let res_get_lokasi = res_repl_lokasi[0].LOKASI;
                                const sql_query_list_bc = "SELECT COUNT(CREATE_DATE) AS JUMLAH FROM broadcast_pengajuan_new WHERE IS_APPROVAL = '0' AND DATE(CREATE_DATE) = CURDATE() AND KDCAB = '"+res_get_lokasi+"';"
                                console.log(sql_query_list_bc);
                                mysqlLib.executeQuery(sql_query_list_bc).then((d) => {
                                    const res_hasil_list_bc = parseFloat(d[0].JUMLAH);
                                    if(res_hasil_list_bc > 0){
                                        //-- proses list broadcast command --//
                                        const sql_query_bc_command = "SELECT CONCAT('/CMD','_',KDCAB,'_',SUB_ID,'_',REPLACE(NAMA,' ','')) AS ID FROM broadcast_pengajuan_new WHERE IS_APPROVAL = '0' AND DATE(CREATE_DATE) = CURDATE() AND KDCAB = '"+res_get_lokasi+"';"
                                        mysqlLib.executeQuery(sql_query_bc_command).then((d) => {
                                            //const list_bc_command = "";
                                            //console.log(d.length);
                                            var data = ""; 
                                            for(var i = 0;i<d.length;i++){
                                                   const list_bc_command = d[i].ID;
                                                   if(i == (d.length-1)){
                                                        data += list_bc_command;
                                                   }else{
                                                        data += list_bc_command+"\n"; 
                                                   }
                                                   console.log(list_bc_command)
                                            } 
                                            // bot.sendMessage(msg.chat.id, list_bc_command);  
                                            //console.log(data)
                                            try{
                                                bot.sendMessage(msg.chat.id, "Berikut daftar broadcast command yang diajukan : \n"+data);
                                            }catch(Ex){
                                                console.error('Error : '+Ex.Message) 
                                            }
                                            
                                        }); 
                                       
                                    }else{
                                        try{
                                            bot.sendMessage(msg.chat.id, "Tidak daftar broadcast command yang diajukan oleh tim anda");
                                        }catch(Ex){
                                            console.error('Error : '+Ex.Message) 
                                        }
                                    }
                                }); 
                        }catch(exc){
                            try{
                                bot.sendMessage(msg.chat.id, "Mohon maaf terjadi gangguan saat pendaftaran user, silahkan kontak administrator !!!");    
                            }catch(Ex){
                                console.error('Error : '+Ex.Message) 
                            }
                        }
                       
                    }else{
                        try{
                            bot.sendMessage(msg.chat.id, "Mohon maaf anda tidak berhak mengakses menu idmcommandbot !!!");    
                        }catch(Ex){
                            console.error('Error : '+Ex.Message) 
                        }
                        
                    }
                });   

           }else{
                try{
                    bot.sendMessage(msg.chat.id, "NIK : "+nik_user+" tidak ada dalam sistem idmcommand, mohon cek kembali inputan nik.");
                }catch(Ex){
                    console.error('Error : '+Ex.Message) 
                }
           }


        });   

    }else if(msg.text.toString().includes('CMD')){
        const pesan = msg.text.toString();
        const kdcab = pesan.split('_')[1];
        const sub_id = pesan.split('_')[2];
        const nama = pesan.split('_')[3];
        const sql_query = "SELECT BRANCH AS LOCATION,NIK,NAMA,JABATAN FROM idmcmd2.ws_personil WHERE ChatIDTelegram = '"+chatId+"' ORDER BY NIK ASC;";
        console.log(sql_query)
        mysqlLib.executeQuery(sql_query).then((d) => {
            const res_hasil = d[0].LOCATION.trim();
            const res_nik = d[0].NIK;
            const res_nama = d[0].NAMA;
            const res_jabatan = d[0].JABATAN;
            if(res_jabatan.includes('SUPPORT')){
                try{
                    const message = "Mohon maaf anda tidak berhak untuk mengakses informasi broadcast tersebut!"
                    bot.sendMessage(msg.chat.id, message); 
                }catch(Ex){
                    console.error('Error : '+Ex.Message) 
                }
                
            }else{
                try{
                    //--munculkan detail command yang akan di broadcast --//
                    const sql_query_command_kirim = "SELECT DATE_FORMAT(a.CREATE_DATE,'%d %M %Y %H:%i:%s') AS CREATE_DATE, "+
                                                            "a.NAMA, "+
                                                            "a.JABATAN, "+
                                                            "a.TIPE_BC AS TIPE, "+
                                                            "a.TIPE AS TUJUAN_BROADCAST, "+
                                                            "a.JUMLAH_CLIENT, "+
                                                            "a.STEP_APPROVAL, "+
                                                            "a.PROSENTASE_CLIENT,"+
                                                            " IF(a.STEP_APPROVAL='SUPERVISOR' AND LEFT(a.KDCAB,1)='G','MANAGER', "+
                                                            "        IF(a.STEP_APPROVAL='MANAGER' AND LEFT(a.KDCAB,1)='G','MANAGER', "+
                                                            "            IF(a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM ws_pattern_command WHERE JABATAN = 'SUPERVISOR' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR) AND LOKASI = 'REGIONAL'),'SUPERVISOR',"+  
                                                            "                IF(a.PROSENTASE_CLIENT>(SELECT JUMLAH_KLIEN FROM ws_pattern_command WHERE JABATAN = 'SUPERVISOR' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR) AND LOKASI = 'REGIONAL') AND a.PROSENTASE_CLIENT<=(SELECT JUMLAH_KLIEN FROM ws_pattern_command WHERE JABATAN = 'DEPUTY MANAGER' AND CONVERT(TIPE_BC,CHAR) = CONVERT(a.TIPE_BC,CHAR) AND LOKASI = 'REGIONAL'),'DEPUTY MANAGER','MANAGER') "+    
                                                            "            ) "+
                                                            "        ) "+
                                                            ") AS OTORISASI_TERAKHIR, "+
                                                            " LENGTH(a.COMMAND_KIRIM) AS PANJANG_COMMAND, "+
                                                            " a.COMMAND_KIRIM, "+
                                                            " a.KETERANGAN, "+
                                                            " a.TOPIC_BC "+
                                                            
                                                            " FROM idmcmd2.broadcast_pengajuan_new a "+
                                                            " WHERE a.KDCAB = '"+kdcab+"'"+ 
                                                            " AND a.SUB_ID = '"+sub_id+"'"+ 
                                                            " AND a.IS_APPROVAL = '0'"+
                                                            " AND a.STEP_APPROVAL RLIKE '"+res_jabatan+"'"+ 
                                                            " AND REPLACE(a.NAMA,' ','') = '"+nama+"'"+
                                                            " GROUP BY a.SUB_ID ;"
                    console.log("sql_query_command_kirim : "+sql_query_command_kirim)
    
                    mysqlLib.executeQuery(sql_query_command_kirim).then((d) => {
                        try{
                            const create_date = d[0].CREATE_DATE;
                            const nama = d[0].NAMA;
                            const jabatan = d[0].JABATAN;
                            const tipe = d[0].TIPE;
                            const jumlah_client = d[0].JUMLAH_CLIENT;
                            const command_kirim = d[0].COMMAND_KIRIM;
                            const keterangan = d[0].KETERANGAN;
                            const step_approval = d[0].STEP_APPROVAL;
                            const otorisasi_terakhir = d[0].OTORISASI_TERAKHIR;
                            console.log("step_approval : "+step_approval+" VS "+otorisasi_terakhir)
                            const tujuan_broadcast = d[0].TUJUAN_BROADCAST;
                            const panjang_command = d[0].PANJANG_COMMAND;
                            const topic_bc = d[0].TOPIC_BC;
    
                            var is_generate_otp_or_approval = "";
                            var is_perintah_generate_otp_or_approval = "";
                            if(step_approval != otorisasi_terakhir){
                                is_generate_otp_or_approval = "/APPROVAL_"+kdcab+"_"+sub_id+"_"+nama.split(" ").join('').split(' ').join('').split(' ').join('')+"\n\n";
                                is_perintah_generate_otp_or_approval = "*) Mohon Bapak SPV/MGR untuk melakukan supervisi terhadap command yang akan di broadcast sebelum melakukan approval pengajuan broadcast.\n\n"+"<b><i>Silahkan klik link dibawah untuk approval ke level selanjutnya</i></b>\n";
                            }else if(step_approval == otorisasi_terakhir){
                                is_generate_otp_or_approval = "/OTP_"+kdcab+"_"+sub_id+"_"+nama.split(" ").join('').split(' ').join('').split(' ').join('')+"\n\n";
                                is_perintah_generate_otp_or_approval = "*) Mohon Bapak SPV/MGR untuk melakukan supervisi terhadap command yang akan di broadcast sebelum melakukan generate OTP.\n\n"+"<b><i>Silahkan klik link dibawah untuk generate OTP</i></b>\n";
                            }else{
    
                            }
    
                            var is_tolak = "/REJECT_"+kdcab+"_"+sub_id+"_"+nama.split(" ").join('').split(' ').join('').split(' ').join('');
                            //console.log("MESSAGE TOLAK : "+is_tolak);
                            var message = "";
                            //if(tipe == 'CMD'){
                                var is_approval = "";
                                var res_step_approval = step_approval;
                                var next_step_approval = "";
                                if(res_step_approval == "SUPERVISOR" && kdcab.substring(0,1) == 'G'){
                                    next_step_approval = "MANAGER";    
                                }else if(res_step_approval == "SUPERVISOR" && kdcab.substring(0,1) == 'R'){
                                    next_step_approval = "DEPUTY MANAGER";
                                }else if(res_step_approval == "DEPUTY MANAGER"){
                                    next_step_approval = "MANAGER";
                                }
    
                                if(step_approval != otorisasi_terakhir){
                                    is_approval = "<b>Approval 1 :</b>\n"
                                        +"<i>"+step_approval+"</i>"+"\n\n"
                                        +"<b>Approval 2 :</b>\n"
                                        +"<i>"+next_step_approval+"</i>"+"\n\n\n"
                                }else{
                                    is_approval = "<b>Approval 1 :</b>\n"
                                        +"<i>"+step_approval+"</i>"+"\n\n\n"
                                }
    
                                //console.log('is_approval : '+is_approval);
                                //--------------------------- HANDLE CMD BROADCAST MESSAGE -------------------------//    
                                if(tipe == 'CMD'){
                                   
    
                                    var message_body = "";  
                                    var jumlah_karakter_pesan_untuk_split = 600;      
                                    if(parseFloat(panjang_command) > jumlah_karakter_pesan_untuk_split){
                                    
                                    var res_tujuan_broadcast = '';
                                    if(tujuan_broadcast == 'REGIONAL' || tujuan_broadcast == 'REGIONAL SOME STORES'){
                                        res_tujuan_broadcast = tujuan_broadcast+'-'+topic_bc;
                                    }else{
                                        res_tujuan_broadcast = tujuan_broadcast;
                                    }
    
                                    var header_message = "<b>Tanggal Broadcast :</b>\n"
                                        +"<i>"+create_date+"</i>"+"\n\n"
                                        +"<b>Nama :</b>\n"
                                        +"<i>"+nama+"</i>"+"\n\n"
                                        +"<b>Jabatan :</b>\n"
                                        +"<i>"+jabatan+"</i>"+"\n\n"
                                        +"<b>Tipe :</b>\n"
                                        +"<i>"+tipe+"</i>"+"\n\n"
                                        +"<b>Penerima :</b>\n"
                                        +"<i>"+tujuan_broadcast+"</i>"+"\n\n"
                                        +"<b>Command :</b>\n";
                                        
                                    (async () => {
                                      await  bot.sendMessage(msg.chat.id, header_message,{parse_mode: 'HTML'});
                                      //process.exit();
                                      console.log("Send Header");
                                      await sleep(3000); 
                                    })();   
    
                                        var total_message_split = parseFloat(panjang_command) / jumlah_karakter_pesan_untuk_split;
                                        var res_total_message_split = Math.floor(total_message_split);
    
                                        var awal = 0;
                                        var akhir = jumlah_karakter_pesan_untuk_split;
                                         
                                        console.log("PANJANG COMMAND KIRIM : "+panjang_command);
                                        console.log("BAGIAN POTONGAN PESAN : "+parseFloat(res_total_message_split));
                                            //-- jika potongan pesan lebih dari 1 maka pengiriman pesan lebih dari satu kali --//
                                            if(parseFloat(res_total_message_split) > 1){
                                                for(var i = 0;i<parseFloat(res_total_message_split);i++){
    
                                                    if(i == (parseFloat(res_total_message_split)-1)){
                                                        console.log("PANJANGAN POINTER AKHIR MELEBIHI PANJANG COMMAND : "+akhir+" VS "+parseFloat(panjang_command));
                                                        //message_body = command_kirim.substring(akhir,parseFloat(panjang_command))+""+"\n\n";
                                                        //console.log("message_body "+i+" : "+message_body);
                                                        var footer_message =  "<b>Jumlah Klien :</b>\n"
                                                                                +"<i>"+jumlah_client+"</i>"+"\n\n"
                                                                                +"<b>Keterangan :</b>\n"
                                                                                +"<i>"+keterangan+"</i>"+"\n\n"
                                                                                +is_approval
                                                                                +is_perintah_generate_otp_or_approval
                                                                                +is_generate_otp_or_approval
                                                                                +is_tolak;  
    
                                                        (async () => {
                                                          //await bot.sendMessage(msg.chat.id, message_body);
                                                          //process.exit();
                                                          console.log("Send Body ke : "+(i-1));
                                                          //await bot.sendMessage(msg.chat.id, footer_message,{parse_mode: 'HTML'});  
                                                          console.log("Send Footer");
                                                          await sleep(3000); 
                                                        })();    
                                                       
             
                                                       
                                                        
    
                                                    }else{
                                                        console.log("PANJANGAN POINTER AKHIR BELUM MELEBIHI PANJANG COMMAND : "+awal+" VS "+parseFloat((awal+jumlah_karakter_pesan_untuk_split)));
                                                        //message_body = command_kirim.substring(awal,akhir)+""+"\n\n";
                                                        //console.log("message_body "+i+" : "+message_body);
                                                        if(message_body.length > 0){
                                                             (async () => {
                                                                  //await bot.sendMessage(msg.chat.id, message_body);
                                                                  //process.exit();
                                                                  console.log("Send Body ke : "+i);
                                                                  await sleep(1000);  
                                                            })();   
                                                        }else{
                                                            console.log("Tidak mengirimkan pesan");
                                                        }
                                                        
                                                    }
    
                                                    if(i == 0){
                                                        awal = jumlah_karakter_pesan_untuk_split;
                                                        akhir = jumlah_karakter_pesan_untuk_split;
                                                    }else{
                                                        awal = akhir;
                                                        akhir = awal+jumlah_karakter_pesan_untuk_split;
                                                    }
    
                                                }
                                            //-- jika potongan pesan hanya 1 maka pengiriman pesan hanya sekali saja --//   
                                            }else{
    
                                                 var res_tujuan_broadcast = '';
                                                 if(tujuan_broadcast == 'REGIONAL' || tujuan_broadcast == 'REGIONAL SOME STORES'){
                                                     res_tujuan_broadcast = tujuan_broadcast+'-'+topic_bc;
                                                 }else{
                                                     res_tujuan_broadcast = tujuan_broadcast;
                                                 }
    
                                                 var header_message = "<b>Tanggal Broadcast :</b>\n"
                                                        +"<i>"+create_date+"</i>"+"\n\n"
                                                        +"<b>Nama :</b>\n"
                                                        +"<i>"+nama+"</i>"+"\n\n"
                                                        +"<b>Jabatan :</b>\n"
                                                        +"<i>"+jabatan+"</i>"+"\n\n"
                                                        +"<b>Tipe :</b>\n"
                                                        +"<i>"+tipe+"</i>"+"\n\n"
                                                        +"<b>Penerima :</b>\n"
                                                        +"<i>"+res_tujuan_broadcast+"</i>"+"\n\n"
                                                        +"<b>Command :</b>\n";
                                                        
                                                   
    
                                                message_body =  "`-`"+"\n\n"; //"`"+command_kirim+"`"+"\n\n";
                                                sleep(1000);   
                                                var footer_message =  "<b>Jumlah Klien :</b>\n"
                                                        +"<i>"+jumlah_client+"</i>"+"\n\n"
                                                        +"<b>Keterangan :</b>\n"
                                                        +"<i>"+keterangan+"</i>"+"\n\n"
                                                        +is_approval
                                                        +is_perintah_generate_otp_or_approval
                                                        +is_generate_otp_or_approval
                                                        +is_tolak;    
                                                message = header_message+message_body+footer_message;
                                                try{
                                                    bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'});    
                                                }catch(Ex){
                                                    console.error('Error : '+Ex.Message) 
                                                }
                                                
    
                                            }
                                            console.log("============================================================");
                                    }else{
    
                                         var res_tujuan_broadcast = '';
                                         if(tujuan_broadcast == 'REGIONAL' || tujuan_broadcast == 'REGIONAL SOME STORES'){
                                             res_tujuan_broadcast = tujuan_broadcast+'-'+topic_bc;
                                         }else{
                                             res_tujuan_broadcast = tujuan_broadcast;
                                         }   
                                         var header_message = "<b>Tanggal Broadcast :</b>\n"
                                                        +"<i>"+create_date+"</i>"+"\n\n"
                                                        +"<b>Nama :</b>\n"
                                                        +"<i>"+nama+"</i>"+"\n\n"
                                                        +"<b>Jabatan :</b>\n"
                                                        +"<i>"+jabatan+"</i>"+"\n\n"
                                                        +"<b>Tipe :</b>\n"
                                                        +"<i>"+tipe+"</i>"+"\n\n"
                                                        +"<b>Penerima :</b>\n"
                                                        +"<i>"+res_tujuan_broadcast+"</i>"+"\n\n"
                                                        +"<b>Command :</b>\n";
                                                        
    
                                        message_body = "`"+command_kirim+"`"+"\n\n";
                                        console.log("Send Body 1 message");
                                        sleep(1000);   
                                        var footer_message =  "<b>Jumlah Klien :</b>\n"
                                                +"<i>"+jumlah_client+"</i>"+"\n\n"
                                                +"<b>Keterangan :</b>\n"
                                                +"<i>"+keterangan+"</i>"+"\n\n"
                                                +is_approval
                                                +is_perintah_generate_otp_or_approval
                                                +is_generate_otp_or_approval
                                                +is_tolak;    
                                        message = header_message+message_body+footer_message;
                                        try{
                                            bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'});
                                        }catch(Ex){
                                            console.error('Error : '+Ex.Message) 
                                        }
                                        console.log("Send Footer 1 message");
                                            
                                    }
    
                                //--------------------------- HANDLE SQL BROADCAST MESSAGE -------------------------//    
                                }else{
                                    var res_tujuan_broadcast = '';
                                    if(tujuan_broadcast == 'REGIONAL' || tujuan_broadcast == 'REGIONAL SOME STORES'){
                                        res_tujuan_broadcast = tujuan_broadcast+'-'+topic_bc;
                                    }else{
                                        res_tujuan_broadcast = tujuan_broadcast;
                                    }
    
                                    var header_message  = "Tanggal Broadcast :\n"
                                        +""+create_date+""+"\n\n"
                                        +"Nama :\n"
                                        +""+nama+""+"\n\n"
                                        +"Jabatan :\n"
                                        +""+jabatan+""+"\n\n"
                                        +"Tipe :\n"
                                        +""+tipe+""+"\n\n"
                                        +"Penerima :\n"
                                        +""+res_tujuan_broadcast+""+"\n\n"
                                        +"Command :\n";
    
                                     
                                
                                      
                                        
                                    
                                    var message_body = "";  
                                    var jumlah_karakter_pesan_untuk_split = 600;      
                                    if(parseFloat(panjang_command) > jumlah_karakter_pesan_untuk_split){
                                        (async () => {
                                          await  bot.sendMessage(msg.chat.id, header_message,{parse_mode: 'HTML'});
                                          //process.exit();
                                          console.log("Send Header");
                                          await sleep(4000); 
                                        })();    
                                   
    
                                        var total_message_split = parseFloat(panjang_command) / jumlah_karakter_pesan_untuk_split;
                                        var res_total_message_split = Math.floor(total_message_split);
    
                                        var awal = 0;
                                        var akhir = jumlah_karakter_pesan_untuk_split;
                                         
                                        console.log("PANJANG COMMAND KIRIM : "+panjang_command);
                                        console.log("BAGIAN POTONGAN PESAN : "+parseFloat(res_total_message_split));
                                        for(var i = 0;i<parseFloat(res_total_message_split);i++){
    
                                            if(i == (parseFloat(res_total_message_split)-1)){
                                                console.log("PANJANGAN POINTER AKHIR MELEBIHI PANJANG COMMAND : "+akhir+" VS "+parseFloat(panjang_command));
                                                if(parseFloat(res_total_message_split) == 1){
                                                    message_body = command_kirim; //.substring(akhir,parseFloat(panjang_command))+""+"\n\n";
                                                }else{
                                                    message_body = command_kirim.substring(akhir,parseFloat(panjang_command))+""+"\n\n";
                                                } 
                                                
                                                console.log("message_body "+i+" : "+message_body);
                                                var footer_message =  "Jumlah Klien :\n"
                                                                        +""+jumlah_client+"\n\n"
                                                                        +"Keterangan :\n"
                                                                        +""+keterangan+""+"\n\n"
                                                                        +is_approval
                                                                        +is_perintah_generate_otp_or_approval
                                                                        +is_generate_otp_or_approval
                                                                        +is_tolak;  
    
                                                (async () => {
                                                  //await bot.sendMessage(msg.chat.id, '-');
                                                  //process.exit();
                                                  console.log("Send Body ke : "+(i-1));
                                                  await bot.sendMessage(msg.chat.id, footer_message,{parse_mode: 'HTML'});  
                                                  console.log("Send Footer");
                                                  await sleep(3000); 
                                                })();
                                            }else{
                                                console.log("PANJANG POINTER AKHIR BELUM MELEBIHI PANJANG COMMAND : "+awal+" VS "+parseFloat((awal+jumlah_karakter_pesan_untuk_split)));
                                                message_body = command_kirim.substring(awal,akhir)+""+"\n\n";
                                                console.log("message_body "+i+" : "+message_body);
                                                if(message_body.length > 0){
                                                     (async () => {
                                                          //await bot.sendMessage(msg.chat.id, message_body);
                                                          //process.exit();
                                                          console.log("Send Body ke : "+i);
                                                          await sleep(1000);  
                                                    })();   
                                                }else{
                                                    console.log("Tidak mengirimkan pesan");
                                                }
                                                
                                            }
                                              
    
    
    
    
    
                                            console.log("============================================================");
    
    
                                            if(i == 0){
                                                awal = jumlah_karakter_pesan_untuk_split;
                                                akhir = jumlah_karakter_pesan_untuk_split;
                                            }else{
                                                awal = akhir;
                                                akhir = awal+jumlah_karakter_pesan_untuk_split;
                                            }
                                        }
                                    }else{
                                        message_body = ""+command_kirim+""+"\n\n";
                                        sleep(1000);   
                                        var footer_message =  "Jumlah Klien :\n"
                                                +""+jumlah_client+""+"\n\n"
                                                +"Keterangan :\n"
                                                +""+keterangan+""+"\n\n"
                                                +is_approval.split("<i>").join('').split("</i>").join('').split("<b>").join('').split("</b>").join('')
                                                +is_perintah_generate_otp_or_approval.split("<i>").join('').split("</i>").join('').split("<b>").join('').split("</b>").join('')
                                                +is_generate_otp_or_approval
                                                +is_tolak;    
                                        message = header_message+message_body+footer_message;
                                        //console.log("message sql : "+message);
                                        try{
                                            bot.sendMessage(msg.chat.id, message);    
                                        }catch(Ex){
                                            console.error('Error : '+Ex.Message) 
                                        }
                                        
                                    }  
                                    
                                    
                                     
                                    
                                    
                                }
                        }catch(exc){
                            const message = "Tidak ada list pengajuan broadcast untuk di approve oleh anda saat ini. Terimakasih"
                            bot.sendMessage(msg.chat.id, message); 
                        }
                        
                    });
                }catch(exc){
                    console.log('ERROR');
                }
            }
            
            
        });
    }else if(msg.text.toString().includes('REJECT')){
        const pesan = msg.text.toString();
        const kdcab = pesan.split('_')[1];
        const sub_id = pesan.split('_')[2];
        const nama = pesan.split('_')[3];

        const sql_identitas_otorisator = "SELECT NIK,NAMA,JABATAN FROM idmcmd2.ws_personil WHERE ChatIDTelegram = '"+msg.chat.id+"'";
        mysqlLib.executeQuery(sql_identitas_otorisator).then((d) => {
                const RES_NIK_PEMBERI_OTP = d[0].NIK;
                const RES_NAMA_PEMBERI_OTP = d[0].NAMA;
                const RES_JABATAN = d[0].JABATAN;

                const sql_update_step_approval = "UPDATE broadcast_pengajuan_new SET IS_APPROVAL = '2',NIK_PEMBERI_OTP = '"+RES_NIK_PEMBERI_OTP+"' , NAMA_PEMBERI_OTP = '"+RES_NAMA_PEMBERI_OTP+"' , CREATE_OTP = NOW() WHERE SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"'";
                mysqlLib.executeQuery(sql_update_step_approval).then((d) => {
                        //console.log("HASIL : "+d.affectedRows)
                        if(parseFloat(d.affectedRows)>0){
                            const sql_query = "SELECT DATE_FORMAT(CREATE_DATE,'%Y-%m-%d %H:%i:%s') AS CREATE_DATE,NIK,NAMA,TIPE_BC,JUMLAH_CLIENT,KETERANGAN,TIPE FROM broadcast_pengajuan_new WHERE SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' ";
                            //console.log(sql_query)
                            mysqlLib.executeQuery(sql_query).then((d) => {
                                     
                                    const res_CREATE_DATE = d[0].CREATE_DATE;
                                    const res_NIK = d[0].NIK;
                                    const res_NAMA = d[0].NAMA;
                                    const res_TIPE_BC = d[0].TIPE_BC;
                                    const res_JUMLAH_TOKO = d[0].JUMLAH_CLIENT;
                                    const res_KETERANGAN = d[0].KETERANGAN;
                                    const res_PENERIMA = d[0].TIPE;

                                    const sql_info_user_pemohon = "SELECT ChatIDTelegram as CHAT_ID FROM idmcmd2.ws_personil where NIK = '"+res_NIK+"';";
                                    mysqlLib.executeQuery(sql_info_user_pemohon).then((d) => {
                                        const chat_id_pemohon = d[0].CHAT_ID;
                                        var message_ke_pemohon = "<b>Permohonan Broadcast Command/SQL anda : </b>\n"
                                            +"<i>"+res_CREATE_DATE+"</i>"+"\n\n"
                                            +"<b>Nama Pemohon :</b>\n"
                                            +"<i>"+res_NAMA+"</i>"+"\n\n"
                                            +"<b>ID :</b>\n"
                                            +"<i>"+sub_id+"</i>"+"\n\n"
                                            +"<b>Keterangan :</b>\n"
                                            +"<i>"+res_KETERANGAN+"</i>"+"\n\n"
                                            +"<b>Status :</b>\n"
                                            +"<i>REJECT</i>"+"\n\n"
                                            +"<b>Otorisator :</b>\n"
                                            +"<i>"+RES_NAMA_PEMBERI_OTP+" ("+RES_JABATAN+")"+"</i>"+"\n\n\n"
                                            +"<b>Mohon Cek Kembali Syntax Broadcast Command/SQL anda sebelum melakukan pengajuan kembali.\nTerimakasih</b>\n"
                                            ;

                                        bot.sendMessage(chat_id_pemohon, message_ke_pemohon, {parse_mode: 'HTML'});
                                        console.log("PENGIRIMAN NOTIF REJECT KE PEMOHON SUKSES");
                                        
                                        var message_ke_otorisator = "Terimakasih telah meresponse permohonan pengajuan. Notifikasi reject telah dikirimkan kepada pemohon.";
                                        bot.sendMessage(msg.chat.id, message_ke_otorisator, {parse_mode: 'HTML'});
                                        console.log("PENGIRIMAN NOTIF REJECT KE OTORISATOR SUKSES");
                                    });
                                    
                                    
                            });
                           
                        }
                });  
        });


          

    }else if(msg.text.toString().includes('list_sudah_eksekusi')){
        const sql_get_cabang = "SELECT BRANCH AS LOCATION FROM idmcmd2.ws_personil WHERE ChatIDTelegram = '"+chatId+"';"
        //console.log(sql_get_cabang)

        mysqlLib.executeQuery(sql_get_cabang).then((d) => {
            const location = d[0].LOCATION;
            const sql_query_command_kirim = "SELECT DATE_FORMAT(CREATE_DATE,'%d %M %Y %H:%i:%s') AS CREATE_DATE,NAMA,JABATAN,IFNULL(TIPE_BC,'CMD') AS TIPE,JUMLAH_CLIENT,COMMAND_KIRIM,KETERANGAN FROM broadcast_pengajuan_new WHERE KDCAB = '"+location+"'  AND IS_APPROVAL = '1' ORDER BY CREATE_DATE DESC LIMIT 0,5;";
            //console.log(sql_query_command_kirim)

            mysqlLib.executeQuery(sql_query_command_kirim).then((d) => {
              var message = "Berikut daftar 5 eksekusi Broadcast Command Terakhir yang telah di setujui/approve : "+"\n-------------------------------------------\n";
                for(var i = 0;i<d.length;i++){
                    const create_date = d[i].CREATE_DATE;
                    const nama = d[i].NAMA;
                    const jabatan = d[i].JABATAN;
                    const tipe = d[i].TIPE;
                    const jumlah_client = d[i].JUMLAH_CLIENT;
                    const command_kirim = d[i].COMMAND_KIRIM;
                    const keterangan = d[i].KETERANGAN;
                    message += "Tanggal Broadcast :\n"
                                +""+create_date+""+"\n"
                                +"Nama :\n"
                                +""+nama+""+"\n"
                                +"Jabatan :\n"
                                +""+jabatan+""+"\n"
                                +"Tipe :\n"
                                +""+tipe+""+"\n"
                                +"Command :\n"
                                +""+command_kirim+""+"\n"
                                +"Jumlah Klien :\n"
                                +""+jumlah_client+""+"\n"
                                +"Keterangan :\n"
                                +""+keterangan+""+"\n"
                                +"-------------------------------------------\n"
                                ;

                          

                }

                bot.sendMessage(msg.chat.id, message); 
            
              
            });
        
        });
       
    }else if(msg.text.toString().includes('list_user_aktif')){
        const sql_get_cabang = "SELECT BRANCH AS LOCATION,BranchCoverage AS  BRANCH_CODE FROM idmcmd2.ws_personil WHERE ChatIDTelegram = '"+chatId+"';"
        //console.log(sql_get_cabang)

        mysqlLib.executeQuery(sql_get_cabang).then((d) => {
            const location = d[0].LOCATION;
            const branch_code = "'"+d[0].BRANCH_CODE.split(",").join("','")+"'";
            //console.log("branch_code : "+branch_code);
            const tanggal = service_controller.get_tanggal_jam("3");


            const sql_query_command_kirim = "SELECT "+
                                              " DATE_FORMAT(MAX(a.ADDTIME),'%H:%i:%s') AS LAST_AKTIVITAS,"+
                                              " CONVERT(SPLIT_STRING(a.`FROM`,'_',2),UNSIGNED) AS NIK,"+
                                              " b.NAMA,"+
                                              " a.TASK,"+
                                              " a.KDTK, "+
                                              " (SELECT NAMA FROM tokomain WHERE IP = a.`TO` LIMIT 0,1) AS NAMA_TOKO"+
                                              
                                              " FROM transreport"+tanggal+" a INNER JOIN ws_personil b ON SPLIT_STRING(a.`FROM`,'_',2)=b.NIK "+
                                              " WHERE a.KDCAB IN("+branch_code+") "+
                                              " AND a.SOURCE = 'IDMCommander' "+
                                              " AND b.LOCATION = '"+location+"' "+
                                              " GROUP BY NIK "+
                                              " ORDER BY LAST_AKTIVITAS DESC LIMIT 0,30;";
            //console.log(sql_query_command_kirim)

            mysqlLib.executeQuery(sql_query_command_kirim).then((d) => {
              var message = "Berikut daftar pengguna idmcommand : "+"\n"+
                            "<i>Tanggal : "+service_controller.get_tanggal_jam("4")+"</i>\n"+
                            "---------------------------------------------------\n"+
                            "|LAST_AKSES|NAMA|TASK|\n"+
                            "---------------------------------------------------\n"
                            ;
                
                for(var i = 0;i<d.length;i++){
                    const LAST_AKTIVITAS = d[i].LAST_AKTIVITAS;
                    const NAMA = d[i].NAMA;
                    const TASK = d[i].TASK;

                    message += "|"+LAST_AKTIVITAS+"|"+NAMA+"|<b>"+TASK+"</b>|\n"
                                ;
                }
                bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
            });
        
        });

    }else if(msg.text.toString().includes('listener_toko')){
            const tanggal = service_controller.get_tanggal_jam("3");
            const sql_query_command_kirim = "CALL GET_LAPORAN_INSTALLASI_LISTENER_PER_CABANGV2('%','0',0,'tokomain','18','0');";
            //console.log('sql_query_command_kirim : '+sql_query_command_kirim)
            mysqlLib.executeQuery(sql_query_command_kirim).then((d) => {
              var message = "Berikut data status listener toko di masing-masing cabang : "+"\n"+
                            "<i>Tanggal : "+service_controller.get_tanggal_jam("4")+"</i>\n"+
                            "--------------------------------\n"+
                            "|KODE|NAMA|JUMLAH| ON |%ON| OFF |%OFF\n"+
                            "--------------------------------\n"
                            ;
                            
                var res_data = d[0];
                //console.log(res_data);
                for(var i = 0;i<res_data.length;i++){
                    const KDREG = res_data[i].REGION;
                    const KDCAB = res_data[i].KDCAB;
                    const NAMA = res_data[i].NAMA;
                    const JUMLAH_STATION = res_data[i].JUMLAH_STATION;
                    const ONLINE = res_data[i].ONLINE;
                    const PERSEN_ONLINE = res_data[i].P_ONLINE;
                    const NOK = res_data[i].NOK;
                    const PERSEN_NOK= res_data[i].P_NOK;

                    message += "|"+KDCAB+"|"+NAMA+"|"+JUMLAH_STATION+"|"+ONLINE+"|"+PERSEN_ONLINE+"|"+NOK+"|"+PERSEN_NOK+"\n"
                    message += "--------------------------------"+"\n"
                                ;
                }
                bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
            });
        
       
    }else if(msg.text.toString().includes('total_listener')){
        const tanggal = service_controller.get_tanggal_jam("1");
        const sql_query_command_kirim = "CALL GET_LAPORAN_INSTALLASI_LISTENER_PER_CABANGV2('%','1',0,'tokomain','18','0');";
        //console.log('sql_query_command_kirim : '+sql_query_command_kirim)

        var message = "Berikut rekap listener toko di semua cabang : "+"\n"+
        "<i>Tanggal : "+tanggal+"</i>\n"+
        "--------------------------------\n"+
        "|JUMLAH| OK |%OK|NOK|%NOK|OFF|%OFF|\n"+
        "--------------------------------\n"
        ;
        mysqlLib.executeQuery(sql_query_command_kirim).then((d) => {            
            var res_data = d[0];
            //console.log(res_data);
            for(var i = 0;i<res_data.length;i++){
                
                const JUMLAH = res_data[i].JUMLAH;
                const ONLINE = res_data[i].ONLINE;
                const PERSEN_ONLINE = res_data[i].P_ONLINE;
                const NOK = res_data[i].NOK;
                const PERSEN_NOK= res_data[i].P_NOK;
                const OFF = res_data[i].OFF;
                const PERSEN_OFF = res_data[i].P_OFF;

                message += "|"+JUMLAH+"|"+ONLINE+"|"+PERSEN_ONLINE+"|"+NOK+"|"+PERSEN_NOK+"|"+OFF+"|"+PERSEN_OFF+"\n"
                message += "--------------------------------\n";
            }
            //console.log('Task 1 Done');
            message += "\n.: Summary IS_INDUK :.\n";
            message += "--------------------------------\n"
            message += "|JUMLAH| OK |%OK|NOK|%NOK|OFF|%OFF|\n";
            message += "--------------------------------\n"
            const sql_query_command_is_induk = "CALL GET_LAPORAN_INSTALLASI_LISTENER_PER_CABANGV2('%','1',0,'tokomain','18','1');";
            //console.log('sql_query_command_is_induk : '+sql_query_command_is_induk)
            mysqlLib.executeQuery(sql_query_command_is_induk).then((d) => {
                    var res_data = d[0];
                    for(var i = 0;i<res_data.length;i++){ 
                        const JUMLAH_STATION = res_data[i].JUMLAH_STATION;
                        //console.log('JUMLAH_STATION : '+JUMLAH_STATION)
                        const JUMLAH_OK = res_data[i].JUMLAH_OK;
                        const OK = res_data[i].OK;
                        const JUMLAH_NOK = res_data[i].JUMLAH_NOK;
                        const NOK = res_data[i].NOK;
                        const JUMLAH_KONEKSI_OFF= res_data[i].JUMLAH_KONEKSI_OFF;
                        const KONEKSI_OFF = res_data[i].KONEKSI_OFF;
                        message += "|"+JUMLAH_STATION+"|"+JUMLAH_OK+"|"+OK+"|"+JUMLAH_NOK+"|"+NOK+"|"+JUMLAH_KONEKSI_OFF+"|"+KONEKSI_OFF+"\n";
                    }
                    message += "--------------------------------\n";
                    //console.log('Task 2 Done');
                    message += "<b><i>OK</i></b>  : LISTENER ONLINE\n";
                    message += "<b><i>NOK</i></b> : LISTENER NOK\n";
                    message += "<b><i>OFF</i></b> : KONEKSI TIMEOUT\n";
                    message += "--------------------------------\n"
                    message += "Silahkan Trigger Listener : \n";
                    message += "/trigger_nok_REG1\n";
                    message += "/trigger_nok_REG2\n";
                    message += "/trigger_nok_REG3\n";
                    message += "/trigger_nok_REG4\n";
                    message += "--------------------------------\n"
                    message += "<b><i>IDMCommandV2_Bot V2.1.0</i></b>\n";
                    message += "--------------------------------\n"
                    bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'});
            });
        });
    }else if(msg.text.toString().includes('rigger_nok')){
            
            //-- pengecekan jabtan --//
            const sql_query = "SELECT LOCATION,NIK,NAMA,JABATAN FROM ws_personil WHERE ChatIDTelegram = '"+chatId+"' ORDER BY branch_code ASC;";
            console.log(sql_query)
            try{
                mysqlLib.executeQuery(sql_query).then((d) => {
                    //console.log('d : '+d)
                    if(d == ''){
                        console.log();
                        bot.sendMessage(msg.chat.id, 'Chat ID Tidak ditemukan, daftarkan telebih dahulu chat ID anda. Terimakasih'); 
                    }else{
                        const res_location = d[0].LOCATION.trim();
                        const res_nik = d[0].NIK;
                        const res_nama = d[0].NAMA;
                        const res_jabatan = d[0].JABATAN;
                        //-- cek jabatan yang mengaaction proses reset --//
                        //-- jika jabatan support toko maka cegah proses tersebut --//
                        if(res_jabatan.includes('SUPPORT')){
                            //console.log('kondisi 1');
                            bot.sendMessage(msg.chat.id, "Anda tidak berhak mengakses menu tersebut");
                        //-- jika user HO maka lanjutkan proses tanpa proses cek lokasi telebih dahulu --//   
                        }else{
                            var kode_cabang = msg.text.toString().split('_')[2].toUpperCase();
                            axios.get('http://172.24.52.3:4646/user/TriggerListenerNOK/'+kode_cabang)
                            .then(function (response) {
                                //console.log(response.data);
                                var res_response = response.data;
                                var message = "<b>"+res_response.code+"-"+res_response.msg+"</b>";
                                bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
                            })
                            .catch(function (error) {
                                //console.log(error);
                                var message = "<b>Trigger Listener NOK Error : "+error+"</b>";
                                bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
                            })
                            .finally(function () {
                                // always executed
                            });   
                        }
                    }
                });
            }catch(exc){
                var code = 500;
                var message = "<b>"+code+"- Error : "+exc.toString()+"</b>";
                bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
            }    
             
       
    }else if(msg.text.toString().includes('rigger_listener')){
            
        //-- pengecekan jabtan --//
        const sql_query = "SELECT LOCATION,NIK,NAMA,JABATAN FROM ws_personil WHERE ChatIDTelegram = '"+chatId+"' ORDER BY branch_code ASC;";
        //console.log(sql_query)
        try{
            mysqlLib.executeQuery(sql_query).then((d) => {
                //console.log('d : '+d)
                if(d == ''){
                    console.log();
                    bot.sendMessage(msg.chat.id, 'Chat ID Tidak ditemukan, daftarkan telebih dahulu chat ID anda. Terimakasih'); 
                }else{
                    const res_location = d[0].LOCATION.trim();
                    const res_nik = d[0].NIK;
                    const res_nama = d[0].NAMA;
                    const res_jabatan = d[0].JABATAN;
                    //-- cek jabatan yang mengaaction proses reset --//
                    //-- jika jabatan support toko maka cegah proses tersebut --//
                    if(res_jabatan.includes('SUPPORT')){
                        //console.log('kondisi 1');
                        bot.sendMessage(msg.chat.id, "Anda tidak berhak mengakses menu tersebut");
                    //-- jika user HO maka lanjutkan proses tanpa proses cek lokasi telebih dahulu --//   
                    }else{
                        var kode_toko = msg.text.toString().split('_')[2].toUpperCase();
                        const sql_query_get_toko = "SELECT KDCAB,TOKO,STATION,IP FROM tokomain WHERE TOKO = '"+kode_toko+"' AND STATION NOT IN('','STB') ORDER BY STATION ASC;";
                        mysqlLib.executeQuery(sql_query_get_toko).then(async (d) => {
                            for(var i = 0;i<d.length;i++){
                                var res_ip = d[i].IP;
                                var res_kdcab = d[i].KDCAB;
                                var res_kdtk = d[i].TOKO;
                                var res_station = d[i].STATION;
                               
                                axios.get('http://172.24.52.3:4646/user/TriggerListener/'+res_kdcab+'/'+res_ip)
                                .then(function (response) {
                                    //console.log(response.data);
                                    var res_response = response.data;
                                    var message = "<b>"+res_response.code+"-"+res_response.msg+"-"+res_kdtk+" > "+res_station+"</b>";
                                    bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
                                  
                                })
                                .catch(function (error) {
                                    //console.log(error);
                                    var message = "<b>Trigger Listener IP Error : "+error+"</b>";
                                    bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
                                    
                                });
                                await sleep(2000)
                            }
                               
                        });
                    }
                }
            });
        }catch(exc){
            var code = 500;
            var message = "<b>"+code+"- Error : "+exc.toString()+"</b>";
            bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
        }    
         
   
    }else if(msg.text.toString().includes('menu_edp_toko')){
        var message = "<b>Untuk mengakses Password Menu EDP ikuti format berikut : </b>\n"+"<i>/menu_edp_toko -> /menu_edp_T001</i>";
        bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
    }else if(msg.text.toString().includes('menu_edp_')){
        const toko = msg.text.toString().split('_')[2];
        const sql_cek = "SELECT EXISTS(SELECT KODE_TOKO FROM transaksi_menu_edp WHERE KODE_TOKO = '"+toko+"') AS STATUS";
        //console.log(sql_cek);
        mysqlLib.executeQuery(sql_cek).then((d) => {
            //console.log("CEK  : "+d[0].STATUS);
                if(d[0].STATUS == '1'){
                    const sql_query_command_kirim = "SELECT a.KODE_TOKO, "+
                                                    " a.IP_USER, "+
                                                    " b.LOCATION, "+
                                                    " a.NIK_USER, "+
                                                    " b.NAMA, "+
                                                    " a.ON_CONNECT, "+
                                                    " a.ON_DISCONNECT, "+
                                                    " DATE_FORMAT(a.CREATE_DATE,'%d-%m-%Y %H:%i:%s') AS CREATE_DATE "+
                                                    
                                                    " FROM transaksi_menu_edp a INNER JOIN ws_personil b ON a.NIK_USER=b.NIK "+
                                                    " WHERE a.KODE_TOKO = '"+toko+"'  "+
                                                    " ORDER BY CREATE_DATE DESC LIMIT 0,1 "+
                                                    " ;";
                //console.log(sql_query_command_kirim)
                    mysqlLib.executeQuery(sql_query_command_kirim).then((d) => {
                      var message = "Berikut data password menu edp "+"\n"+
                                    "<i>Tanggal : "+service_controller.get_tanggal_jam("4")+"</i>\n"+
                                    "----------------------------------------------------------------------\n"+
                                    "<b>Kode Toko</b>\n<i>"+d[0].KODE_TOKO+"</i>\n\n"+
                                    "<b>IP User</b>\n<i>"+d[0].IP_USER+"</i>\n\n"+
                                    "<b>Lokasi</b>\n<i>"+d[0].LOCATION+"</i>\n\n"+
                                    "<b>Nik User</b>\n<i>"+d[0].NIK_USER+"</i>\n\n"+
                                    "<b>Nama</b>\n<i>"+d[0].NAMA+"</i>\n\n"+
                                    "<b>Pass 1</b>\n<i>"+d[0].ON_CONNECT+"</i>\n\n"+
                                    "<b>Pass 2</b>\n<i>"+d[0].ON_DISCONNECT+"</i>\n\n"+
                                    "<b>Waktu Generate</b>\n<i>"+d[0].CREATE_DATE+"</i>\n\n"+
                                    "<i>*) Apabila Password 1 tidak bisa digunakan mohon untuk mencoba Password yang kedua</i>\n"
                                    ;
                        
                         
                        bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
                    });    
                }else{
                    var message = "Toko ini belum pernah Generate Password Menu EDP";
                    bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
                }
                
        });
        
    }else if(msg.text.toString().includes('statuslistener')){
        const in_kode_toko = msg.text.toString().split('_')[1];
        if(typeof(in_kode_toko) === 'undefined'){
            bot.sendMessage(msg.chat.id, 'Ketikan format : \n/statuslistener_KODETOKO'); 
        }else{
            try{
                        const sql_query_command_kirim = "CALL GET_LAPORAN_LISTENER_PER_TOKO_V3(18,'"+in_kode_toko+"')";
                        //console.log(sql_query_command_kirim)
                        mysqlLib.executeQuery(sql_query_command_kirim).then((d) => {
                        var message = "Berikut data listener di toko : "+in_kode_toko+"\n"+
                                        "<i>Tanggal : "+service_controller.get_tanggal_jam("4")+"</i>\n"+
                                        "--------------------------------\n"
                                        var res_data = d[0];
                                        //console.log(res_data);
                                        for(var i = 0;i<res_data.length;i++){
                                            
                                            const LOCATION = res_data[i].REGION;
                                            const KDCAB = res_data[i].KDCAB;
                                            const CABANG = res_data[i].CABANG;
                                            const TOKO = res_data[i].TOKO;
                                            const NAMA = res_data[i].NAMA;
                                            const STATION = res_data[i].STATION;
                                            const IP = res_data[i].IP;
                                            const VERSION = res_data[i].VERSION;
                                            const ADDTIME = res_data[i].ADDTIME;
                                            const KODE_STATUS = res_data[i].KODE_STATUS;
                                            message += "Location\t:\t"+LOCATION+"\n"+
                                                        "Kode Cabang\t:\t"+KDCAB+"\n"+
                                                        "Nama Cabang\t:\t"+CABANG+"\n"+
                                                        "Kode Toko\t:\t"+TOKO+"\n"+
                                                        "Nama Toko\t:\t"+NAMA+"\n"+
                                                        "Station\t:\t"+STATION+"\n"+
                                                        "IP\t:\t"+IP+"\n"+
                                                        "Versi Listener\t:\t"+VERSION+"\n"+
                                                        "Last Report\t:\t"+ADDTIME+"\n"+
                                                        "Status\t:\t<b>"+KODE_STATUS+"</b>\n";
                                            message += "--------------------------------\n";
                                        }
                            
                                       
                                        message += "Trigger disini\t:\t\n /trigger_listener_"+in_kode_toko.toUpperCase()    +"\n";
                                        message += "<b><i>IDMCommandV2_Bot V2.1.0</i></b>\n";
                                        message += "--------------------------------\n"
                                        bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'});            
                            
                            
                            bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
                        });    
                     
            
            }catch(exc){
                bot.sendMessage(msg.chat.id, 'Error operasi gagal, Hubungi administrator'); 
            }
        }
        
    }else if(msg.text.toString().includes('list_services')){
         
            try{
                //-- pengecekan jabtan --//
                const sql_query = "SELECT Lokasi as LOCATION,NIK,NAMA,JABATAN FROM ws_personil WHERE ChatIDTelegram = '"+chatId+"' ORDER BY NIK ASC;";
                //console.log(sql_query)
                mysqlLib.executeQuery(sql_query).then((d) => {
                    if(d == ''){
                        console.log();
                        bot.sendMessage(msg.chat.id, 'Chat ID Tidak ditemukan, daftarkan telebih dahulu chat ID anda. Terimakasih'); 
                    }else{
                        const res_location = d[0].LOCATION.trim();
                        const res_nik = d[0].NIK;
                        const res_nama = d[0].NAMA;
                        const res_jabatan = d[0].JABATAN;
                        //-- cek jabatan yang mengaaction proses reset --//
                        //-- jika jabatan administrator ijinkan --//
                        if(res_jabatan.includes('ANALIS')){
                            const sql_query_command_kirim = "SELECT ID,NAMA_SERVICE,IS_AKTIF FROM m_service WHERE IS_AKTIF = 1 ORDER BY ID ASC";
                            console.log(sql_query_command_kirim)
                            mysqlLib.executeQuery(sql_query_command_kirim).then((d) => {
                            var message = "Berikut data service "+"\n"+
                                            "<i>Tanggal : "+service_controller.get_tanggal_jam("1")+"</i>\n"+
                                            "--------------------------------\n"
                                            var res_data = d;
                                            //console.log(res_data);
                                            var res_kdcab_counter = "";
                                            for(var i = 0;i<res_data.length;i++){
                                                
                                                const ID = res_data[i].ID;
                                                const NAMA_SERVICE = res_data[i].NAMA_SERVICE;
                                                const IS_AKTIF = res_data[i].IS_AKTIF;
                                                message += "ID\t:\t"+ID+"\n"+
                                                            "Service\t:\t"+NAMA_SERVICE+"\n"+
                                                            "/restart_"+NAMA_SERVICE+"\n"+
                                                            "/stop_"+NAMA_SERVICE+"\n"
                                                            ;
                                                message += "--------------------------------\n"            
                                            }
                                
                                        
                                            
                                            message += "<b><i>IDMCommandV2_Bot V2.1.0</i></b>\n";
                                            message += "--------------------------------\n"
                                            bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'});            
                                
                                
                                bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
                            });  
                        //-- jika user bukan administrator jangan ijinkan  --//   
                        }else{
                            bot.sendMessage(msg.chat.id, "Anda tidak berhak mengakses menu tersebut");
                        }  
                    }
                });
            }catch(exc){
                bot.sendMessage(msg.chat.id, 'Error operasi gagal, Hubungi administrator'); 
            }
        
        
    }else if(msg.text.toString().includes('restart')){
        const nama_service = msg.text.toString().split('_')[1];

        try{
            ssh.connect({
                host: '172.24.52.3',
                        username: 'root',
                        password: 'edpho@idm',
                        port: 22,
                        readyTimeout: 99999
                }).then(() => {
                        ssh.execCommand('systemctl restart '+nama_service, { cwd: '/var/www' }).then((result) => {
                        console.log('STDOUT: ' + result.stdout);
                        console.log('STDERR: ' + result.stderr);
                });
            });
            var message = "Sukses Restart"; 
            bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
        }catch(exc){
            bot.sendMessage(msg.chat.id, 'Error operasi gagal, Hubungi administrator'); 
        }
    }else if(msg.text.toString().includes('stop')){
        try{ 
            ssh.connect({
                host: '172.24.52.3',
                        username: 'root',
                        password: 'edpho@idm',
                        port: 22,
                        readyTimeout: 99999
                }).then(() => {
                        ssh.execCommand('systemctl stop '+nama_service, { cwd: '/var/www' }).then((result) => {
                        console.log('STDOUT: ' + result.stdout);
                        console.log('STDERR: ' + result.stderr);
                });
            });
            var message = "Sukses Stop";
            bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
        }catch(exc){
            bot.sendMessage(msg.chat.id, 'Error operasi gagal, Hubungi administrator'); 
        }
    }else if(msg.text.toString().toUpperCase().includes('/WHITELIST')){
        try{ 
            var sp_res_msg = msg.text.toString().split('_');
            var lokasi = sp_res_msg[1]
            var jenis = sp_res_msg[2]
            var ip_whitelist = sp_res_msg[3]
            const sql_select_list_ip = "SELECT LIST_SEGMENT_IP FROM idmcmd2.m_ip_whitelist_idmcommand WHERE KDCAB = '"+lokasi+"' AND JENIS='"+jenis+"'";
            mysqlLib.executeQuery(sql_select_list_ip).then((d) => {
                const ubah = JSON.stringify(d[0].LIST_SEGMENT_IP)
                const par = JSON.parse(ubah)
                let arr_new = []
                for(var i = 0;i<par.LIST_IP.length;i++){
                    //console.log(par.LIST_IP[i])
                    arr_new.push(par.LIST_IP[i])
                }
                arr_new.push(ip_whitelist)
                const new_list_ip = {"LIST_IP":arr_new}
                //console.log(JSON.stringify(new_list_ip))
                const sql_update_list_ip = "UPDATE idmcmd2.m_ip_whitelist_idmcommand SET LIST_SEGMENT_IP = '"+JSON.stringify(new_list_ip)+"', LAST_UPDATE = NOW(),OTORISATOR = '"+chatId+"' WHERE KDCAB = '"+lokasi+"' AND JENIS = '"+jenis+"';"
                //console.log(sql_update_list_ip)
                mysqlLib.executeQuery(sql_update_list_ip).then((e) => {
                    var message = "Sukses Tambah IP WhiteList : "+lokasi;
                    bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
                }).catch((error)=>{
                    var message_error = error.toString()
                    bot.sendMessage(msg.chat.id, message_error, {parse_mode: 'HTML'}); 
                });
            });
        }catch(exc){
            bot.sendMessage(msg.chat.id, 'Error operasi gagal, Hubungi administrator'); 
        }
    }else{
        bot.sendMessage(msg.chat.id, "Pesan tidak dikenali");
    }
});

bot.on("callback_query", function onCallbackQuery(callbackQuery) {
    // 'callbackQuery' is of type CallbackQuery
    console.log("CHAT_ID_ATASAN : ",callbackQuery.from.id);
    console.log("RESPONSE : ",callbackQuery.data);
    var chat_id_atasan = callbackQuery.from.id;
    var nik = callbackQuery.data.split("_")[1];
    var type = callbackQuery.data.split("_")[4];
    var sub_id = callbackQuery.data.split("_")[5];
    
    if(type == "DUPLICATE" || type == "REMOTELOGIN" || type == "NOK" || type == "NOMORCO" || type == "POSREPLIKASI"){
        //-- cek apakah data pemohon ada di table log --//
        //const sql_query_cek_data_pemohon = "CALL GET_CEK_REQUEST_APPROVAL_REMOTE_DUPLICATE_LOGIN('"+nik+"')";
        //- cek apakah sudah di callback oleh user atau belum --//
        var res_type= "";
        if(type == 'NOK'){
            res_type = "IPTIDAKTERDAFTAR";
        }else{
            res_type = type;
        }
        var message = "";
        const sql_query_cek_response = "CALL GET_RESPONSE_APPROVAL_REMOTE_DUPLICATE_LOGIN('"+nik+"','"+res_type+"','"+sub_id+"');";
        console.log(sql_query_cek_response);
        mysqlLib.executeQuery(sql_query_cek_response).then((d) => {
            //console.log("ROW : "+d[0]);
            var rows = d[0];
            if(rows == ''){
                console.log('HASIL : DATA TIDAK DITEMUKAN');
                /*
                var sql_query_chat_id_atasan = "SELECT v.NIK,v.NAMA, "+
                                                       " (SELECT "+
                                                            "GROUP_CONCAT(k.CHAT_ID) AS CHAT_ID_ATASAN"+
                                                            "FROM m_struktur_jabatan l LEFT JOIN idm_org_structure k ON k.JABATAN=l.CONTENT "+
                                                            "WHERE l.ID > v.ID "+
                                                               " AND l.KODE = v.KODE "+
                                                               " AND k.LOCATION = v.LOCATION "+
                                                               " AND k.JABATAN != a.JABATAN "+
                                                               " AND k.JABATAN NOT LIKE 'SUPPORT%' "+
                                                               " AND k.CHAT_ID IS NOT NULL "+
                                                               " AND k.CHAT_ID != '"+chat_id_atasan+"' "+
                                                               " AND k.CHAT_ID != '0' AND LENGTH(CHAT_ID) > 1 "+
                                                               " ) AS CHAT_ID_ATASAN "+
                                                                
                                                                            " FROM (SELECT a.LOCATION, "+
                                                                            " a.NIK,"+
                                                                            " a.NAMA, "+
                                                                            " a.JABATAN,"+
                                                                            " a.BAGIAN,"+
                                                                            " a.CHAT_ID,"+
                                                                            " b.ID,"+
                                                                            " b.KODE,"+
                                                                            " (SELECT CONTENT FROM m_struktur_jabatan WHERE ID > b.ID AND KODE =  LEFT(a.LOCATION,1) ORDER BY ID ASC LIMIT 0,1) AS JABATAN_ATASAN"+
                                                                         
                                                                        " FROM idm_org_structure a INNER JOIN m_struktur_jabatan b ON a.JABATAN=b.CONTENT"+
                                                                        " ) v"+
                                                                        " WHERE v.NIK = '"+nik+"' "+
                                                                        " GROUP BY v.NIK"+
                                                                        ";";
                mysqlLib.executeQuery(sql_query_chat_id_atasan).then((d) => {

                    const res_nik_pemohon = d[0].NIK;
                    const res_nama_pemohon = d[1].NAMA;
                    const res_chat_id_atasan_for_info = d[2].CHAT_ID_ATASAN;
                     */

                    var message_send = "Respon anda sudah kami proses dan kami rekam. Terimakasih atas respon yang diberikan";

                    if(callbackQuery.data.includes("IZINKAN")) {
                       
                        var location = callbackQuery.data.split("_")[2];
                        var pass = callbackQuery.data.split("_")[3];
                        var chat_message = "SECURITY_LOGIN/"+location+"/RESPONSE/"+nik+"/";
                        var obj_command = {"USERNAME_LOGIN":nik,"PASS":pass,"CHAT_ID_ATASAN":chat_id_atasan,"TYPE":res_type};
                        var res_obj_command = JSON.stringify(obj_command);
                        var to = "IDMCommander";
                        pubAction_RemoteAccess(res_obj_command,"IZINKAN",location,chat_message,nik,to);
                        bot.sendMessage(chat_id_atasan, message_send,{parse_mode: 'HTML'});
                        /*
                        var sp_res_chat_id_atasan = res_chat_id_atasan_for_info.split(",");
                        var response_dari_atasan = "Permohonan dari user : "+res_nik_pemohon+"-"+res_nama_pemohon+" Perihal : "+type+" Telah di response ("+callbackQuery.data.split("_")[0]+") oleh : "+chat_id_atasan+" ";
                        for(var a = 0;a<sp_res_chat_id_atasan.length;a++){
                            var m = sp_res_chat_id_atasan[a];
                            bot.sendMessage(m, response_dari_atasan,{parse_mode: 'HTML'});
                        }
                        */

                    }else if(callbackQuery.data.includes("TOLAK")){
                       
                        var location = callbackQuery.data.split("_")[2];
                        var pass = callbackQuery.data.split("_")[3];
                        var chat_message = "SECURITY_LOGIN/"+location+"/RESPONSE/"+nik+"/";
                        
                        var obj_command = {"USERNAME_LOGIN":nik,"PASS":pass,"CHAT_ID_ATASAN":chat_id_atasan,"TYPE":res_type};
                        var res_obj_command = JSON.stringify(obj_command);
                        var to = "IDMCommander";
                        pubAction_RemoteAccess(res_obj_command,"TOLAK",location,chat_message,nik,to);
                        bot.sendMessage(chat_id_atasan, message_send,{parse_mode: 'HTML'});  
                        /*
                        var sp_res_chat_id_atasan = res_chat_id_atasan_for_info.split(",");
                        var response_dari_atasan = "Permohonan dari user : "+res_nik_pemohon+"-"+res_nama_pemohon+" Perihal : "+type+" Telah di response ("+callbackQuery.data.split("_")[0]+") oleh : "+chat_id_atasan+" ";
                        for(var a = 0;a<sp_res_chat_id_atasan.length;a++){
                            var m = sp_res_chat_id_atasan[a];
                            bot.sendMessage(m, response_dari_atasan,{parse_mode: 'HTML'});
                        } 
                        */
                    }
                /*   
                });
                */

                
            }else{
                rows.forEach(item => {
                    message = item.HASIL;     
                    //console.log('HASIL : ',message);
                    bot.sendMessage(chat_id_atasan, message, {parse_mode: 'HTML'}); 
                });
            } 
        }); 

    }else{

    }
    
     

});

client.on('message',async function(topic, compressed){
    try{
            const decompressed = await ungzip(compressed);
            const parseJson = JSON.parse(decompressed);
            const IN_SOURCE = parseJson.SOURCE;
            const IN_TASK = parseJson.TASK;
            const IN_FROM = parseJson.FROM;
            if(topic == 'RES_OTP/IDMCommandBot'){

                var jam = service_controller.get_jam();
                var greeting = '';
                if(jam == 4 && jam <= 10){
                    greeting = 'Pagi';
                }else if(jam > 10 && jam <= 14){
                    greeting = 'Siang';
                }else if(jam > 14 && jam <= 17){
                    greeting = 'Sore';
                }else if(jam > 17 && jam <= 23){
                    greeting = 'Malam';
                }

                const parseJsonChatId = JSON.parse(parseJson.CHAT_MESSAGE);
                const SUB_CHAT_ID = parseJsonChatId.CHAT_ID;
                const SUB_ID = parseJsonChatId.SUB_ID;
                const KDCAB_BC = parseJsonChatId.KDCAB_BC;
                const IN_CABANG = parseJson.CABANG;
                const IN_OTP = parseJson.OTP;

                var tanggal_message_terima = service_controller.get_tanggal_jam("1");
                //console.log(tanggal_message_terima+" : "+topic)
                

                await sleep(3000);
                 
                //-- kirim pesan hasil OTP ke user pemohon --//    
                const sql_query = "SELECT DATE_FORMAT(CREATE_DATE,'%Y-%m-%d %H:%i:%s') AS CREATE_DATE,NIK,NAMA,JUMLAH_CLIENT,IF(LENGTH(COMMAND_KIRIM)>200,CONCAT(CONVERT(COMMAND_KIRIM,CHAR(200)),' dst.'),COMMAND_KIRIM) AS COMMAND_KIRIM,TIPE,KETERANGAN,DATE_FORMAT(CREATE_OTP,'%Y-%m-%d %H:%i:%s') AS CREATE_OTP,TIPE_BC,(SELECT NAMA FROM ws_personil WHERE ChatIDTelegram = '"+SUB_CHAT_ID+"') AS NAMA_PEMBERI_OTP,OTP FROM broadcast_pengajuan_new WHERE SUB_ID = '"+SUB_ID+"' AND KDCAB = '"+KDCAB_BC+"' ";
                console.log("sql_query_identitas_tujuan : "+sql_query)
                mysqlLib.executeQuery(sql_query).then((d) => {
                         
                        const res_NIK = d[0].NIK;
                        const res_NAMA = d[0].NAMA;
                        const res_CREATE_DATE = d[0].CREATE_DATE;
                        const res_JUMLAH_CLIENT = d[0].JUMLAH_CLIENT;
                        const res_COMMAND_KIRIM = d[0].COMMAND_KIRIM;
                        const res_TIPE = d[0].TIPE;
                        const res_KETERANGAN = d[0].KETERANGAN;
                        const res_NIK_PEMBERI_OTP = d[0].NIK_PEMBERI_OTP;
                        const res_NAMA_PEMBERI_OTP = d[0].NAMA_PEMBERI_OTP;
                        const res_CREATE_OTP = d[0].CREATE_OTP;
                        const res_TIPE_BC = d[0].TIPE_BC;
                        const res_OTP = d[0].OTP;

                        const sql_info_user_pemohon = "SELECT ChatIDTelegram AS CHAT_ID FROM idmcmd2.ws_personil where NIK = '"+res_NIK+"';";
                        //console.log("sql_info_user_pemohon : "+sql_info_user_pemohon)
                        mysqlLib.executeQuery(sql_info_user_pemohon).then((d) => {
                            const chat_id_pemohon = d[0].CHAT_ID;
                            //console.log("CHAT_ID PEMOHON : "+chat_id_pemohon);
                            var message_send = "";
                            message_send = "<b>Selamat "+greeting+" Pak <i>"+res_NAMA+"</i>, anda mendapatkan OTP untuk broadcast command/sql :</b>\n\n"
                                                +"<b>Tanggal Permohonan Broadcast :</b>\n"
                                                +"<i>"+res_CREATE_DATE+"</i>"+"\n\n"
                                                +"<b>Nama Pemohon :</b>\n"
                                                +"<i>"+res_NAMA+"</i>"+"\n\n"
                                                +"<b>Penerima :</b>\n"
                                                +"<i>"+res_TIPE+"</i>"+"\n\n" 
                                                +"<b>Jumlah Klien :</b>\n"
                                                +"<i>"+res_JUMLAH_CLIENT+"</i>"+"\n\n"
                                                +"<b>Tipe Broadcast :</b>\n"
                                                +"<i>"+res_TIPE_BC+"</i>"+"\n\n"
                                                +"<b>Command :</b>\n"
                                                +"<i>"+res_COMMAND_KIRIM+"</i>"+"\n\n"
                                                +"<b>Keterangan :</b>\n"
                                                +"<i>"+res_KETERANGAN+"</i>"+"\n\n"
                                                +"<b>Nama Pemberi OTP :</b>\n"
                                                +"<i>"+res_NAMA_PEMBERI_OTP+"</i>"+"\n\n"
                                                +"<b>Waktu Generate OTP :</b>\n"
                                                +"<i>"+tanggal_message_terima+"</i>"+"\n\n"  
                                                +"<b>OTP :</b>\n"
                                                +"<i><u>"+res_OTP+"</u></i>"+"\n\n\n"
                                               ;          
                            if(res_TIPE_BC == 'CMD'){
                                bot.sendMessage(chat_id_pemohon, message_send,{parse_mode: 'HTML'});
                            }else{
                                bot.sendMessage(chat_id_pemohon, message_send.split("<b>").join('').split('</b>').join('').split("<i>").join('').split('</i>').join('').split('<u>').join('').split('</u>').join(''));
                            }
                            console.log("OTP DARI DB : "+res_OTP);
                            console.log("SEND MESSAGE KE CHAT_ID PEMOHON : "+chat_id_pemohon+" SUKSES");
                            console.log("SEND MESSAGE KE CHAT_ID OTORISATOR : "+SUB_CHAT_ID+" SUKSES");
                            bot.sendMessage(SUB_CHAT_ID, res_OTP);    


                        });
                        
                    });
                

            }else if(topic == 'NOTIFIKASI_BOT/'){

                //-- kirim pesan kepada level jabatan selanjutnya --//
                const IN_SUB_ID = parseJson.SUB_ID;
                const IN_CABANG = parseJson.CABANG;
                var jam = service_controller.get_jam();
                var greeting = '';
                if(jam == 4 && jam <= 10){
                    greeting = 'Pagi';
                }else if(jam > 10 && jam <= 14){
                    greeting = 'Siang';
                }else if(jam > 14 && jam <= 17){
                    greeting = 'Sore';
                }else if(jam > 17 && jam <= 23){
                    greeting = 'Malam';
                }

                const sql_query = "SELECT CREATE_DATE,KDCAB,CONCAT('/CMD','_',KDCAB,'_',SUB_ID,'_',REPLACE(NAMA,' ','')) AS ID,NIK,NAMA,STEP_APPROVAL FROM broadcast_pengajuan_new WHERE SUB_ID = '"+IN_SUB_ID+"' AND KDCAB = '"+IN_CABANG+"' ";
                console.log('query list bc : '+sql_query)
                mysqlLib.executeQuery(sql_query).then((d) => {
                    const res_ID = d[0].ID;
                    const res_NIK = d[0].NIK;
                    const res_NAMA = d[0].NAMA;
                    const res_step_approval = d[0].STEP_APPROVAL;
                    const res_location = d[0].KDCAB.split('REG').join('RE0');
                    



                    const sql_info_next_step_approval = "SELECT ChatIDTelegram as CHAT_ID,NAMA FROM idmcmd2.ws_personil where JABATAN = '"+res_step_approval+"' AND Branch = '"+res_location+"' AND IS_AKTIF = 1;";
                    console.log('info step approval : '+sql_info_next_step_approval)
                    mysqlLib.executeQuery(sql_info_next_step_approval).then((d) => {
                        //console.log("HASIL : "+d.affectedRows)
                        for(var i = 0;i<d.length;i++){
                            const chat_id_next_step_approval = d[i].CHAT_ID.trim();
                            const nama_next_step_approval = d[i].NAMA;
                            if(chat_id_next_step_approval != "0"){
                                var message_send = "<b>Selamat "+greeting+" Pak <i>"+nama_next_step_approval+"</i>, anda mendapatkan permohonan broadcast command/sql :</b>\n\n"
                                                +"<b>Nama Pemohon :</b>\n"
                                                +"<i>"+res_NAMA+"</i>"+"\n\n"
                                                +"<b>ID :</b>\n"
                                                +"<i>"+res_ID+"</i>"+"\n\n\n"
                                               ;    
                                try{
                                    bot.sendMessage(chat_id_next_step_approval, message_send,{parse_mode: 'HTML'});
                                    console.log("SEND NOTIF KE LEVEL SELANJUTNYA OK : "+nama_next_step_approval);
                                }catch(Ex){
                                    //console.error(Ex.Message)
                                    console.log("SEND NOTIF KE LEVEL SELANJUTNYA GAGAL : "+nama_next_step_approval+" CHAT ID = "+chat_id_next_step_approval);
                                }
                            }else{
                                console.log("SEND NOTIF KE LEVEL SELANJUTNYA GAGAL : "+nama_next_step_approval+" CHAT ID = "+chat_id_next_step_approval);
                            }
                            
                           
                        }
                    });
                });      

            }else if(topic == 'RES_DRC/IDMCommandBot'){
                const parseJsonChatId = JSON.parse(parseJson.COMMAND);
                const SUB_CHAT_ID = parseJsonChatId.CHAT_ID;
                const SUB_ID = parseJsonChatId.SUB_ID;
                const SUB_KDCAB_BC = parseJsonChatId.KDCAB_BC;
                const MULAI_BACKUP = parseJsonChatId.MULAI_BACKUP;
                const SELESAI_BACKUP = parseJsonChatId.SELESAI_BACKUP;

                const IN_HASIL = parseJson.HASIL;

                if(SUB_CHAT_ID.includes(",")){
                    const res_chat_id = SUB_CHAT_ID.split(',');
                    for(var b = 0;b<res_chat_id.length;b++){
                        // 418778040
                        var message_send = "Berikut hasil backup data idmcmd : \n"+IN_HASIL+"\n\n<i>Mulai Backup : "+MULAI_BACKUP+"</i>\n<i>Selesai Backup : "+SELESAI_BACKUP+"</i>";
                        bot.sendMessage(res_chat_id[b], message_send,{parse_mode: 'HTML'});
                        console.log("SEND REPORT SUPERVISI BACKUP DATA SUKSES KE CHATID : "+res_chat_id[b]);
                    }
                }else{
                    if(IN_HASIL.includes("2 - NOK")){
                        pub_Command_Backup();
                        console.log("SEND KEMBALI REPORT SUPERVISI BACKUP DATA SUKSES");
                    }else{
                        // 418778040
                        var message_send = "Berikut hasil backup data idmcmd : \n"+IN_HASIL+"\n\n<i>Mulai Backup : "+MULAI_BACKUP+"</i>\n<i>Selesai Backup : "+SELESAI_BACKUP+"</i>";
                        bot.sendMessage(SUB_CHAT_ID, message_send,{parse_mode: 'HTML'});
                        console.log("SEND REPORT SUPERVISI BACKUP DATA SUKSES KE CHATID : "+SUB_CHAT_ID);
                    }
                }
                
                
               
            }

            //-- HANDLE MESSAGE SECURITY LOGIN --//
            else if(topic.includes("SECURITY_LOGIN"))
            {
                try{

                    console.log("MESSAGE RECEIVED FROM BE TO TOPIC "+topic+" : "+decompressed);
                    //-- Kirim pesan ChatID atasan bahwasanya ada duplicate login --//
                    const IN_TANGGAL_JAM = parseJson.TANGGAL_JAM;
                    const IN_COMMAND = parseJson.COMMAND;
                    const IN_TASK = parseJson.TASK;
                    const IN_SUB_ID = parseJson.SUB_ID;
                    //console.log("IN_COMMAND : "+IN_COMMAND);
                    var parse_command = JSON.parse(IN_COMMAND);
                    var location  = parse_command.LOCATION;
                    var nik  = parse_command.NIK;
                    var nama = parse_command.NAMA;
                    var jabatan = parse_command.JABATAN;
                    var bagian = parse_command.BAGIAN;
                    var login_dari_ip = parse_command.LOGIN_DARI_IP;
                    var last_login = parse_command.LAST_LOGIN;

                    var res_last_login = "";
                    if(last_login == ":"){
                        res_last_login = "";
                    }else{
                        var sp_last_login = last_login.split('#');
                        res_last_login = sp_last_login[1]+"\r\n\r\n"+
                                        "<b><i>Waktu Login Sebelumnya</i></b>"+"\r\n"+
                                        sp_last_login[0];
                    }
                    var chat_id_atasan = parse_command.CHAT_ID_ATASAN;
                    var type = parse_command.TYPE;
                    var via = parse_command.VIA;
                    var pass = parse_command.PASS;
                    //console.log("nik : "+nik);
                    var message_send = "";
                    if(type == "DUPLICATE"){
                        message_send = "<b>.: WARNING :.</b>\r\n\r\n"+
                                        "<b>Terdapat duplicate login idmcommander atas : </b>\r\n\r\n"+
                                        "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                        "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                        "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                        "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                        "<b><i>Login dari IP</i></b>\r\n<i>"+login_dari_ip+"</i>\r\n\r\n"+
                                        "<b><i>Login Sebelumnya di IP</i></b>\r\n<i>"+res_last_login+"</i>\r\n\r\n\r\n"+
                                        "<b><i>*) Mohon menghimbau kepada semua pengguna idmcommand untuk tidak share account serta menjaga privasi password account idmcommand masing-masing</i></b>";
                                        
                                        var kesimpulan = "";
                                        if(chat_id_atasan.includes(",")){
                                            var parse_chat_id_atasan = chat_id_atasan.split(",");
                                            for(var i = 0;i<parse_chat_id_atasan.length;i++){
                                                var res_nama_atasan = parse_chat_id_atasan[i].split("|")[1];
                                                var res_chat_id_atasan = parse_chat_id_atasan[i].split("|")[2];
                                                bot.sendMessage(res_chat_id_atasan, message_send,{parse_mode: 'HTML'});      
                                                console.log("SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan);
                                                kesimpulan = kesimpulan+""+"SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan+"\r\n";
                                            }
                                            
                                        }else{
                                            var res_nama_atasan = chat_id_atasan.split("|")[1];
                                            var res_chat_id_atasan = chat_id_atasan.split("|")[2];
                                            bot.sendMessage(res_chat_id_atasan, message_send,{parse_mode: 'HTML'});
                                            console.log("SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan);   
                                            kesimpulan =  "SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan;
                                        }

                                        var  message_send_to_administrator = "<b>.: MONITORING BACKEND :.</b>\r\n\r\n"+
                                        "<b><i>Tanggal</i></b>\r\n<i>"+IN_TANGGAL_JAM+"</i>\r\n\r\n"+
                                        "<b><i>Task</i></b>\r\n<i>"+IN_TASK+"</i>\r\n\r\n"+
                                        "<b><i>Topic</i></b>\r\n<i>"+topic+"</i>\r\n\r\n"+
                                        "<b><i>Pesan</i></b>\r\n<i>DUPLICATE LOGIN</i>\r\n\r\n\r\n"+
                                        "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                        "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                        "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                        "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                        "<b><i>Login dari IP</i></b>\r\n<i>"+login_dari_ip+"</i>\r\n\r\n"+
                                        "<b><i>Login Sebelumnya di IP</i></b>\r\n<i>"+res_last_login+"</i>\r\n\r\n\r\n"+
                                        
                                        "<b><i>Kesimpulan</i></b>\r\n<i>"+kesimpulan+"</i>\r\n\r\n\r\n"+
                                        
                                        "<b><i>*) Pesan ini disampaikan oleh Backend IDMCommand</i></b>";

                                        bot.sendMessage("532860640", message_send_to_administrator,{parse_mode: 'HTML'});
                                        console.log("SEND INFO SUKSES KE CHATID : 532860640");

                    }else if(type == "REMOTELOGIN"){
                        message_send = "<b>.: WARNING :.</b>\r\n\r\n"+
                                        "<b>Terdapat potensi penggunaan idmcommander melalui remote pc : </b>\r\n\r\n"+
                                        "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                        "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                        "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                        "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                        "<b><i>Login dari IP</i></b>\r\n<i>"+login_dari_ip+"</i>\r\n\r\n"+
                                        "<b><i>Software Remote</i></b>\r\n<i>"+via+"</i>\r\n\r\n"+
                                        "<b>Apakah anda mengijinkan akses tersebut : </b>\r\n\r\n\r\n"+
                                        
                                        "<b><i>*) Mohon menghimbau kepada semua pengguna idmcommand untuk tidak share account serta menjaga privasi password account idmcommand masing-masing</i></b>";

                                        var kesimpulan = "";
                                        if(chat_id_atasan.includes(",")){
                                            var parse_chat_id_atasan = chat_id_atasan.split(",");
                                            for(var i = 0;i<parse_chat_id_atasan.length;i++){
                                                var res_nama_atasan = parse_chat_id_atasan[i].split("|")[1];
                                                var res_chat_id_atasan = parse_chat_id_atasan[i].split("|")[2];
                                                /*
                                                bot.sendMessage(res_chat_id_atasan, message_send,{parse_mode: 'HTML'});      
                                               
                                                */
                                                //var data_call_izin = {"CONTENT":"IZINKAN","NIK":nik,"LOCATION":location,"PASSWORD":pass,"TYPE":type};
                                                //var data_call_tolak = {"CONTENT":"IZINKAN","NIK":nik,"LOCATION":location,"PASSWORD":pass,"TYPE":type};
                                                bot.sendMessage(res_chat_id_atasan, message_send, {parse_mode: 'HTML',
                                                    reply_markup: {
                                                       inline_keyboard: [
                                                            [
                                                                {
                                                                    // //command,hasil,kode_cabang_user,chat_message,nik_user
                                                                    text: "IZINKAN",
                                                                    callback_data: 'IZINKAN_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID
                                                                },
                                                                {
                                                                    text: "TOLAK",
                                                                    callback_data:  'TOLAK_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID
                                                                }
                                                            ],

                                                        ]
                                                    }
                                                });

                                                console.log("SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan);
                                                kesimpulan = kesimpulan+""+"SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan+"\r\n";
                                            }

                                            var  message_send_to_administrator = "<b>.: MONITORING BACKEND :.</b>\r\n\r\n"+
                                            "<b><i>Tanggal</i></b>\r\n<i>"+IN_TANGGAL_JAM+"</i>\r\n\r\n"+
                                            "<b><i>Task</i></b>\r\n<i>"+IN_TASK+"</i>\r\n\r\n"+
                                            "<b><i>Topic</i></b>\r\n<i>"+topic+"</i>\r\n\r\n"+
                                            "<b><i>Pesan</i></b>\r\n<i>REMOTE LOGIN</i>\r\n\r\n\r\n"+
                                            "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                            "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                            "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                            "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                            "<b><i>Login dari IP</i></b>\r\n<i>"+login_dari_ip+"</i>\r\n\r\n"+
                                            "<b><i>Software Remote</i></b>\r\n<i>"+via+"</i>\r\n\r\n"+
                                            "<b><i>Kesimpulan</i></b>\r\n<i>"+kesimpulan+"</i>\r\n\r\n\r\n"+
                                            
                                            "<b><i>*) Pesan ini disampaikan oleh Backend IDMCommand</i></b>";

                                            bot.sendMessage("532860640", message_send_to_administrator,{parse_mode: 'HTML'});
                                            console.log("SEND INFO SUKSES KE CHATID : 532860640");
                                            
                                        }else{
                                            
                                            var res_nama_atasan = chat_id_atasan.split("|")[1];
                                            var res_chat_id_atasan = chat_id_atasan.split("|")[2];

                                            //var data_call_izin = {"CONTENT":"IZINKAN","NIK":nik,"LOCATION":location,"PASSWORD":pass,"TYPE":type};
                                            //var data_call_tolak = {"CONTENT":"IZINKAN","NIK":nik,"LOCATION":location,"PASSWORD":pass,"TYPE":type};
                                                

                                            bot.sendMessage(res_chat_id_atasan, message_send, {parse_mode: 'HTML',
                                                reply_markup: {
                                                   inline_keyboard: [
                                                        [
                                                            {
                                                                // //command,hasil,kode_cabang_user,chat_message,nik_user
                                                                text: "IZINKAN",
                                                                callback_data: 'IZINKAN_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID
                                                            },
                                                            {
                                                                text: "TOLAK",
                                                                callback_data: 'TOLAK_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID
                                                            }
                                                        ],

                                                    ]
                                                }
                                            });
                                            
                                            console.log("SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan);
                                            var kesimpulan = kesimpulan+""+"SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan+"\r\n";
     

                                            var  message_send_to_administrator = "<b>.: MONITORING BACKEND :.</b>\r\n\r\n"+
                                            "<b><i>Tanggal</i></b>\r\n<i>"+IN_TANGGAL_JAM+"</i>\r\n\r\n"+
                                            "<b><i>Task</i></b>\r\n<i>"+IN_TASK+"</i>\r\n\r\n"+
                                            "<b><i>Topic</i></b>\r\n<i>"+topic+"</i>\r\n\r\n"+
                                            "<b><i>Pesan</i></b>\r\n<i>REMOTE LOGIN</i>\r\n\r\n\r\n"+
                                            "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                            "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                            "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                            "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                            "<b><i>Login dari IP</i></b>\r\n<i>"+login_dari_ip+"</i>\r\n\r\n"+
                                            "<b><i>Software Remote</i></b>\r\n<i>"+via+"</i>\r\n\r\n"+
                                            "<b><i>Kesimpulan</i></b>\r\n<i>"+kesimpulan+"</i>\r\n\r\n\r\n"+
                                            
                                            "<b><i>*) Pesan ini disampaikan oleh Backend IDMCommand</i></b>";

                                            bot.sendMessage("532860640", message_send_to_administrator,{parse_mode: 'HTML'});
                                            console.log("SEND INFO SUKSES KE CHATID : 532860640");

                                        }

                    }else if(type == "NOMORCO"){
                        message_send = "<b>.: WARNING :.</b>\r\n\r\n"+
                                        "<b>Terdapat potensi akses toko tanpa input NOMOR_CO : </b>\r\n\r\n"+
                                        "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                        "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                        "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                        "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                        "<b><i>Login dari IP</i></b>\r\n<i>"+login_dari_ip+"</i>\r\n\r\n"+
                                        "<b><i>Keterangan</i></b>\r\n<i>"+via+"</i>\r\n\r\n"+
                                        "<b>Apakah anda mengijinkan akses tersebut : </b>\r\n\r\n\r\n"+
                                        
                                        "<b><i>*) Mohon menghimbau kepada semua pengguna idmcommand untuk tidak share account serta menjaga privasi password account idmcommand masing-masing</i></b>";

                                        var kesimpulan = "";
                                        if(chat_id_atasan.includes(",")){
                                            var parse_chat_id_atasan = chat_id_atasan.split(",");
                                            for(var i = 0;i<parse_chat_id_atasan.length;i++){
                                                var res_nama_atasan = parse_chat_id_atasan[i].split("|")[1];
                                                var res_chat_id_atasan = parse_chat_id_atasan[i].split("|")[2];
                                                /*
                                                bot.sendMessage(res_chat_id_atasan, message_send,{parse_mode: 'HTML'});      
                                               
                                                */
                                                //var data_call_izin = {"CONTENT":"IZINKAN","NIK":nik,"LOCATION":location,"PASSWORD":pass,"TYPE":type};
                                                //var data_call_tolak = {"CONTENT":"IZINKAN","NIK":nik,"LOCATION":location,"PASSWORD":pass,"TYPE":type};
                                                bot.sendMessage(res_chat_id_atasan, message_send, {parse_mode: 'HTML',
                                                    reply_markup: {
                                                       inline_keyboard: [
                                                            [
                                                                {
                                                                    // //command,hasil,kode_cabang_user,chat_message,nik_user
                                                                    text: "IZINKAN",
                                                                    callback_data: 'IZINKAN_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID
                                                                },
                                                                {
                                                                    text: "TOLAK",
                                                                    callback_data:  'TOLAK_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID
                                                                }
                                                            ],

                                                        ]
                                                    }
                                                });

                                                console.log("SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan);
                                                kesimpulan = kesimpulan+""+"SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan+"\r\n";
                                            }

                                            var  message_send_to_administrator = "<b>.: MONITORING BACKEND :.</b>\r\n\r\n"+
                                            "<b><i>Tanggal</i></b>\r\n<i>"+IN_TANGGAL_JAM+"</i>\r\n\r\n"+
                                            "<b><i>Task</i></b>\r\n<i>"+IN_TASK+"</i>\r\n\r\n"+
                                            "<b><i>Topic</i></b>\r\n<i>"+topic+"</i>\r\n\r\n"+
                                            "<b><i>Pesan</i></b>\r\n<i>REMOTE LOGIN</i>\r\n\r\n\r\n"+
                                            "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                            "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                            "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                            "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                            "<b><i>Login dari IP</i></b>\r\n<i>"+login_dari_ip+"</i>\r\n\r\n"+
                                            "<b><i>Keterangan</i></b>\r\n<i>"+via+"</i>\r\n\r\n"+
                                            "<b><i>Kesimpulan</i></b>\r\n<i>"+kesimpulan+"</i>\r\n\r\n\r\n"+
                                            
                                            "<b><i>*) Pesan ini disampaikan oleh Backend IDMCommand</i></b>";

                                            bot.sendMessage("532860640", message_send_to_administrator,{parse_mode: 'HTML'});
                                            console.log("SEND INFO SUKSES KE CHATID : 532860640");
                                            
                                        }else{
                                            
                                            var res_nama_atasan = chat_id_atasan.split("|")[1];
                                            var res_chat_id_atasan = chat_id_atasan.split("|")[2];

                                            //var data_call_izin = {"CONTENT":"IZINKAN","NIK":nik,"LOCATION":location,"PASSWORD":pass,"TYPE":type};
                                            //var data_call_tolak = {"CONTENT":"IZINKAN","NIK":nik,"LOCATION":location,"PASSWORD":pass,"TYPE":type};
                                                

                                            bot.sendMessage(res_chat_id_atasan, message_send, {parse_mode: 'HTML',
                                                reply_markup: {
                                                   inline_keyboard: [
                                                        [
                                                            {
                                                                // //command,hasil,kode_cabang_user,chat_message,nik_user
                                                                text: "IZINKAN",
                                                                callback_data: 'IZINKAN_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID
                                                            },
                                                            {
                                                                text: "TOLAK",
                                                                callback_data: 'TOLAK_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID
                                                            }
                                                        ],

                                                    ]
                                                }
                                            });
                                            
                                            console.log("SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan);
                                            var kesimpulan = kesimpulan+""+"SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan+"\r\n";
     

                                            var  message_send_to_administrator = "<b>.: MONITORING BACKEND :.</b>\r\n\r\n"+
                                            "<b><i>Tanggal</i></b>\r\n<i>"+IN_TANGGAL_JAM+"</i>\r\n\r\n"+
                                            "<b><i>Task</i></b>\r\n<i>"+IN_TASK+"</i>\r\n\r\n"+
                                            "<b><i>Topic</i></b>\r\n<i>"+topic+"</i>\r\n\r\n"+
                                            "<b><i>Pesan</i></b>\r\n<i>REMOTE LOGIN</i>\r\n\r\n\r\n"+
                                            "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                            "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                            "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                            "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                            "<b><i>Login dari IP</i></b>\r\n<i>"+login_dari_ip+"</i>\r\n\r\n"+
                                            "<b><i>Nomor CO</i></b>\r\n<i>"+via+"</i>\r\n\r\n"+
                                            "<b><i>Kesimpulan</i></b>\r\n<i>"+kesimpulan+"</i>\r\n\r\n\r\n"+
                                            
                                            "<b><i>*) Pesan ini disampaikan oleh Backend IDMCommand</i></b>";

                                            bot.sendMessage("532860640", message_send_to_administrator,{parse_mode: 'HTML'});
                                            console.log("SEND INFO SUKSES KE CHATID : 532860640");

                                        }

                    }else if(type == "IPTIDAKTERDAFTAR"){
                        //var data_list_via = JSON.stringify(via);

                        const parseListVia = JSON.parse(via);
                        //console.log("parseListVia : "+parseListVia.IP_SOURCE);
                        const parseListVia_IP_SOURCE = parseListVia.IP_SOURCE;
                        const parseListVia_IP_GATEWAY = parseListVia.IP_GATEWAY;
                        const parseListVia_HOST = parseListVia.HOST;

                        message_send = "<b>.: WARNING :.</b>\r\n\r\n"+
                                        "<b>Terdapat potensi penggunaan idmcommander melalui ip yang tidak terdaftar pada server EDPHO : </b>\r\n\r\n"+
                                        "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                        "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                        "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                        "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                        "<b><i>Login dari IP</i></b>\r\n<i>"+login_dari_ip+"</i>\r\n\r\n"+
                                        "<b><i>Sumber IP</i></b>\r\n<i>"+parseListVia_IP_SOURCE+"</i>\r\n\r\n"+
                                        "<b><i>IP Gateway</i></b>\r\n<i>"+parseListVia_IP_GATEWAY+"</i>\r\n\r\n"+
                                        "<b><i>Host</i></b>\r\n<i>"+parseListVia_HOST+"</i>\r\n\r\n"+
                                        "<b>Apakah anda mengijinkan akses tersebut : </b>\r\n\r\n\r\n"+
                                        
                                        "<b><i>*) Bapak Supervisor/Deputi/Manager mohon melakukan supervisi terhadap akses idmcommander dari Sumber IP tersebut</i></b>";

                                        var kesimpulan = "";
                                        if(chat_id_atasan.includes(",")){
                                            var parse_chat_id_atasan = chat_id_atasan.split(",");
                                            for(var i = 0;i<parse_chat_id_atasan.length;i++){
                                                var res_nama_atasan = parse_chat_id_atasan[i].split("|")[1];
                                                var res_chat_id_atasan = parse_chat_id_atasan[i].split("|")[2];
                                                //console.log("DATA CALLBACK : "+'IZINKAN_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID);
                                                bot.sendMessage(res_chat_id_atasan, message_send, {parse_mode: 'HTML',
                                                    reply_markup: {
                                                       inline_keyboard: [
                                                            [
                                                                {
                                                                    // //command,hasil,kode_cabang_user,chat_message,nik_user
                                                                    text: "IZINKAN",
                                                                    callback_data: 'IZINKAN_'+nik+"_"+location+"_"+pass+"_NOK_"+IN_SUB_ID
                                                                },
                                                                {
                                                                    text: "TOLAK",
                                                                    callback_data: 'TOLAK_'+nik+"_"+location+"_"+pass+"_NOK_"+IN_SUB_ID
                                                                }
                                                            ],

                                                        ]
                                                    }
                                                });

                                                console.log("SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan);
                                                kesimpulan = kesimpulan+""+"SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan+"\r\n";
                                            }

                                            var  message_send_to_administrator = "<b>.: MONITORING BACKEND :.</b>\r\n\r\n"+
                                            "<b><i>Tanggal</i></b>\r\n<i>"+IN_TANGGAL_JAM+"</i>\r\n\r\n"+
                                            "<b><i>Task</i></b>\r\n<i>"+IN_TASK+"</i>\r\n\r\n"+
                                            "<b><i>Topic</i></b>\r\n<i>"+topic+"</i>\r\n\r\n"+
                                            "<b><i>Pesan</i></b>\r\n<i>IP TIDAK TERDAFTAR</i>\r\n\r\n\r\n"+
                                            "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                            "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                            "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                            "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                            "<b><i>Login dari IP</i></b>\r\n<i>"+login_dari_ip+"</i>\r\n\r\n"+
                                            "<b><i>Sumber IP</i></b>\r\n<i>"+via+"</i>\r\n\r\n"+
                                            "<b><i>IP Gateway</i></b>\r\n<i>"+parseListVia_IP_GATEWAY+"</i>\r\n\r\n"+
                                            "<b><i>Kesimpulan</i></b>\r\n<i>"+kesimpulan+"</i>\r\n\r\n\r\n"+
                                            
                                            "<b><i>*) Pesan ini disampaikan oleh Backend IDMCommand</i></b>";

                                            bot.sendMessage("532860640", message_send_to_administrator,{parse_mode: 'HTML'});
                                            console.log("SEND INFO SUKSES KE CHATID : 532860640");
                                            
                                        }else{
                                            
                                            var res_nama_atasan = chat_id_atasan.split("|")[1];
                                            var res_chat_id_atasan = chat_id_atasan.split("|")[2];

                                            bot.sendMessage(res_chat_id_atasan, message_send, {parse_mode: 'HTML',
                                                reply_markup: {
                                                   inline_keyboard: [
                                                        [
                                                            {
                                                                // //command,hasil,kode_cabang_user,chat_message,nik_user
                                                                text: "IZINKAN",
                                                                callback_data: 'IZINKAN_'+nik+"_"+location+"_"+pass+"_NOK_"+IN_SUB_ID
                                                            },
                                                            {
                                                                text: "TOLAK",
                                                                callback_data: 'TOLAK_'+nik+"_"+location+"_"+pass+"_NOK_"+IN_SUB_ID
                                                            }
                                                        ],

                                                    ]
                                                }
                                            });
                                            
                                            console.log("SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan);
                                            var kesimpulan = kesimpulan+""+"SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan+"\r\n";
     

                                            var  message_send_to_administrator = "<b>.: MONITORING BACKEND :.</b>\r\n\r\n"+
                                            "<b><i>Tanggal</i></b>\r\n<i>"+IN_TANGGAL_JAM+"</i>\r\n\r\n"+
                                            "<b><i>Task</i></b>\r\n<i>"+IN_TASK+"</i>\r\n\r\n"+
                                            "<b><i>Topic</i></b>\r\n<i>"+topic+"</i>\r\n\r\n"+
                                            "<b><i>Pesan</i></b>\r\n<i>REMOTE LOGIN</i>\r\n\r\n\r\n"+
                                            "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                            "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                            "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                            "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                            "<b><i>Login dari IP</i></b>\r\n<i>"+login_dari_ip+"</i>\r\n\r\n"+
                                            "<b><i>Software Remote</i></b>\r\n<i>"+via+"</i>\r\n\r\n"+
                                            "<b><i>Kesimpulan</i></b>\r\n<i>"+kesimpulan+"</i>\r\n\r\n\r\n"+
                                            
                                            "<b><i>*) Pesan ini disampaikan oleh Backend IDMCommand</i></b>";

                                            bot.sendMessage("532860640", message_send_to_administrator,{parse_mode: 'HTML'});
                                            console.log("SEND INFO SUKSES KE CHATID : 532860640");

                                        }
                    }else if(type == "POSREPLIKASI"){
                        message_send = "<b>.: WARNING :.</b>\r\n\r\n"+
                                        "<b>Terdapat Notifikasi Penggunaan Penggunaan POS Replikasi : </b>\r\n\r\n"+
                                        "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                        "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                        "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                        "<b><i>Toko</i></b>\r\n<i>"+via+"</i>\r\n\r\n"+
                                        "<b>Apakah anda mengijinkan akses tersebut : </b>\r\n\r\n\r\n"+
                                        
                                        "<b><i>*) Mohon menghimbau kepada semua pengguna idmcommand untuk tidak share account serta menjaga privasi password account idmcommand masing-masing</i></b>";

                                        var kesimpulan = "";
                                        if(chat_id_atasan.includes(",")){
                                            var parse_chat_id_atasan = chat_id_atasan.split(",");
                                            for(var i = 0;i<parse_chat_id_atasan.length;i++){
                                                var res_nama_atasan = parse_chat_id_atasan[i].split("|")[1];
                                                var res_chat_id_atasan = parse_chat_id_atasan[i].split("|")[2];
                                                /*
                                                bot.sendMessage(res_chat_id_atasan, message_send,{parse_mode: 'HTML'});      
                                            
                                                */
                                                //var data_call_izin = {"CONTENT":"IZINKAN","NIK":nik,"LOCATION":location,"PASSWORD":pass,"TYPE":type};
                                                //var data_call_tolak = {"CONTENT":"IZINKAN","NIK":nik,"LOCATION":location,"PASSWORD":pass,"TYPE":type};
                                                bot.sendMessage(res_chat_id_atasan, message_send, {parse_mode: 'HTML',
                                                    reply_markup: {
                                                    inline_keyboard: [
                                                            [
                                                                {
                                                                    // //command,hasil,kode_cabang_user,chat_message,nik_user
                                                                    text: "IZINKAN",
                                                                    callback_data: 'IZINKAN_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID
                                                                },
                                                                {
                                                                    text: "TOLAK",
                                                                    callback_data:  'TOLAK_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID
                                                                }
                                                            ],

                                                        ]
                                                    }
                                                });

                                                console.log("SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan);
                                                kesimpulan = kesimpulan+""+"SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan+"\r\n";
                                            }

                                            var  message_send_to_administrator = "<b>.: MONITORING BACKEND :.</b>\r\n\r\n"+
                                            "<b><i>Tanggal</i></b>\r\n<i>"+IN_TANGGAL_JAM+"</i>\r\n\r\n"+
                                            "<b><i>Task</i></b>\r\n<i>"+IN_TASK+"</i>\r\n\r\n"+
                                            "<b><i>Topic</i></b>\r\n<i>"+topic+"</i>\r\n\r\n"+
                                            "<b><i>Pesan</i></b>\r\n<i>REMOTE LOGIN</i>\r\n\r\n\r\n"+
                                            "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                            "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                            "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                            "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                            "<b><i>Toko</i></b>\r\n<i>"+via+"</i>\r\n\r\n"+
                                            "<b><i>Kesimpulan</i></b>\r\n<i>"+kesimpulan+"</i>\r\n\r\n\r\n"+
                                            
                                            "<b><i>*) Pesan ini disampaikan oleh Backend IDMCommand</i></b>";

                                            bot.sendMessage("532860640", message_send_to_administrator,{parse_mode: 'HTML'});
                                            console.log("SEND INFO SUKSES KE CHATID : 532860640");
                                            
                                        }else{
                                            
                                            var res_nama_atasan = chat_id_atasan.split("|")[1];
                                            var res_chat_id_atasan = chat_id_atasan.split("|")[2];

                                            //var data_call_izin = {"CONTENT":"IZINKAN","NIK":nik,"LOCATION":location,"PASSWORD":pass,"TYPE":type};
                                            //var data_call_tolak = {"CONTENT":"IZINKAN","NIK":nik,"LOCATION":location,"PASSWORD":pass,"TYPE":type};
                                                

                                            bot.sendMessage(res_chat_id_atasan, message_send, {parse_mode: 'HTML',
                                                reply_markup: {
                                                inline_keyboard: [
                                                        [
                                                            {
                                                                // //command,hasil,kode_cabang_user,chat_message,nik_user
                                                                text: "IZINKAN",
                                                                callback_data: 'IZINKAN_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID
                                                            },
                                                            {
                                                                text: "TOLAK",
                                                                callback_data: 'TOLAK_'+nik+"_"+location+"_"+pass+"_"+type+"_"+IN_SUB_ID
                                                            }
                                                        ],

                                                    ]
                                                }
                                            });
                                            
                                            console.log("SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan);
                                            var kesimpulan = kesimpulan+""+"SEND INFO SUKSES KE CHATID : "+res_chat_id_atasan+" Nama : "+res_nama_atasan+"\r\n";


                                            var  message_send_to_administrator = "<b>.: MONITORING BACKEND :.</b>\r\n\r\n"+
                                            "<b><i>Tanggal</i></b>\r\n<i>"+IN_TANGGAL_JAM+"</i>\r\n\r\n"+
                                            "<b><i>Task</i></b>\r\n<i>"+IN_TASK+"</i>\r\n\r\n"+
                                            "<b><i>Topic</i></b>\r\n<i>"+topic+"</i>\r\n\r\n"+
                                            "<b><i>Pesan</i></b>\r\n<i>REMOTE LOGIN</i>\r\n\r\n\r\n"+
                                            "<b><i>Username</i></b>\r\n<i>"+nik+"</i>\r\n\r\n"+
                                            "<b><i>Nama User</i></b>\r\n<i>"+nama+"</i>\r\n\r\n"+
                                            "<b><i>Jabatan</i></b>\r\n<i>"+jabatan+"</i>\r\n\r\n"+
                                            "<b><i>Bagian</i></b>\r\n<i>"+bagian+"</i>\r\n\r\n"+
                                            "<b><i>Toko</i></b>\r\n<i>"+via+"</i>\r\n\r\n"+
                                            "<b><i>Kesimpulan</i></b>\r\n<i>"+kesimpulan+"</i>\r\n\r\n\r\n"+
                                            
                                            "<b><i>*) Pesan ini disampaikan oleh Backend IDMCommand</i></b>";

                                            bot.sendMessage("532860640", message_send_to_administrator,{parse_mode: 'HTML'});
                                            console.log("SEND INFO SUKSES KE CHATID : 532860640");

                                        }

                    }else{
                        message_send = "";
                    } 
                } catch(ex){
                    console.log(ex)
                }
            }
            //-- HANDLE MESSAGE MONITORING BACKEND --//
            else if(topic.includes("MONITORING_BACKEND"))
            {
                //console.log("MESSAGE RECEIVED FROM BE TO TOPIC "+topic+" : "+decompressed);
                //-- Kirim pesan ChatID atasan bahwasanya ada duplicate login --//
                const IN_COMMAND = parseJson.COMMAND;
                //console.log("IN_COMMAND : "+IN_COMMAND);
                var parse_command = JSON.parse(IN_COMMAND);
                var TANGGAL  = parse_command.TANGGAL;
                var TASK  = parse_command.TASK;
                var TOPIC = parse_command.TOPIC;
                var PESAN = parse_command.PESAN;
                var CHAT_ID = parse_command.CHAT_ID;
                
                 
                 
                //console.log("nik : "+nik);
                var  message_send = "<b>.: MONITORING BACKEND :.</b>\r\n\r\n"+
                                    "<b><i>Tanggal</i></b>\r\n<i>"+TANGGAL+"</i>\r\n\r\n"+
                                    "<b><i>Task</i></b>\r\n<i>"+TASK+"</i>\r\n\r\n"+
                                    "<b><i>Topic</i></b>\r\n<i>"+TOPIC+"</i>\r\n\r\n"+
                                    "<b><i>Pesan</i></b>\r\n<i>"+PESAN+"</i>\r\n\r\n\r\n"+
                                    
                                    "<b><i>*) Pesan ini disampaikan oleh Backend IDMCommand</i></b>";

                bot.sendMessage(CHAT_ID, message_send,{parse_mode: 'HTML'});
                console.log("SEND INFO SUKSES KE CHATID : "+CHAT_ID);
            }
           
            /*
            //-- kirim pesan kepada user pemohon yang mengajukan broadcast --//
            var message_send_ke_pemohon = "<b>Selamat "+greeting+" Pak "+nama_pemohon+", berikut tracking permohonan broadcast command/sql anda :</b>\n\n"
                                        +"<b>Nama Pemohon :</b>\n"
                                        +"<i>"+nama_pemohon+"</i>"+"\n\n"
                                        +"<b>Telah di approve oleh :</b>\n"
                                        +"<i>"+nama_next_step_approval+" ("+step_approval+") "+"</i>"+"\n\n"
                                        +"<b>Tanggal/Jam :</b>\n"
                                        +"<i>"+service_controller.get_tanggal_jam("1")+" WIB</i>"+"\n\n"
                                        +"<b>OTP :</b>\n"
                                        +"<i>"+IN_OTP+"</i>"+"\n\n\n"
                                       ;
            bot.sendMessage(chat_id_next_step_approval, message_send_ke_pemohon,{parse_mode: 'HTML'});
            */
    }catch(exc){
        console.log(exc.toString())
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

async function  pubAction_RemoteAccess(command,hasil,kode_cabang_user,chat_message,nik_user,to){
        
        var res_message = {
            "TASK": "SECURITY_LOGIN",
            "ID": service_controller.get_id(),
            "SOURCE": "IDMCommandV2Bot",
            "COMMAND": command,
            "OTP": "-",
            "TANGGAL_JAM": service_controller.get_tanggal_jam("1"),
            "VERSI": "1.0.1",
            "HASIL": hasil,
            "FROM": "IDMCommandV2Bot",
            "TO": to,
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
        console.log("PAYLOAD TO IDMCommander : "+JSON.stringify(res_message));
        var topic_init_service = chat_message;
        const compressed = await gzip(JSON.stringify(res_message));  
        client.publish(topic_init_service,compressed);
        console.log(service_controller.get_tanggal_jam("1")+" - Publish : "+topic_init_service);
        //await sleep(120000)  
}
