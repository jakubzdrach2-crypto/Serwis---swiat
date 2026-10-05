# Serwis Świat 3.0

Mobilna aplikacja PWA agregująca wiadomości z monitorowanych źródeł polskich i zagranicznych.

## Co nowego w 3.0
- wyszukiwarka;
- zapisane wiadomości;
- tryb jasny/ciemny;
- odświeżanie ręczne i automatyczne;
- priorytetyzacja informacji;
- oznaczanie pilnych wydarzeń;
- grupowanie podobnych doniesień i licznik źródeł;
- „Co to oznacza?” z jasnym opisem ograniczeń;
- bardziej rozbudowane kategorie;
- PWA + service worker;
- API zdrowia `/api/health`.

## Uruchomienie
Wymaga Node.js 20+:
1. `npm install`
2. `npm start`
3. otwórz `http://localhost:3000`

## Instalacja na Androidzie
Aplikacja musi być dostępna pod publicznym adresem HTTPS. W Chrome otwórz adres aplikacji i wybierz „Zainstaluj aplikację” / „Dodaj do ekranu głównego”.

## Ważne
Źródła RSS i ich adresy mogą się zmieniać. Reuters/AP/BBC w tej wersji są monitorowane przez wyszukiwanie kanałów Google News. Aplikacja nie jest serwisem fact-checkingowym.

Powiadomienia w 3.0 są realizowane przez mechanizm przeglądarkowy/polling. Prawdziwe push notifications działające niezawodnie po całkowitym zamknięciu aplikacji wymagają dodatkowego Web Push/VAPID backendu.
