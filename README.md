To run in windows:

- Disable both public and private windows firewalls
- run_udp_server.bat contains batch file to add desktop shortcut
- Webpage is running on local host, to map to hostname on Windows: 
    - C:Windows\System32\drivers\etc\hosts needs to be edited as admin to add static ip to hostname
    - run command  `ipconfig /flushdns` in Command Prompt as admin
