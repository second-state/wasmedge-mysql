
// Packages

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

// Body parser
var bodyParser = require('body-parser');
app.use(bodyParser.raw({
    type: "application/octet-stream",
    limit: 100000000
}));


// TODO set up https/ssl using let's encrypt
// TODO get domain name mapped to env.server_name
// TODO open port on machine
// TODO port forward at gateway


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

