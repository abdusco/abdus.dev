taskkill /im php-cgi.exe /f
taskkill /im caddy.exe /f
start /b caddy run --config .caddyfile --adapter caddyfile --watch
start /b php-cgi -b 127.0.0.1:9090
