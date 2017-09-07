'use strict';

// This is an example of using p2pspider, you can change the code to make it do something else.
var fs = require('fs');
var path = require('path');

var bencode = require('bencode');
var P2PSpider = require('./lib');

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

    /*
    var redis = require("redis"),
        client = redis.createClient(6379,"127.0.0.1",{});

    client.select('5', function(error){
        if(error) {
            console.log(error);
        } else {
            // set
            client.set(metadata.infohash, metadata.info.name.toString(), function(error, res) {
                if(error) {
                    console.log(error);
                } else {
                    console.log(res);
                }

                // 关闭链接
                client.end();
            });
        }
    });*/



    var array_file_parent = {};
    array_file_parent.name = metadata.info.name.toString();
    array_file_parent.length = metadata.info.length==undefined?metadata.info['piece length']:metadata.info.length;
    array_file_parent.infohash = metadata.infohash;


    array_file_parent.file = Array();

    if(metadata.info.files!=undefined) {

        for (var i = 0; i < metadata.info.files.length; i++) {
            var str = metadata.info.files[i].path.toString();
            var array_file = {};
            array_file.name = str;
            array_file.length = metadata.info.files[i].length;
            array_file_parent.file.push(array_file);
        }
    }

    console.log(array_file_parent);

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
