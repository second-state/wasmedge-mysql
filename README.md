# MySQL

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
mkdir -p /opt/second_server_data/
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

Initialize new instance

```bash
sudo mysqld --initialize --user=mysql --datadir=/opt/second_server_data/
```

To find the new root password simply `tail or `vi` the `/var/log/mysql/error.log` file and look for the following line

```
A temporary password is generated for root@localhost: abcdnewpassword
```

We can now start MySQL

```bash
sudo mysqld_safe --no-defaults --datadir=/opt/second_server_data/ --port=3315 --mysqlx=0 --socket=/var/run/mysqld/second_server.sock &
```

Logging in can be done via socket or via TCP

```bash
mysql --socket=/var/run/mysqld/second_server.sock -u root -p
```

```bash
mysql -h 127.0.0.1 -P 3315 -u root -p
```

Create new password

```mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password_here';
FLUSH PRIVILEGES;
```

# Shutdown database

Please use the following command to shutdown this database instance

```bash
sudo mysqladmin -h 127.0.0.1 -P 3315 -u root -p shutdown
```
