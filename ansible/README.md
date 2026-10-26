
# Ingress controller + ACME example with docker-compose

This repo demonstrates the following:

* Configure a user and SSH access to a VM
* Deploy an app with docker-compose,
* Serve HTTPS traffic using Let's Encrypt ACME

## Prerequisites

* A running VM with a public IP
* A domain name pointing to this VM (one can be created for free on https://duckdns.org)
* Ansible installed locally

## How to use

* Configure the inventory.yml file with your own domain name
* Set up your own SSH keys in main.yml

Run with the following command:

```
ansible-playbook -b -i inventory.yml ./main.yml
```

Once dependencies are installed, you can deploy the app only using a tag:

```
ansible-playbook -b -i inventory.yml ./main.yml -t app
```