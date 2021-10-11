// Packages
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const express = require('express');
const app = express();
app.use(helmet());

require('dotenv').config();

var cors = require('cors');
app.use(cors());

const mysql = require('mysql');
const connection = mysql.createConnection({
  host: process.env.db_host,
  user: process.env.db_user,
  password: process.env.db_password,
  database: process.env.db_name
});
connection.connect((err) => {
  if (err) throw err;
  console.log('Connection to database succeeded!');
});

// Body parser
var bodyParser = require('body-parser');
app.use(bodyParser.raw({
  type: "application/octet-stream",
  limit: 100000000
}));


// TODO get domain name mapped ip
// TODO set up https/ssl using let's encrypt
// TODO open port 8888 on machine (iptables UFW)
// TODO port forward 8888 at gateway


const https = require('https');

const fs = require('fs');
const server_name = process.env.server_name;
const host = process.env.host;
const port = process.env.port;
const privateKey = fs.readFileSync('/etc/letsencrypt/live/' + server_name + '/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/' + server_name + '/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/' + server_name + '/fullchain.pem', 'utf8');
const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca
};

// Filtering the content types which are allowed to access Joey
app.use(function(req, res, next) {
  if (req.method === 'POST') {
    if (req.is('application/octet-stream' !== 'application/octet-stream')) {
      return res.send(406);
    }
  }
  next();
});

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60 // limit each IP to 60 requests per windowMs
});

//  apply to all requests
app.use(limiter);

https.createServer(credentials, app).listen(port, host, () => {
  console.log("Server started ...");
});


// Helper functions
function performSqlQuery(string_query) {
  return new Promise(function(resolve, reject) {
    connection.query(string_query, function(err, resultSelect) {
      if (err) {
        res.status(400).send("Perhaps a bad request, or database is not running");
      }
      resolve(resultSelect);
    });
  });
}

// API endpoints

// POST i.e. Store data

app.post('/api/store', bodyParser.raw(), (req, res) => {
  if (req.is('application/octet-stream') == 'application/octet-stream') {
    var data_to_store = Uint8Array.from(req.body);
    var sqlInsert = "INSERT INTO wasmedge_data(wasmedge_id, wasmedge_blob) VALUES(UUID_TO_BIN(UUID()), " + data_to_store + ");";
    performSqlQuery(sqlInsert).then((resultInsert) => {
      console.log("1 record inserted at wasmedge_id: " + resultInsert.insertId);
      res.end(resultInsert.insertId);
    });
  }
});

// GET i.e. Load data

app.get('/api/load/:wasmedge_id', (req, res) => {
  var sqlSelect = "SELECT wasmedge_blob FROM wasmedge_data where BIN_TO_UUID(wasmedge_id) = " + req.params.wasmedge_id + ";";
  performSqlQuery(sqlSelect).then((result) => {
    res.end(result[0].wasm_binary);
  });
});

// PUT i.e. Update data

app.put('/api/update/:wasmedge_id', bodyParser.raw(), (req, res) => {
  if (req.is('application/octet-stream') == 'application/octet-stream') {
    var data_to_store = Uint8Array.from(req.body);
    var sqlUpdate = "UPDATE wasmedge_data SET wasmedge_blob = " + data_to_store + " WHERE BIN_TO_UUID(wasmedge_id) = " + req.params.wasmedge_id + ";";
    performSqlQuery(sqlUpdate).then((result) => {
      res.end(req.params.wasmedge_id);
    });
  }
});

// DELETE i.e. Remove the data

app.delete('/api/delete/:wasmedge_id', (req, res) => {
  var sqlDelete = "DELETE from wasmedge_data where BIN_TO_UUID(wasmedge_id) = " + req.params.wasmedge_id + ";";
  performSqlQuery(sqlDelete).then((result) => {
    res.end(req.params.wasmedge_id);
  });
});