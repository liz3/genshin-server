# Genshin server
this is a small tool which proxies genshins http apis through a custom controlled server.
Its basically a mitm with a custom cert whcih needs to be installed in windows root ca store.

for hosts to redirect check `cert/san.cnf`

```
openssl req -x509 -newkey rsa:4096 -sha256 -keyout openssl.key -out openssl.crt -days 365 -config san.cnf
```
```
openssl pkcs12 -export -name "mihyoho.com" -out openssl.pfx -inkey openssl.key -in openssl.crt
```
