# Custom DNS Domein (.school) Setup

## Wat is geconfigureerd?

Er is een lokale DNS-server (dnsmasq) opgezet die het custom domein `.school` afhandelt. Dit betekent dat je de webportaal kunt bereiken via **`http://pagaaier.school`** vanaf elk apparaat in het lokale netwerk.

## Hoe werkt het?

1. **Dnsmasq DNS server** draait op deze machine (poort 53)
2. Alle queries voor `.school` domeinen worden lokaal afgehandeld
3. `pagaaier.school` wijst naar IP: `10.46.53.180`
4. Andere DNS queries gaan naar Google DNS (8.8.8.8)

## Client configuratie

Om `pagaaier.school` te gebruiken vanaf andere apparaten, moet je hun DNS instellen:

### Windows
1. Ga naar Netwerkinstellingen → Adapter instellingen
2. Rechterclick op je netwerkverbinding → Properties
3. Selecteer "Internet Protocol Version 4 (TCP/IPv4)" → Properties
4. Selecteer "Use the following DNS server addresses"
5. Voorkeurs-DNS-server: `10.46.53.180`
6. Alternatieve DNS-server: `8.8.8.8`

### macOS
1. Systeemvoorkeuren → Netwerk
2. Selecteer je verbinding → Geavanceerd
3. DNS tab → Voeg toe: `10.46.53.180`

### Linux
```bash
# Tijdelijk (tot reboot)
sudo resolvectl dns enp2s0 10.46.53.180 8.8.8.8

# Of bewerk /etc/resolv.conf
nameserver 10.46.53.180
nameserver 8.8.8.8
```

### Android/iOS
1. WiFi instellingen → Huidige netwerk
2. DNS configuratie aanpassen → Handmatig
3. DNS 1: `10.46.53.180`
4. DNS 2: `8.8.8.8`

## Extra domeinen toevoegen

Om meer `.school` domeinen toe te voegen, bewerk `/etc/dnsmasq.d/pagaaier.conf`:

```bash
sudo nano /etc/dnsmasq.d/pagaaier.conf
```

Voeg toe:
```
address=/anderproject.school/10.46.53.180
```

Herstart dnsmasq:
```bash
sudo systemctl restart dnsmasq
```

## Testen

Vanaf een client die DNS gebruikt:
```bash
# Windows
nslookup pagaaier.school 10.46.53.180

# Linux/macOS
dig @10.46.53.180 pagaaier.school
```

## Server configuratie

- **Configuratiebestand**: `/etc/dnsmasq.d/pagaaier.conf`
- **Hoofdconfiguratie**: `/etc/dnsmasq.conf`
- **Logs**: `sudo journalctl -u dnsmasq -f`
- **Service**: `sudo systemctl status dnsmasq`

## Firewall

De volgende poorten zijn open:
- **80/tcp** - HTTP (Nginx)
- **53/tcp** - DNS
- **53/udp** - DNS
- **5353/udp** - mDNS (voor .local)

## Voordelen van .school

- ✅ Geen poortnummer nodig
- ✅ Herkenbaar en betekenisvol domein
- ✅ Werkt voor alle apparaten die de DNS gebruiken
- ✅ Kan meerdere subdomeinen hosten

## Nadelen

- ⚠️ Clients moeten handmatig DNS instellen
- ⚠️ Werkt niet buiten het lokale netwerk
- ⚠️ Bij DNS problemen kunnen andere websites onbereikbaar zijn

## Alternatief: .local blijven gebruiken

Als je geen DNS wilt configureren op clients, kun je gewoon `.local` blijven gebruiken via mDNS:
- `http://linuxpagaaier.local` werkt automatisch
- Geen client configuratie nodig
- Beperkt tot mDNS-compatibele apparaten
