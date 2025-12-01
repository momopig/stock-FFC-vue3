@echo off

rem Update the hosts file with the latest GitHub IP addresses
sudo notepad C:\Windows\System32\drivers\etc\hosts
curl https://hosts.gitcdn.top/hosts.txt >> C:\Windows\System32\drivers\etc\hosts
echo GitHub hosts file updated successfully!
pause
