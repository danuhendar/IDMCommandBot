const mysql = require('mysql2');
const fs = require('fs');

fs.readFile('appconfig.json', (err, data) => {
    if (err) throw err;
    let student = JSON.parse(data);
    //console.log(student);
});

const mysqlConfig = {
  host: '172.24.52.30',
  user: 'idmcmd',
  password: 'idmcmd@Idm2024',
  database: 'idmcmd2',
  port: 6446
}

const mysqlConfig_DRC = {
  host: '192.168.131.223',
  user: 'root',
  password: 'edpho@Idm2020',
  database: 'idmcmd',
  port: 3306
}

var pool = mysql.createPool(mysqlConfig);
//var pool_drc = mysql.createPool(mysqlConfig_DRC);

module.exports.connect = function (cb) {
  return new Promise((resolve, reject) => {
    pool.on('connection', function (connection) {
      connection.on('error', function (err) {
        console.log('MySQL error event', err)



      });
      connection.on('close', function (err) {
        console.log('MySQL close event', err)



      });
    });
    resolve()
  })
}

async function executeQuery (query) {
  //console.log(`query: `, query)
  return new Promise((resolve, reject) => {
    try{
      pool.query(query, (e, r, f) => {
        if(e){
          reject(e)
        }
        else{
          resolve(r)
        }
      });
    }
    catch(ex){
      reject(ex)
    }
  })  
}

async function execSP(spName, params){
  return new Promise((resolve, reject) => {
    try{
      var paramPlaceHolder = ''
      if(params && params.length){
        for(var i = 0; i < params.length; i++){
          paramPlaceHolder += '?,'
        }
      }
      if(paramPlaceHolder.length){
        paramPlaceHolder = paramPlaceHolder.slice(0, -1)
      }
      console.log('final SP call', `CALL ${spName}(${params})`)
      pool.query(`CALL ${spName}(${paramPlaceHolder})`, params, (e, r, f) => {
        if(e){
          reject(e)
        }
        else{
          resolve(r)
        }
      });
    }
    catch(ex){
      reject(ex)
    }
  })
}
module.exports.executeQuery = executeQuery
module.exports.execSP = execSP