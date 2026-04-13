# Kitloop Pilot Playbook

## 1. Před Switch-Over (Příprava)

**Datum:** [D-Day minus 1]
**Odpovídá:** Provider Admin

### Export & Data Check

1. **Source Data**: Připravit CSV z původního systému (Excel/Legacy).
2. **Format Check**: Ověřit sloupce: `Name`, `Category`, `Price`, `Quantity`, `Asset Tags` (pokud existují).
3. **Environment**: Ujistit se, že jsme na produkční URL.
4. **Login**: Přihlásit se jako Admin Providera.

### Import Inventáře

1. Jdi na `Inventory` -> `Import`.
2. Nahraj CSV.
3. Zkontroluj náhled (Preview).
4. Klikni **Import**.
5. **Validace**:
   - Po importu zkontroluj počty v `Inventory` tabulce.
   - Namátkově zkontroluj 3-5 položek (Cena, Kategorie).

## 2. Den Switch-Over (D-Day)

**Datum:** [D-Day]
**Kdo:** Pult Staff

### Ráno (Start)

1. Přihlásit se do Pultu (Tablet/Laptop).
2. Otevřít záložku `Reservations`.
3. Zkontrolovat, že seznam je prázdný (nebo obsahuje pouze migrované testy).

### První Rezervace (Walk-in / Telefon)

1. **Vytvoření**: Nová rezervace -> Vybrat Gear -> Vybrat Termín -> Vybrat/Vytvořit Zákazníka -> Potvrdit.
2. **Platba**: Pokud platí na místě, označit `Override` (nebo `Mark Paid` pokud bude implementováno).
3. **Výdej (Issue)**:
   - Detail rezervace -> `Vydat Zákazníkovi`.
   - Pokud "Payment Required", použít `Override` s důvodem "Cash Starter".
   - Potvrdit.
   - Ověřit: Status `Active`, Assets `Customer`.

### Vrácení (Return)

1. Zákazník vrací vybavení.
2. Detail rezervace -> `Přijmout Vrácení`.
3. Zkontrolovat stav.
   - **OK**: Nezaškrtávat nic. Potvrdit. -> Asset `Available`.
   - **Poškozeno**: Zaškrtnout `Poškozeno`. Nahrát fotku (pokud tablet umožňuje). Napsat poznámku. -> Asset `Maintenance`.

## 3. Incident Management

Co dělat, když to nefunguje:

### Chyba `PAYMENT_REQUIRED`

- **Příčina**: Rezervace není zaplacena online.
- **Akce**: Použijte žluté pole v modálu Vydat a zadejte důvod "Platba na místě" (Override).

### Chyba `NO_ASSETS` / `CONFLICT`

- **Příčina**: Systém si myslí, že nemáte skladem kusy.
- **Akce**: Jdi do `Inventory`, najdi variantu, zkontroluj počet `Available`. Pokud fyzicky kus máte, zkontrolujte, zda není "visící" v jiné `Active` rezervaci (nevráceé).

### Chyba `UNAUTHORIZED`

- **Příčina**: Odhlášení nebo špatná role.
- **Akce**: Reload stránky, znovu se přihlásit.

### Kde hlásit chyby

- Udělat screenshot.
- Popsat krok.
- Poslat na Slack/Email podpory: `support@kitloop.cz`.
- **Formalizovaně**: Zapsat do [`docs/pilot_feedback_log.md`](./pilot_feedback_log.md) dle šablony.

## 4. Go/No-Go Kritéria (D-Day Check)

- [ ] Import proběhl bez chyb.
- [ ] Lze vytvořit testovací rezervaci.
- [ ] Lze vydat a vrátit.
- [ ] Staff má přístup (Login funguje).

## 5. Notifikace (Pilot)

**Pilot kanály: pouze in-app.** Email notifikace jsou ve výchozím stavu vypnuté
(`email_enabled = false`). Zvonečkový indikátor 🔔 v navigační liště ukazuje
nepřečtené notifikace. Kliknutím se označí jako přečtené.

> Pokud potřebujete zapnout email notifikace, nastavte v Supabase:
> `UPDATE notification_preferences SET email_enabled = true WHERE user_id = '…';`
> a ujistěte se, že `RESEND_API_KEY` secret je nastavený.

## 6. Pain Reporting (Pilot)

Po každé směně zapište problémy do [`docs/pilot_feedback_log.md`](./pilot_feedback_log.md).

### Šablona pro hlášení

| Pole | Vyplňte |
|------|---------|
| Datum | YYYY-MM-DD HH:MM |
| Reporter (email) | vaš email |
| Provider ID | UUID poskytovatele (Settings → About) |
| Shrnutí | Jednořádkový popis problému |
| Kroky k reprodukci | 1. … 2. … 3. … |
| Očekávané chování | Co mělo nastat |
| Skutečné chování | Co se stalo |
| Dopad | Nízký / Střední / Vysoký |
| Screenshot | Odkaz nebo přiložte soubor |

### Proces

1. Zápis po směně do `pilot_feedback_log.md` nebo poslání na `support@kitloop.cz`.
2. Týdenní review: Kitloop tým třídí a plánuje opravy.
3. Kritické problémy (blokují provoz): ihned na `support@kitloop.cz` + screenshot.
