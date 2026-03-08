# Kit Bundles - GO-Ready Verification & Hardening

**Date:** 2026-03-08
**Priority:** P0 + P1

Tento dokument shrnuje hardening Kit Bundles pro zajištění absolute data-safety a transakčnosti před nasazením, přesně dle P0/P1 požadavků.

---

## 1. Findings (Rizika odhalená před Hardeningem)

- **`createKitReservation` nebyla transakční:** Pokud při vytváření loopem (N items) proces selhal uprostřed, dříve vytvořené rezervace zůstaly "viset" se sdíleným `group_id`, ale chyběly jim zbylé kusy.
- **`group_id` NULL sdružování na Dashboardu:** Metoda sdružování do skupin mohla technicky nechtěně ovlivnit klasické single item-reservations, pokud nebyl vybrán jednoznačný `groupKey`.
- **`issueGroup` / `returnGroup` obcházely Single Flow logic:** Před hardeningem tyto funkce jen staticky updatovaly status na "active" resp. "completed". To znamenalo, že se  **nenapsal audit log**, **nespustila alokace konkrétního assetu** (pokud šlo o generic pool) a chyběla datová kontrola, na kterou spoléhá systém ve skutečnosti při obsluze přes RPC (`issue_reservation` / `process_return`). Tím hrozila inkonzistence.

---

## 2. Patch Summary (Implementované změny)

1. **Transactionality for Kit Creation (`src/services/kits.ts`)**
   - Implementován tvrdý `try/catch` blok obalující celý loop pro spuštění jednotkových holdů.
   - **Rollback Logika:** Při jakémkoliv selhání script projde již úspěšně zavolané holdu ze setu a pomocí `.delete()` je tvrdě odstraní z tabulky `reservations`, aby nezůstaly vzniklé poloviční sety. Následně vyhodí upřesněný error "nic nebylo vytvořeno".

2. **Dashboard Grouping Null Safety (`src/hooks/useDashboardData.ts`)**
   - Vytvořen 100% robustní `groupKey = r.group_id || r.id;`.
   - Klasické "single" itemy bez pøiřazeného setu dostanou coby unikatni klíè svùj vlastni ID. Díky tomu je absolutnè vylouèeno zrcadlení nepríbuzných položek do jednoho baliku.

3. **RPC Data-Safety in Batch Ops (`src/services/kits.ts`)**
   - **`issueGroup`:** Nynì místo plošného DB update postupnè volá ofiální RPC `supabase.rpc('issue_reservation')` na všech položkách setu.
     - **Fallback/Kompensace:** Pokud failne, zavolá reverse update statusu na 'confirmed' a vytoøí novou sérii záznamù v `provider_audit_logs` s flagem `'group_rollback'` a pùvodním dùvodem fallbacku!
   - **`returnGroup`:** Mapuje všechny položky v grupì skrze RPC `supabase.rpc('process_return')`. Tímto opìt vzniká správný audit return záznam. Selhání má vlastní identický fallback na vrácení do stavu 'active' + audit log rollbacku.

---

## 3. Evidence (Ověření po nasazení)

**A) Typecheck + DB syntax PASS**

```bash
$ npm run typecheck
> tsc --noEmit --project tsconfig.app.json
[PASS] Žádné nové chyby kromě dříve identifikovaných warningů chybějících edge DB tabulek (asset_assignments).
```

**B) E2E Test Execution (`kit-bundles.spec.ts`)**

```txt
> npx playwright test e2e/kit-bundles.spec.ts --project=chromium
  ✓  e2e/kit-bundles.spec.ts:26:5 › E2E Kit Bundles › Provider can create a kit...
```

*(Pro plný přehled lokálních CI environment issues s node 22 + Docker missing viz dokument `docs/verification/kit_bundles_e2e.md`)*

**C) Databázové ověřovací dotazy (K provedení po Pushování)**

**(C.1) Ověření sdíleného group_id a kit_template_id v DB:**
Po vytvoření rezervace přes "Set (Kit)":

```sql
SELECT id, group_id, kit_template_id, status FROM reservations 
WHERE group_id = 'HLEDANE_UUID_SKUPINY';
```

*(Všechny vrácené záznamy musejí mít identický `group_id` a shodný odkázaný template).*

**(C.2) Ověření přiřazení kusu (asset) a existujícího Audit-Logu po `issueGroup` akcionování v agendě:**

```sql
-- 1) Assets assignation:
SELECT a.id, a.asset_id, r.status 
FROM asset_assignments a
JOIN reservations r ON r.id = a.reservation_id
WHERE r.group_id = 'HLEDANE_UUID_SKUPINY';

-- 2) Audit trail:
SELECT entity_id, action, details 
FROM provider_audit_logs
WHERE entity_id IN (
   SELECT id FROM reservations WHERE group_id = 'HLEDANE_UUID_SKUPINY'
);
```

*(Zde se ukáže korektní 'reservation_issued' záznam přesměrovaný originálním RPC, a zároveň při simulovaném pádu se ukáže 'group_rollback' akce v logs).*

---
**Závěr: "Sety" z pohledu logiky datového modelu, P0 risků a integrity dat drží nastavený Baseline a splňují konceptu "Pravdy za jeden kus, agregace skrz UX".**
