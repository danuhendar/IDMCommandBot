
var mqtt    = require('mqtt');
const {gzip, ungzip} = require('node-gzip');
var Promise = require('promise');
var mysqlLib = require('./connection/mysql_connection');
var clickhouseLib = require('./connection/clickhouse_connect');
var service_controller = require('./controller/service_controller');
const fs = require('fs');
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

fs.readFile('appconfig.json', (err, data) => {
    if (err) throw err;
    let student = JSON.parse(data);
});

var client  = mqtt.connect("mqtt://172.24.16.131",{clientId:"IDMCommandBOT",clean:true,port:1883,retain:false});
client.on("connect", function(){    
    console.log("connected MQTT"); 
    subs_DCCommand('RES_OTP/IDMCommandBot');
    
});

client.on("error",function(error){
    console.log("Can't connect MQTT Broker : " + error);
    process.exit(1)
});

// replace the value below with the Telegram token you receive from @BotFather
const token = '1972085415:AAFe6k8ss_kWPeDMSEp1GzsZIc_YmKAARdU';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});
bot.onText(/\/start/, (msg) => {
    try{    
            const sql_query = "SELECT EXISTS(SELECT LOCATION FROM idm_org_structure WHERE CHAT_ID = '"+msg.chat.id+"') AS HASIL;";
            console.log(sql_query)
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

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const Username = msg.chat.username;

    if(msg.text.toString().includes('list_broadcast')){
        //-- pengecekan list pengajuan broadcast --//
        //-- pengecekan list pengajuan broadcast --//
        const sql_query_list_bc = "SELECT COUNT(CREATE_DATE) AS JUMLAH FROM broadcast_pengajuan WHERE IS_APPROVAL = '0' AND DATE(CREATE_DATE) BETWEEN CURDATE()-1 AND CURDATE() AND KDCAB = (SELECT LOCATION FROM idm_org_structure WHERE CHAT_ID = '"+msg.chat.id+"' ORDER BY NIK ASC LIMIT 0,1);"
        console.log(sql_query_list_bc);
        mysqlLib.executeQuery(sql_query_list_bc).then((d) => {
        const res_hasil_list_bc = parseFloat(d[0].JUMLAH);
        if(res_hasil_list_bc > 0){
           //-- proses list broadcast command --//
           const sql_query_bc_command = "SELECT CONCAT('/CMD','_',KDCAB,'_',SUB_ID,'_',REPLACE(NAMA,' ','')) AS ID FROM broadcast_pengajuan WHERE IS_APPROVAL = '0' AND DATE(CREATE_DATE) BETWEEN CURDATE()-1 AND CURDATE() AND KDCAB = (SELECT LOCATION FROM idm_org_structure WHERE CHAT_ID = '"+msg.chat.id+"' ORDER BY NIK ASC LIMIT 0,1);"
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
                console.log(list_bc_command)
            } 
            
            console.log(data)
            bot.sendMessage(msg.chat.id, "Berikut daftar broadcast command yang diajukan : \n"+data);
          }); 
             
        }else{
              bot.sendMessage(msg.chat.id, "Tidak ada daftar broadcast command yang diajukan oleh tim anda");
        }

    });

    }else if (msg.text.toString().includes('OTP')) {
        
        const kdcab = msg.text.toString().split('_')[1];
        const sub_id = msg.text.toString().split('_')[2];
        const nama = msg.text.toString().split('_')[3];
        
        try{
            //-- pengecekan apakah data broadcast pengajuan sudah terapproval atau belum --//
            const sql_query_cek_data_pengajuan = "SELECT EXISTS(SELECT CREATE_DATE FROM broadcast_pengajuan WHERE IS_APPROVAL = '0' AND SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"' ) AS HASIL_CEK_DATA"
            console.log(sql_query_cek_data_pengajuan)
            mysqlLib.executeQuery(sql_query_cek_data_pengajuan).then((d) => {
                  //-- jika belum ter-approval maka lakukan proses generate OTP --//  
                  const hasil_cek_data = parseFloat(d[0].HASIL_CEK_DATA);
                  if(hasil_cek_data == 1){
                        //-- cek otorisasi OTP --//
                        //== IFNULL((SELECT IF(JABATAN='SUPPORT','SUPERVISOR',IF(JABATAN='SUPERVISOR','MANAGER','HO')) FROM `pattern_command` WHERE JUMLAH_KLIEN <= a.JUMLAH_CLIENT ORDER BY JUMLAH_KLIEN DESC LIMIT 0,1),'-') AS OTORISASI
                        // SELECT a.CREATE_DATE,a.KDCAB,a.JUMLAH_CLIENT,a.COMMAND_KIRIM,a.NIK,a.NAMA,a.JABATAN,a.TIPE,a.TOPIC_BC,(CASE a.IS_APPROVAL WHEN '0' THEN 'Pengajuan' WHEN '1' THEN 'OK' WHEN '2' THEN 'NOK' ELSE '' END) AS IS_APPROVAL,a.KETERANGAN,IFNULL((SELECT IF(JABATAN='SUPPORT','SUPERVISOR',IF(JABATAN='SUPERVISOR','MANAGER','HO')) FROM `pattern_command` WHERE JUMLAH_KLIEN <= a.JUMLAH_CLIENT ORDER BY JUMLAH_KLIEN DESC LIMIT 0,1),'-') AS OTORISASI,NIK_PEMBERI_OTP,NAMA_PEMBERI_OTP,DATE_FORMAT(CREATE_OTP,'%Y-%m-%d %H:%i:%s') AS CREATE_OTP  FROM broadcast_pengajuan a  WHERE IS_APPROVAL = '0' AND SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"'  ORDER BY a.CREATE_DATE DESC LIMIT 0,100
                        const sql_cek_otorisasi = "SELECT SPLIT_STRING(JABATAN,'_',1) AS JABATAN,IFNULL((SELECT IF(JABATAN RLIKE 'SUPPORT','SUPERVISOR',IF(JABATAN RLIKE 'SUPERVISOR','MANAGER','HO')) FROM `pattern_command` WHERE JUMLAH_KLIEN <= a.JUMLAH_CLIENT ORDER BY JUMLAH_KLIEN DESC LIMIT 0,1),'-') AS OTORISASI FROM broadcast_pengajuan a  WHERE IS_APPROVAL = '0' AND SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"'"
                        console.log(sql_cek_otorisasi)
                        mysqlLib.executeQuery(sql_cek_otorisasi).then((d) => {
                              const res_otorisasi = d[0].OTORISASI.trim();
                              //const res_jabatan = d[0].JABATAN.trim();
                                const sql_query = "SELECT LOCATION,NIK,NAMA,JABATAN FROM idm_org_structure WHERE CHAT_ID = '"+chatId+"' ORDER BY branch_code ASC;";
                                console.log(sql_query)
                                mysqlLib.executeQuery(sql_query).then((d) => {
                                      const res_hasil = d[0].LOCATION.trim();
                                      const res_nik = d[0].NIK;
                                      const res_nama = d[0].NAMA;
                                      const res_jabatan = d[0].JABATAN;

                                        if(res_otorisasi == res_jabatan){
                                            bot.sendMessage(msg.chat.id, "Mohon tunggu, OTP akan idmcommand akan memberikan OTP");
                                            pub_Command(chatId,res_hasil,res_nik,res_nama,kdcab,sub_id,nama);
                                            console.log("Data ada");
                                        }else{
                                            bot.sendMessage(msg.chat.id, "Mohon tunggu, OTP akan idmcommand akan memberikan OTP");
                                            console.log("Data tidak ada");
                                            pub_Command(chatId,res_hasil,res_nik,res_nama,kdcab,sub_id,nama);
                                        }  
                                });
                                
                        });
                  //-- jika sudah ter-approval muncul pesan bahwasanya data broadcast pengajuan sudah di eksekusi --//      
                  }else{
                        console.log("Not Data exists");
                        const sql_query = "SELECT DATE_FORMAT(CREATE_OTP,'%d %M %Y %H:%i:%s') AS CREATE_OTP,NAMA_PEMBERI_OTP FROM broadcast_pengajuan WHERE IS_APPROVAL = '0' AND SUB_ID = '"+sub_id+"' AND KDCAB = '"+kdcab+"' AND REPLACE(NAMA,' ','') = '"+nama+"' ";
                        console.log(sql_query)
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
                            bot.sendMessage(chatId, message_send,{parse_mode: 'HTML'});
                        });
                  }
                  
            });
           

            
        }catch(exc){
            bot.sendMessage(msg.chat.id, "Mohon maaf terjadi gangguan, silahkan kontak administrator idmcommand !!!");   
        }

        
    }else if(msg.text.toString().includes('daftar')){
        // send a message to the chat acknowledging receipt of their message
        try{    
            const sql_query = "SELECT EXISTS(SELECT LOCATION FROM idm_org_structure WHERE CHAT_ID = '"+msg.chat.id+"') AS HASIL;";
            console.log(sql_query)
            mysqlLib.executeQuery(sql_query).then((d) => {
                  const res_hasil = d[0].HASIL;
                  if(res_hasil == '1'){
                     //-- pengecekan list pengajuan broadcast --//       
                     bot.sendMessage(msg.chat.id, 'Anda sudah terdaftar pada sistem IDMCommandBot');         
                 }else{
                     bot.sendMessage(msg.chat.id, "Masukan NIK anda contoh : #2013001002");
                 }
                 
            });
        }catch(exc){
           bot.sendMessage(msg.chat.id, "Mohon maaf terjadi kesalahan, "+exc.Stack);
           
        }
        
       
    }else if(msg.text.toString().includes('#')){
        const nik_user = msg.text.toString().split("#").join('');
        const sql_query_cek_nik = "SELECT EXISTS(SELECT NIK FROM idm_org_structure WHERE NIK = '"+nik_user+"') AS HASIL;";
        console.log(sql_query_cek_nik)
        mysqlLib.executeQuery(sql_query_cek_nik).then((d) => {
            const res_hasil_cek_nik = d[0].HASIL;
            if(res_hasil_cek_nik == '1'){

                const sql_query_jabatan = "SELECT IF(a.JABATAN='ADMINISTRATOR' OR a.JABATAN LIKE 'SUPERVISOR%' OR a.JABATAN='MANAGER','1','0') AS HASIL FROM idm_org_structure a WHERE a.NIK = '"+nik_user+"';";
                console.log(sql_query_jabatan)
                mysqlLib.executeQuery(sql_query_jabatan).then((d) => {
                     const res_hasil_jabatan = d[0].HASIL.trim();
                     if(res_hasil_jabatan == '1'){
                        try{
                                //-- proses update chat id berdasarkan nik yang mendaftar --//
                                const sql_query = "UPDATE idm_org_structure SET CHAT_ID = '"+chatId+"' WHERE NIK = '"+nik_user+"';";
                                console.log(sql_query)

                                mysqlLib.executeQuery(sql_query).then((d) => {
                                    bot.sendMessage(msg.chat.id, 'Selamat, Anda telah terdaftar pada idmcommandbot'); 
                                });   

                                //-- pengecekan list pengajuan broadcast --//
                                const sql_query_list_bc = "SELECT COUNT(CREATE_DATE) AS JUMLAH FROM broadcast_pengajuan WHERE IS_APPROVAL = '0' AND DATE(CREATE_DATE) = CURDATE() AND KDCAB = (SELECT LOCATION FROM idm_org_structure WHERE CHAT_ID = '"+msg.chat.id+"' ORDER BY NIK ASC LIMIT 0,1);"
                                console.log(sql_query_list_bc);
                                mysqlLib.executeQuery(sql_query_list_bc).then((d) => {
                                    const res_hasil_list_bc = parseFloat(d[0].JUMLAH);
                                    if(res_hasil_list_bc > 0){
                                        //-- proses list broadcast command --//
                                        const sql_query_bc_command = "SELECT CONCAT('/CMD','_',KDCAB,'_',SUB_ID,'_',REPLACE(NAMA,' ','')) AS ID FROM broadcast_pengajuan WHERE IS_APPROVAL = '0' AND DATE(CREATE_DATE) = CURDATE() AND KDCAB = (SELECT LOCATION FROM idm_org_structure WHERE CHAT_ID = '"+msg.chat.id+"' ORDER BY NIK ASC LIMIT 0,1);"
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
                                            console.log(data)
                                            bot.sendMessage(msg.chat.id, "Berikut daftar broadcast command yang diajukan : \n"+data);
                                        }); 
                                       
                                    }else{
                                            bot.sendMessage(msg.chat.id, "Tidak daftar broadcast command yang diajukan oleh tim anda");
                                    }
                                }); 
                        }catch(exc){
                               bot.sendMessage(msg.chat.id, "Mohon maaf terjadi gangguan saat pendaftaran user, silahkan kontak administrator !!!");    
                        }
                       
                    }else{
                        bot.sendMessage(msg.chat.id, "Mohon maaf anda tidak berhak mengakses menu idmcommandbot !!!");    
                    }
                });   

           }else{
                bot.sendMessage(msg.chat.id, "NIK : "+nik_user+" tidak ada dalam sistem idmcommand, mohon cek kembali inputan nik.");
           }


        });   

    }else if(msg.text.toString().includes('CMD')){
        const pesan = msg.text.toString();
        const kdcab = pesan.split('_')[1];
        const sub_id = pesan.split('_')[2];
        const nama = pesan.split('_')[3];
        //--munculkan detail command yang akan di broadcast --//
        const sql_query_command_kirim = "SELECT DATE_FORMAT(CREATE_DATE,'%d %M %Y %H:%i:%s') AS CREATE_DATE,NAMA,JABATAN,TIPE_BC AS TIPE,JUMLAH_CLIENT,IF(LENGTH(COMMAND_KIRIM)>200,CONCAT(CONVERT(COMMAND_KIRIM,CHAR(200)),' dst.'),COMMAND_KIRIM) AS COMMAND_KIRIM,KETERANGAN FROM broadcast_pengajuan WHERE KDCAB = '"+kdcab+"' AND SUB_ID = '"+sub_id+"' AND IS_APPROVAL = '0' AND REPLACE(NAMA,' ','') = '"+nama+"';";
        console.log(sql_query_command_kirim)

        mysqlLib.executeQuery(sql_query_command_kirim).then((d) => {
            const create_date = d[0].CREATE_DATE;
            const nama = d[0].NAMA;
            const jabatan = d[0].JABATAN;
            const tipe = d[0].TIPE;
            const jumlah_client = d[0].JUMLAH_CLIENT;
            const command_kirim = d[0].COMMAND_KIRIM;
            const keterangan = d[0].KETERANGAN;
            var message = "";
            if(tipe === 'CMD'){
                message = "<b>Tanggal Broadcast :</b>\n"
                        +"<i>"+create_date+"</i>"+"\n\n"
                        +"<b>Nama :</b>\n"
                        +"<i>"+nama+"</i>"+"\n\n"
                        +"<b>Jabatan :</b>\n"
                        +"<i>"+jabatan+"</i>"+"\n\n"
                        +"<b>Tipe :</b>\n"
                        +"<i>"+tipe+"</i>"+"\n\n"
                        +"<b>Command :</b>\n"
                        +"<i>`"+command_kirim+"`</i>"+"\n\n"
                        +"<b>Jumlah Klien :</b>\n"
                        +"<i>"+jumlah_client+"</i>"+"\n\n"
                        +"<b>Keterangan :</b>\n"
                        +"<i>"+keterangan+"</i>"+"\n\n\n\n"
                        +"<i>*) Mohon Bapak SPV/MGR untuk melakukan supervisi terhadap command yang akan di broadcast sebelum melakukan generate OTP.</i>\n\n"
                        +"<b><i>Silahkan klik link dibawah untuk generate OTP</i></b>\n"
                        +"/OTP_"+kdcab+"_"+sub_id+"_"+nama.split(" ").join('').split(' ').join('').split(' ').join('')
                        ;
                        bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
                    }else{
                        message = "Tanggal Broadcast :\n"
                        +""+create_date+""+"\n\n"
                        +"Nama :\n"
                        +""+nama+""+"\n\n"
                        +"Jabatan :\n"
                        +""+jabatan+""+"\n\n"
                        +"Tipe :\n"
                        +""+tipe+""+"\n\n"
                        +"Command :\n"
                        +"`"+command_kirim+"`"+"\n\n"
                        +"Jumlah Klien :\n"
                        +""+jumlah_client+""+"\n\n"
                        +"Keterangan :\n"
                        +""+keterangan+""+"\n\n\n\n"
                        +"*) Mohon Bapak SPV/MGR untuk melakukan supervisi terhadap command yang akan di broadcast sebelum melakukan generate OTP.\n\n"
                        +"Silahkan klik link dibawah untuk generate OTP\n"
                        +"/OTP_"+kdcab+"_"+sub_id+"_"+nama.split(" ").join('').split(' ').join('').split(' ').join('')
                        ;
                        bot.sendMessage(msg.chat.id, message); 
                    }
            
           
        });
    }else if(msg.text.toString().includes('list_sudah_eksekusi')){
        const sql_get_cabang = "SELECT LOCATION FROM idm_org_structure WHERE CHAT_ID = '"+chatId+"';"
        console.log(sql_get_cabang)

        mysqlLib.executeQuery(sql_get_cabang).then((d) => {
            const location = d[0].LOCATION;
            const sql_query_command_kirim = "SELECT DATE_FORMAT(CREATE_DATE,'%d %M %Y %H:%i:%s') AS CREATE_DATE,NAMA,JABATAN,IFNULL(TIPE_BC,'CMD') AS TIPE,JUMLAH_CLIENT,COMMAND_KIRIM,KETERANGAN FROM broadcast_pengajuan WHERE KDCAB = '"+location+"'  AND IS_APPROVAL = '1' ORDER BY CREATE_DATE DESC LIMIT 0,5;";
            console.log(sql_query_command_kirim)

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
        const sql_get_cabang = "SELECT LOCATION,BRANCH_CODE FROM idm_org_structure WHERE CHAT_ID = '"+chatId+"';"
        console.log(sql_get_cabang)

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
                                              
                                              " FROM transreport"+tanggal+" a INNER JOIN idm_org_structure b ON SPLIT_STRING(a.`FROM`,'_',2)=b.NIK "+
                                              " WHERE a.KDCAB IN('G025','G004','G301','G148','G305','G174','G034','G146','G097','G030','G149','G158','G177') "+
                                              " AND a.SOURCE = 'IDMCommander' "+
                                              " AND b.LOCATION = '"+location+"' "+
                                              " GROUP BY NIK "+
                                              " ORDER BY LAST_AKTIVITAS DESC LIMIT 0,30;";
            console.log(sql_query_command_kirim)

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


            const sql_query_command_kirim = "SELECT m.KDCAB,(SELECT BRANCH_NAME FROM idm_org_branch WHERE BRANCH_CODE = m.KDCAB) AS CABANG,m.JUMLAH AS JUMLAH_KLIEN,n.JUMLAH AS ONLINE,m.JUMLAH-n.JUMLAH AS OFFLINE FROM (SELECT KDCAB,COUNT(*) AS JUMLAH FROM tokomain WHERE STATION != 'STB' GROUP BY KDCAB ORDER BY KDCAB) m "+
                                                " INNER JOIN "+ 
                                                " (SELECT KDCAB,JUMLAH FROM (SELECT v.KDCAB,v.STATUS,COUNT(*) AS JUMLAH FROM (SELECT a.KDCAB,a.TOKO, "+
                                                                                           " a.NAMA, "+
                                                                                           " a.STATION, "+
                                                                                           " a.IP, "+
                                                                                           " b.VERSION, "+
                                                                                           " b.ADDTIME AS LAST_REPORT, "+
                                                                                           " IF(DATE_FORMAT(b.ADDTIME,'%Y-%m-%d')=CURDATE(),'ONLINE','OFFLINE') AS STATUS "+
                                                                                           " FROM tokomain a LEFT JOIN (SELECT KDTK,IP,STATION,VERSION AS VERSION,ADDTIME AS ADDTIME FROM initreport WHERE KDCAB LIKE '%') b ON b.KDTK=a.TOKO AND a.STATION=b.STATION "+
                                                                                           " WHERE a.KDCAB LIKE '%' AND a.STATION != 'STB' "+
                                                                    
                                                                                           " HAVING STATUS LIKE '%'  "+
                                                                                           " ORDER BY a.TOKO,a.STATION ASC) v GROUP BY v.KDCAB,v.STATUS  "+
                                                                                           " ORDER BY v.KDCAB ASC) n WHERE STATUS = 'ONLINE' AND KDCAB != '') n ON m.KDCAB=n.KDCAB "+
                                               
         
                                            " ;";
            console.log(sql_query_command_kirim)

            mysqlLib.executeQuery(sql_query_command_kirim).then((d) => {
              var message = "Berikut data status listener toko di masing-masing cabang : "+"\n"+
                            "<i>Tanggal : "+service_controller.get_tanggal_jam("4")+"</i>\n"+
                            "----------------------------------------------------------------------\n"+
                            "|KDCAB|CABANG|JUMLAH|ONLINE|OFFLINE\n"+
                            "----------------------------------------------------------------------\n"
                            ;
                
                for(var i = 0;i<d.length;i++){
                    const KDCAB = d[i].KDCAB;
                    const CABANG = d[i].CABANG;
                    const JUMLAH_KLIEN = d[i].JUMLAH_KLIEN;
                    const ONLINE = d[i].ONLINE;
                    const OFFLINE = d[i].OFFLINE;

                    message += "|"+KDCAB+"|"+CABANG+"|<b>"+JUMLAH_KLIEN+"</b>|<b>"+ONLINE+"</b>|<b style='color: darkred;'>"+OFFLINE+"</b>\n"
                                ;
                }
                bot.sendMessage(msg.chat.id, message, {parse_mode: 'HTML'}); 
            });
        
       
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
                                                    
                                                    " FROM transaksi_menu_edp a INNER JOIN idm_org_structure b ON a.NIK_USER=b.NIK "+
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
        
    
    }else{
        //bot.sendMessage(msg.chat.id, "Pesan tidak dikenali");
    }
});

client.on('message',async function(topic, compressed){
    try{
            const decompressed = await ungzip(compressed);
            const parseJson = JSON.parse(decompressed);
            const IN_SOURCE = parseJson.SOURCE;
            const IN_TASK = parseJson.TASK;
            const IN_FROM = parseJson.FROM;
            const parseJsonChatId = JSON.parse(parseJson.CHAT_MESSAGE);
            const SUB_CHAT_ID = parseJsonChatId.CHAT_ID;
            const IN_CABANG = parseJson.CABANG;
            const IN_OTP = parseJson.OTP;
            var tanggal_message_terima = service_controller.get_tanggal_jam("1");
            console.log(tanggal_message_terima+" : "+topic)
            bot.sendMessage(SUB_CHAT_ID, IN_OTP);  
    }catch(exc){
        console.log("ERROR TERIMA MESAGE : "+exc+" topic : "+topic+" pesan : "+compressed)  
    }
});

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