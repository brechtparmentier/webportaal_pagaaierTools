# mDNS Setup voor Lokale Toegang

## Wat is mDNS?

mDNS (Multicast DNS) maakt het mogelijk om apparaten in je lokale netwerk te bereiken via een `.local` domeinnaam zonder DNS-server te configureren.

## Installatie op Linux

### 1. Installeer Avahi

```bash
sudo apt-get update
sudo apt-get install avahi-daemon avahi-utils
```

### 2. Start de service

```bash
sudo systemctl enable avahi-daemon
sudo systemctl start avahi-daemon
```

### 3. Controleer de status

```bash
sudo systemctl status avahi-daemon
```

## Toegang tot de webportaal

Na installatie is de webportaal bereikbaar via:

- **Vanaf dezelfde machine**: `http://localhost:3000`
- **Vanaf andere apparaten in het netwerk**: `http://$(hostname).local:3000`
  
Om je hostname te bekijken:
```bash
hostname
```

Bijvoorbeeld: als je hostname `linuxpagaaier` is, dan is de URL:
- `http://linuxpagaaier.local:3000`
- `http://linuxpagaaier.local:3000/admin` (voor admin panel)

## Compatibiliteit

- **Linux**: Werkt automatisch met Avahi
- **macOS**: Ingebouwde ondersteuning (Bonjour)
- **Windows**: Installeer Bonjour Print Services of gebruik het IP-adres
- **Android/iOS**: Ingebouwde ondersteuning

## Alternatief: Gebruik IP-adres

Als mDNS niet werkt, gebruik het lokale IP-adres:

```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

De server toont automatisch het lokale IP-adres bij opstarten.

## Firewall configuratie (indien nodig)

Als je een firewall actief hebt:

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 5353/udp  # mDNS verkeer
```

## Troubleshooting

### mDNS werkt niet

1. Controleer of avahi-daemon draait:
   ```bash
   sudo systemctl status avahi-daemon
   ```

2. Controleer je hostname:
   ```bash
   hostname
   avahi-browse -a
   ```

3. Test met ping:
   ```bash
   ping $(hostname).local
   ```

### Geen verbinding mogelijk

1. Controleer firewall instellingen
2. Zorg dat alle apparaten op hetzelfde netwerk zitten
3. Gebruik het IP-adres als fallback (wordt getoond bij server start)
