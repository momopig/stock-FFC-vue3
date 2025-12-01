sed -i "/# fetch-github-hosts begin/Q" /etc/hosts && curl https://hosts.gitcdn.top/hosts.txt >> /etc/hosts
