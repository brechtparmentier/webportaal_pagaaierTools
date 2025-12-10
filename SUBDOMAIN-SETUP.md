# Subdomain Setup voor Individuele Projecten

Deze guide legt uit hoe je individuele projecten toegankelijk maakt via hun eigen subdomein (bijv. `klasspiegels.pagaaier.local`, `observatie.pagaaier.local`).

## Architectuur

```
Client Request: klasspiegels.pagaaier.local
    ↓
dnsmasq (DNS) → Resolveert alle *.pagaaier.local naar 10.46.53.180
    ↓
nginx (port 80) → Leest Host header en routeert naar juiste port
    ↓
Project (specifieke port: 3001, 5000, etc.)
```

## Vereisten

- dnsmasq (voor DNS)
- nginx (voor reverse proxy)
- Projecten draaien op unieke poorten

## Stap 1: Update dnsmasq Configuratie

**1. Backup huidige configuratie:**
```bash
sudo cp /etc/dnsmasq.d/pagaaier.conf /etc/dnsmasq.d/pagaaier.conf.backup
```

**2. Kopieer nieuwe configuratie:**
```bash
sudo cp config/dnsmasq-pagaaier.conf /etc/dnsmasq.d/pagaaier.conf
```

**3. Test configuratie:**
```bash
sudo dnsmasq --test
```

**4. Herstart dnsmasq:**
```bash
sudo systemctl restart dnsmasq
sudo systemctl status dnsmasq
```

**5. Test DNS resolutie:**
```bash
# Test vanaf de server zelf
dig @localhost portaal.pagaaier.local
dig @localhost klasspiegels.pagaaier.local
dig @localhost observatie.pagaaier.local

# Verwacht resultaat: Alle moeten resolven naar 10.46.53.180
```

## Stap 2: Update nginx Configuratie

**1. Backup huidige configuratie:**
```bash
sudo cp /etc/nginx/sites-available/pagaaiertools /etc/nginx/sites-available/pagaaiertools.backup
```

**2. Kopieer nieuwe configuratie:**
```bash
sudo cp config/nginx-pagaaier-subdomains.conf /etc/nginx/sites-available/pagaaiertools
```

**3. BELANGRIJK: Pas de poorten aan in het configuratiebestand**

Bewerk `/etc/nginx/sites-available/pagaaiertools` en wijzig de `proxy_pass` poorten naar de juiste waarden:

```bash
sudo nano /etc/nginx/sites-available/pagaaiertools
```

Voor elk project, wijzig de poort in de `proxy_pass` regel:
- **portaal.pagaaier.local**: Poort van webportaal_pagaaierTools (waarschijnlijk 3000)
- **klasspiegels.pagaaier.local**: Poort van nextjs_klasspiegelsMVP (controleer in database of package.json)
- **observatie.pagaaier.local**: Poort van python_rubricsObservatieTool (controleer in database, waarschijnlijk 5000)

**4. Test nginx configuratie:**
```bash
sudo nginx -t
```

**5. Herlaad nginx:**
```bash
sudo systemctl reload nginx
sudo systemctl status nginx
```

## Stap 3: Controleer Projecten Draaien

Zorg dat elk project draait op de juiste poort:

```bash
# Controleer welke poorten in gebruik zijn
sudo lsof -i -P -n | grep LISTEN

# Of specifieker:
sudo netstat -tulpn | grep LISTEN
```

Je zou moeten zien:
- Port 3000: webportaal_pagaaierTools
- Port 3001 (of andere): nextjs_klasspiegelsMVP
- Port 5000 (of andere): python_rubricsObservatieTool

## Stap 4: Test vanaf Client Apparaten

**1. Configureer client DNS:**
- Zet DNS server op client naar `10.46.53.180`
- Laat andere netwerkinstellingen ongewijzigd

**2. Test DNS resolutie vanaf client:**
```bash
# Op Linux/Mac:
nslookup portaal.pagaaier.local
nslookup klasspiegels.pagaaier.local
nslookup observatie.pagaaier.local

# Op Windows:
nslookup portaal.pagaaier.local
```

**3. Test toegang in browser:**
- `http://portaal.pagaaier.local` → Moet webportaal tonen
- `http://klasspiegels.pagaaier.local` → Moet klasspiegels project tonen
- `http://observatie.pagaaier.local` → Moet observatie tool tonen

## Nieuwe Projecten Toevoegen

Voor elk nieuw project dat je wilt toevoegen met een eigen subdomain:

**1. Voeg server block toe aan nginx:**
```bash
sudo nano /etc/nginx/sites-available/pagaaiertools
```

Voeg toe:
```nginx
# Nieuw Project - nieuwproject.pagaaier.local
server {
    listen 80;
    listen [::]:80;

    server_name nieuwproject.pagaaier.local;

    access_log /var/log/nginx/nieuwproject_access.log;
    error_log /var/log/nginx/nieuwproject_error.log;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:POORT_VAN_PROJECT;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**2. Test en herlaad nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**3. DNS werkt automatisch:**
- De wildcard `*.pagaaier.local` in dnsmasq zorgt ervoor dat alle subdomeinen automatisch resolven
- Geen wijzigingen aan dnsmasq nodig voor nieuwe projecten

## Troubleshooting

### DNS Werkt Niet
```bash
# Check of dnsmasq draait
sudo systemctl status dnsmasq

# Check logs
sudo journalctl -u dnsmasq -n 50

# Test DNS vanaf server
dig @localhost klasspiegels.pagaaier.local

# Check firewall (DNS gebruikt port 53)
sudo ufw status
```

### nginx Foutmeldingen
```bash
# Check nginx status
sudo systemctl status nginx

# Check logs
sudo tail -f /var/log/nginx/error.log

# Test configuratie
sudo nginx -t
```

### Project Niet Bereikbaar
```bash
# Check of project draait op verwachte poort
sudo lsof -i :3001  # Vervang 3001 met de poort van je project

# Test direct toegang vanaf server
curl http://localhost:3001

# Check nginx logs voor specifiek subdomain
sudo tail -f /var/log/nginx/klasspiegels_error.log
```

### 502 Bad Gateway
Dit betekent dat nginx draait maar het project niet bereikbaar is:
- Check of project daadwerkelijk draait
- Controleer of poort in nginx config overeenkomt met project poort
- Check firewall regels

## Voordelen van Deze Setup

1. **Duidelijke URLs**: Elk project heeft eigen herkenbaar adres
2. **Geen poortnummers**: Gebruikers hoeven geen `:3000` toe te voegen
3. **Schaalbaar**: Nieuwe projecten toevoegen = alleen nginx config
4. **Professional**: Lijkt op productie setup (subdomeinen)
5. **DNS automatisch**: Wildcard vangt alle subdomeinen

## Compatibiliteit

- **mDNS blijft werken**: `pagaaier.local` blijft functioneren via avahi
- **IP-adres blijft werken**: `http://10.46.53.180` blijft functioneren
- **Oude URLs blijven werken**: Het portaal op `http://pagaaier.local` blijft werken

## Security Notities

- Deze setup is bedoeld voor **lokaal netwerk gebruik**
- Geen HTTPS/SSL (niet nodig in schoolnetwerk)
- dnsmasq alleen gebonden aan lokaal interface (`bind-interfaces`)
- Geen authentication op nginx niveau (applicaties zelf regelen dit)
