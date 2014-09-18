#!/bin/sh
echo "==================================================================="
echo "Updating apt..."
echo "==================================================================="
echo "deb http://security.debian.org/ wheezy/updates main contrib non-free" >> /etc/apt/sources.list
apt-get update
apt-get upgrade
apt-get install iptables -q -y

echo "==================================================================="
echo "Installing Git..."
echo "==================================================================="
apt-get install git -q -y

echo "==================================================================="
echo "Installing Node.js..."
echo "==================================================================="
apt-get install git-core curl build-essential openssl libssl-dev python -q -y
mkdir /downloads
cd /downloads
git clone https://github.com/joyent/node.git
cd /downloads/node
#Checkout the version we know works with our software
git checkout v0.10.31
./configure
make
make install

echo "==================================================================="
echo "Getting ForerunnerDB..."
echo "==================================================================="
mkdir -p /var/forerunnerdb
git clone git://github.com/coolbloke1324/ForerunnerDB.git /var/forerunnerdb

echo "==================================================================="
echo "Installing Node Modules..."
echo "==================================================================="
npm install -g forever
cd /var/forerunnerdb
npm install

echo "==================================================================="
echo "Setting up firewall rules..."
echo "==================================================================="
iptables-restore < /var/forerunnerdb/server/configFiles/iptables/rules.v4
apt-get install iptables-persistent -q -y