# Use our ready-made MySQL service

Good news!, if you would like persistent data in your wasmedge application, simply follow the usage examples below.

# Usage

## Endpoints

###

###

###

###


---

As mentioned above, this MySQL service is already set up and ready for your requests. If you would like to set up your own service (on your own hardware) please proceed to the next section called "Runing your own wasmedge-mysql".

---

# Run your own wasmedge-mysql - optional

## System requirements

Ubuntu 20.04 and above

## Update system

```bash
sudo apt-get update
```

## Install MySQL

Install MySQL using package manager

```bash
sudo apt-get install -y mysql-server
```

**Just FYI:** In our case we are using an existing MySQL database installation. From here we will be creating a `second_server_data` directory and starting the existing MySQL software using different port and so forth.

Create new data directory

```bash
sudo mkdir -p /opt/second_server_data/
```

Change permissions and ownership

```bash
sudo chmod --reference /var/lib/mysql /opt/second_server_data/
sudo chown --reference /var/lib/mysql /opt/second_server_data/
```

Edit apparmor configuration

```bash
sudo vi /etc/apparmor.d/usr.sbin.mysqld
```

Add the following block anywhere between the two parenthesis

```bash
# Allow second server
/opt/second_server_data/ r,
/opt/second_server_data/** rwk,
/var/run/mysqld/second_server.pid rw,
/var/run/mysqld/second_server.sock rw,
/var/run/mysqld/second_server.sock.lock rw,
/run/mysqld/second_server.pid rw,
/run/mysqld/second_server.sock rw,
/run/mysqld/second_server.sock.lock rw,
```

Restart apparmor

```bash
sudo service apparmor restart
```

# Initialize new MySQL instance

```bash
sudo mysqld --initialize --user=mysql --datadir=/opt/second_server_data
```

To find the new root password simply `tail` or `vi` the `/var/log/mysql/error.log` file 

```bash
tail /var/log/mysql/error.log
```

You will notice a line such as the one below (which tells you the new password)

```
A temporary password is generated for root@localhost: abcdnewpassword
```

# Secure the MySQL instance

```bash
sudo mysql_secure_installation --basedir=/opt/second_server_data
```

# Start new MySQL instance

```bash
sudo mysqld_safe --no-defaults --datadir=/opt/second_server_data --port=3315 --mysqlx=0 --socket=/var/run/mysqld/second_server.sock &
```

Logging in, can be done via socket or via TCP

```bash
mysql --socket=/var/run/mysqld/second_server.sock -u root -p
```

```bash
mysql -h 127.0.0.1 -P 3315 -u root -p
```

Create new root password

```mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password_here';
FLUSH PRIVILEGES;
```

# Create new database

```mysql
CREATE DATABASE wasmedge_db;
use wasmedge_db;
```

# Create new table

```mysql
CREATE TABLE wasmedge_data (
    wasmedge_id BINARY(16) PRIMARY KEY NOT NULL ,
    wasmedge_blob LONGBLOB NOT NULL
);
```

# Create new local user

```mysql
CREATE USER 'wasmedge_user'@'localhost' IDENTIFIED BY 'your_password_here';
GRANT ALL PRIVILEGES ON wasmedge_db . * TO 'wasmedge_user'@'localhost';
FLUSH PRIVILEGES;
ALTER USER 'wasmedge_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password_here';
FLUSH PRIVILEGES;
```

# Fetch

```bash
git clone https://github.com/second-state/wasmedge-mysql.git
cd wasmedge-mysql
```

# Create config (`.env`) file

Open a new file called `.env`.

```bash
vi `.env`
```

Place the following configuration in that file and save.

```bash
server_name=rpc.ssvm.secondstate.io
host=0.0.0.0
port=8888

db_host=localhost
db_port=3315
db_user=wasmedge_user
db_password=your_password_here
db_name=wasmedge_db
```

Automatically install the npm packages that ship with this build's package.json file.

```bash
npm install
```

# Start

```bash
node index.js
```

# Start using forever

```bash
forever start index.js
```

---

# Design discussion - number 3 currently in play

## 1) Direct remote access - not recommended!

Accessing the database remotely will always require the caller to have a mysql client. Further, it will require that the caller stores the password. Both of these facts make native remote access not practicable in a shared environment. Instead, we are going to implement a simple API which will accept secure HTTP requests and perform MySQL read/write transactions on behalf of the caller.

You could create a new external user like this ...

```mysql
CREATE USER 'wasmedge_remote_user'@'0.0.0.0' IDENTIFIED BY 'your_password_here';
GRANT ALL PRIVILEGES ON wasmedge_db . * TO 'wasmedge_remote_user'@'0.0.0.0';
FLUSH PRIVILEGES;
ALTER USER 'wasmedge_remote_user'@'0.0.0.0' IDENTIFIED WITH mysql_native_password BY 'your_password_here';
FLUSH PRIVILEGES;
```
You could test remote access like this ...

Download the MySQL client from [dev.mysql.com](https://dev.mysql.com/doc/refman/8.0/en/mysql.html).

Run the following command on a remote machine

```bash
mysql -P 3315 -u wasmedge_remote_user -h 27.33.80.26 -p
```
However, the above direct remote access solution means that all users are sharing a common username and password.

## 2) 3rd-party remote access - not ideal

There are many ways to expose MySQL over HTTP using 3rd-party software like [aceql](https://github.com/kawansoft/aceql-http). However these also require that you share/give passwords out to end users.

## 3) In-house key:value store - working on this

One way to store data would be to allow the caller to store anything as a byte array i.e. a blob.

The following convention would need to be followed:
- a user can make a secure HTTP request to store a blob i.e. anything as a byte array
- the user is responsible encoding/decoding their data type to byte array and back again (depending on their application)
- this allows us to store images natively etc (as apposed to only allowing JSON or String)
- the API will always return a valid UUID when data is stored
- the user will load their data using the UUID which the database provided

Here are some examples of the internal SQL operations

Storing a blob
```SQL
INSERT INTO wasmedge_data(wasmedge_id, wasmedge_blob) VALUES(UUID_TO_BIN(UUID()), the_byte_array);
```
Returns
994d926e-2a3e-11ec-a87d-08719041559b

Loading a blob
```SQL
SELECT wasmedge_blob FROM wasmedge_data where BIN_TO_UUID(wasmedge_id) = '994d926e-2a3e-11ec-a87d-08719041559b';
```
---

# Shutdown database

Please use the following command to shutdown this database instance

```bash
sudo mysqladmin -h 127.0.0.1 -P 3315 -u root -p shutdown
```

# References

- https://medium.com/@omkarmanjrekar/running-multiple-mysql-instances-on-ubuntu-4af059aad5ae
