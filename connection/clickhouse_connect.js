const { ClickHouse } = require('clickhouse');
var host_ = "103.161.184.103";
var port_ = 8123;
var user_ = "default";
var password_ = "123456";


const clickhouse = new ClickHouse({
	url: 'http://'+host_,
	port: 8123,
	debug: false,
	basicAuth: {
		username: 'default',
		password: '123456',
	},
	isUseGzip: false,
	format: "json", // "json" || "csv" || "tsv"
	raw: false,
	config: {
		session_id                              : 'BC_Command_DCService',
		session_timeout                         : 60,
		output_format_json_quote_64bit_integers : 0,
		enable_http_compression                 : 0,
		database                                : 'idmcmd',
	},
	
	// This object merge with request params (see request lib docs)
	reqParams: {
		 
	}
});

function ExecuteQueryClickHouse(sql_query){
	
	return new Promise((resolve, reject) => {
	    try{
		    clickhouse.query(sql_query).exec((err, rows) => {
				console.log(rows);
				if(err){
		          reject(err)
		          	clickhouse.query(sql_query).exec(function (err, rows) {
						if(err){
		          			console.log("ERROR QUERY 2 : "+err);
		          		}else{

		          		}
					});
		        }
		        else{
		          resolve(rows)
		        }	
			});
	    }
	    catch(ex){
	      reject(ex)
	    }
	})  

}

module.exports.ExecuteQueryClickHouse = ExecuteQueryClickHouse
