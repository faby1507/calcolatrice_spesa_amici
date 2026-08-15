# Calcolatrice Spesa Amici

Un'applicazione moderna (Web & Mobile) pensata per dividere i conti delle serate tra amici (pizze, panini, bevande, coperto) in tempo reale. 

Ciascun partecipante può accedere alla stanza dal proprio smartphone, inserire le proprie ordinazioni e specificare eventuali piatti/bevande condivisi al centro: l'app calcola automaticamente e all'istante la quota esatta che ciascuno deve pagare.

---

## ✨ Funzionalità Principali

* **Stanze in Tempo Reale (Supabase Realtime):** Creazione stanze con codice condivisibile; ogni aggiunta o modifica si aggiorna all'istante sugli schermi di tutti i commensali.
* **Divisione Equa e Precisa:** Calcolo distinto tra consumazioni personali e spese condivise (es. patatine fritte, bottiglie di vino).
* **Gestione Automatica del Coperto:** Ripartizione del coperto per singolo partecipante.
* **Accesso Rapido e Diretto:** Nessuna registrazione richiesta per gli amici al tavolo, basta inserire il proprio nome.
* **Architettura Monorepo:** Codice Web (React + Vite) e Mobile (React Native + Expo) organizzati nella stessa repository.

---

## 🏗️ Architettura del Progetto

```text
calcolatrice_spesa_amici/
├── web/                  # Web App (React + Vite + Tailwind CSS + Supabase)
├── mobile/               # Mobile App (React Native + Expo + iOS Xcode)
└── README.md
