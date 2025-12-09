# Webportaal PagaaierTools

Een webplatform voor het beheren en toegankelijk maken van lokale projecten in een schoolnetwerk.

## Functionaliteiten

- **Project Management**: Voeg projecten toe, bewerk en verwijder ze via een eenvoudige admin interface
- **Reverse Proxy**: Automatische routing naar verschillende projecten op verschillende poorten
- **Authenticatie**: Beveiligde admin interface met username/password
- **Responsive Design**: Werkt op desktop en mobile devices
- **Universeel**: Kan in verschillende scholen en voor verschillende projecten ingezet worden

## Installatie

1. Clone of download deze repository
2. Installeer dependencies:
   ```bash
   npm install
   ```

## Gebruik

### Server starten

```bash
npm start
```

Of voor development met auto-reload:
```bash
npm run dev
```

De server draait standaard op `http://localhost:3000`

### Default Login

- **Username**: brecht
- **Password**: He33e-8620_;

### Projecten toevoegen

1. Ga naar `/admin` en log in
2. Vul het formulier in met:
   - Project naam
   - Beschrijving
   - Directory pad (absoluut pad naar het project)
   - Poort waarop het project draait

3. Klik op "Project Toevoegen"

### Projecten gebruiken

1. Ga naar de homepage (`/`)
2. Klik op "Open Project" bij het gewenste project
3. Het project opent in een nieuw tabblad

## Architectuur

- **Backend**: Node.js met Express
- **Database**: SQLite (via better-sqlite3)
- **Templating**: EJS
- **Authenticatie**: bcrypt voor password hashing
- **Proxy**: http-proxy-middleware voor routing naar projecten

## Standaard Projecten

Bij eerste start worden automatisch 3 projecten toegevoegd:
- Klasspiegels MVP (Next.js) - poort 3001
- Rubrics Observatie Tool (Python) - poort 5001
- Leerlokaal FV (Python) - poort 5002

## Belangrijk

- Zorg ervoor dat de projecten die je toevoegt daadwerkelijk draaien op de opgegeven poorten
- De projecten moeten apart gestart worden voordat ze via het portaal toegankelijk zijn
- Het portaal zelf fungeert als een reverse proxy en dashboard

## Security Note

Voor productiegebruik:
- Wijzig het default wachtwoord direct na installatie
- Overweeg om de session secret in een .env file te plaatsen
- Gebruik HTTPS in productie

## Licentie

ISC
