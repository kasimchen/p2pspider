'use strict';

// This is an example of using p2pspider, you can change the code to make it do something else.
var fs = require('fs');
var path = require('path');

var bencode = require('bencode');
var P2PSpider = require('./lib');

var redis = require("redis");
var mysql = require('mysql');
var mysql_con = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '15811225474',
    database:'dht'
});

var client = redis.createClient(6379,"127.0.0.1",{});
mysql_con.connect();

var p2p = P2PSpider({
    nodesMaxSize: 400,
    maxConnections: 800,
    timeout: 10000
});

p2p.ignore(function (infohash, rinfo, callback) {

    var torrentFilePathSaveTo = path.join(__dirname, "torrents", infohash + ".torrent");
    fs.exists(torrentFilePathSaveTo, function(exists) {
        callback(exists); //if is not exists, download the metadata.
    });
});

p2p.on('metadata', function (metadata) {



    var array_file_parent = {};
    array_file_parent.name = metadata.info.name.toString();
    array_file_parent.length = metadata.info.length==undefined?metadata.info['piece length']:metadata.info.length;
    array_file_parent.infohash = metadata.infohash;
    array_file_parent.count = 1;
    array_file_parent.file = Array();

    if(metadata.info.files!=undefined) {

        for (var i = 0; i < metadata.info.files.length; i++) {
            var str = metadata.info.files[i].path.toString();
            var array_file = {};
            array_file.name = str;
            array_file.length = metadata.info.files[i].length;
            array_file_parent.file.push(array_file);
        }

        array_file_parent.count = metadata.info.files.length;
    }

    //验证重复性


    var go_on = true;
    client.select('5', function(error){
        if(error) {
            console.log(error);
            return false;
        } else {
            // set
            client.sismember("infohash", metadata.infohash, function(error, res) {

                if(res){
                    go_on ==false;
                    console.log('存在了');
                }

            });
        }
    });

    if(go_on==false) return false;

    //存入数据库


    var insert_sql = 'insert into info(name,length,infohash,count) values(?,?,?,?)';
    var insert_sql_params = [
        array_file_parent.name,
        array_file_parent.length,
        array_file_parent.infohash,
        array_file_parent.count,
    ];


        mysql_con.query(insert_sql, insert_sql_params, function (err, rows, fields) {

            if (err){
                return false;
            }

            var id = rows.insertId;


            if(array_file_parent.file.length>0) {

                var insert_body_sql = 'insert into info_body(info_id,body) values(?,?)';
                var insert_body_sql_params = [
                    id,
                    JSON.stringify(array_file_parent.file)
                ];

                mysql_con.query(insert_body_sql, insert_body_sql_params, function (err, rows, fields) {
                    if (err) {
                        return false;
                    }

                });

            }


        });



    //写入缓存验证重复

    client.select('5', function(error){
        if(error) {
            console.log(error);
        } else {
            // set
            client.sadd("infohash", metadata.infohash, function(error, res) {
            });
        }
    });

    //client.end();
    //mysql_con.end();


    /*
    var torrentFilePathSaveTo = path.join(__dirname, "torrents", metadata.infohash + ".torrent");
    fs.writeFile(torrentFilePathSaveTo, bencode.encode({'info': metadata.info}), function(err) {
        if (err) {
            return console.error(err);
        }
        console.log(metadata.infohash + ".torrent has saved.");
    });*/
});

p2p.listen(6881, '0.0.0.0');
