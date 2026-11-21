import { InventoryItem, Mission, MissionStep, WarehouseLocation } from '../types';

// =========================================================================
// HELPERS: CSV PARSING & FRENCH EXCEL GENERATION (UTF-8 BOM + ';')
// =========================================================================

const stripAccents = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const makeSafeLrCode = (raw: string, fallbackPrefix = 'REF'): string => {
  const clean = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  if (!clean) return `${fallbackPrefix}_${Math.floor(1000 + Math.random() * 9000)}`;
  return clean.slice(0, 18);
};

const escapeCsvCell = (val: string | number | undefined | null): string => {
  const str = val === undefined || val === null ? '' : String(val);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const triggerCsvDownload = (filename: string, rows: (string | number | undefined | null)[][]) => {
  const csvBody = rows.map((r) => r.map(escapeCsvCell).join(';')).join('\r\n');
  // UTF-8 BOM (\uFEFF) ensures French Excel opens accents & semicolons cleanly on double-click
  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Auto-detects separator (\t from Excel copy-paste, ';' from French Excel CSV, or ',')
 * and parses lines respecting double-quoted fields.
 */
function parseDelimitedRows(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  const firstLine = text.split(/\r?\n/)[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;

  let delimiter = ';';
  if (tabCount >= semiCount && tabCount >= commaCount && tabCount > 0) {
    delimiter = '\t';
  } else if (semiCount >= commaCount && semiCount > 0) {
    delimiter = ';';
  } else if (commaCount > 0) {
    delimiter = ',';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== '')) rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== '')) rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== '')) rows.push(currentRow);
  }

  return rows;
}

// =========================================================================
// 1. STOCK + EMPLACEMENTS TEMPLATE DOWNLOAD & EXPORT
// =========================================================================

export const STOCK_TEMPLATE_HEADERS = [
  'SKU',
  'Designation',
  'Emplacement',
  'Quantite',
  'Code_Court_LR',
  'Categorie',
  'Unite',
  'Gestionnaire',
  'Machine_PDT',
  'Ref_Equipementier',
  'Alias_Codes_Barres'
];

export function downloadStockTemplateCsv() {
  const sampleRows = [
    STOCK_TEMPLATE_HEADERS,
    [
      'REF191000004264',
      'WIRE ASSY PBN-NF RF 350',
      'BAT 41 - MB - D04 / D',
      2,
      'WIRE_RF350',
      'Pièces Techniques',
      'pcs',
      'GT LOGISTICS',
      'RF-350',
      'EQ-4264',
      ''
    ],
    [
      'REF191000004224',
      'CAPILLARY CARTRIDGE HI SENS',
      'BAT 41 - MB - D07 / D',
      3,
      'CAP_HISENS',
      'Consommables Salle Blanche',
      'pcs',
      'GT LOGISTICS',
      'HI-SENS',
      'EQ-4224',
      ''
    ],
    [
      'REF241200000102',
      'Silencieux pour pompe à membrane',
      'BAT 41 - MB - E02 / G',
      4,
      'SIL_POMPE',
      'Pompage & Vide',
      'pcs',
      'GT LOGISTICS',
      'PMP-02',
      'EQ-0102',
      ''
    ],
    [
      'REF191000002115',
      'NUT JAM 3/8 24 UNF S/S',
      'BAT 41 - MB - E09 / D',
      10,
      'NUT_JAM38',
      'Visserie Inox',
      'pcs',
      'GT LOGISTICS',
      'STD',
      'EQ-2115',
      ''
    ]
  ];
  triggerCsvDownload('MODELE_STOCK_GT_25ANS.csv', sampleRows);
}

export function exportCurrentStockCsv(inventory: InventoryItem[]) {
  const rows: (string | number | undefined)[][] = [
    STOCK_TEMPLATE_HEADERS,
    ...inventory.map((it) => [
      it.sku,
      it.name,
      it.location,
      it.quantity,
      it.lrCode || '',
      it.category || 'Pièces Techniques',
      it.unit || 'pcs',
      it.gestionnaire || '',
      it.machinePdt || '',
      it.refEquipementier || '',
      Array.isArray(it.aliases) ? it.aliases.join('|') : ''
    ])
  ];
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(`EXPORT_STOCK_GT_25ANS_${dateTag}.csv`, rows);
}

// =========================================================================
// 2. SMART STOCK PARSER (AUTO-CREATES LOCATIONS + VALIDATES EVERYTHING)
// =========================================================================

export interface ParsedStockImportResult {
  items: InventoryItem[];
  newLocations: WarehouseLocation[];
  allLocationCodes: string[];
  warnings: string[];
  detectedColumns: string[];
}

export function parseSmartStockText(
  rawText: string,
  existingLocations: WarehouseLocation[]
): ParsedStockImportResult {
  const rows = parseDelimitedRows(rawText);
  if (rows.length < 2) {
    return {
      items: [],
      newLocations: [],
      allLocationCodes: [],
      warnings: ['Aucune donnée exploitable détectée (il faut au moins une ligne d\'en-tête et une ligne d\'article).'],
      detectedColumns: []
    };
  }

  const rawHeaders = rows[0];
  const normHeaders = rawHeaders.map(stripAccents);

  const findCol = (candidates: string[]): number => {
    for (const cand of candidates) {
      const exactIdx = normHeaders.findIndex((h) => h === cand);
      if (exactIdx !== -1) return exactIdx;
    }
    for (const cand of candidates) {
      const partialIdx = normHeaders.findIndex((h) => h.includes(cand));
      if (partialIdx !== -1) return partialIdx;
    }
    return -1;
  };

  const colSku = findCol(['sku', 'code_barre', 'codebarre', 'barcode', 'ref', 'reference', 'code_article', 'article']);
  const colName = findCol(['designation', 'nom', 'name', 'libelle', 'description', 'intitule', 'produit']);
  const colLoc = findCol(['emplacement', 'location', 'bac', 'allee', 'etagere', 'position', 'zone_stock']);
  const colQty = findCol(['quantite', 'qte', 'qty', 'stock', 'nombre', 'nb']);
  const colLr = findCol(['code_court_lr', 'code_court', 'lrcode', 'lr', 'code_lr']);
  const colCat = findCol(['categorie', 'category', 'famille', 'type']);
  const colUnit = findCol(['unite', 'unit', 'uom']);
  const colGest = findCol(['gestionnaire', 'manager', 'owner']);
  const colMachine = findCol(['machine_pdt', 'machine', 'pdt', 'equipement']);
  const colRefEq = findCol(['ref_equipementier', 'equipementier', 'fabricant', 'ref_fab']);
  const colAlias = findCol(['alias_codes_barres', 'alias', 'aliases', 'codes_alternatifs']);

  const warnings: string[] = [];
  if (colSku === -1) {
    warnings.push('Colonne SKU / Référence introuvable — la 1re colonne sera utilisée par défaut.');
  }
  if (colName === -1) {
    warnings.push('Colonne Désignation introuvable — la 2e colonne sera utilisée par défaut.');
  }
  if (colLoc === -1) {
    warnings.push('Colonne Emplacement introuvable — la 3e colonne sera utilisée par défaut.');
  }

  const effectiveSkuIdx = colSku !== -1 ? colSku : 0;
  const effectiveNameIdx = colName !== -1 ? colName : 1;
  const effectiveLocIdx = colLoc !== -1 ? colLoc : 2;
  const effectiveQtyIdx = colQty !== -1 ? colQty : 3;

  const existingLocMap = new Map<string, WarehouseLocation>();
  existingLocations.forEach((l) => existingLocMap.set(l.barcode.trim().toUpperCase(), l));

  const itemsBySku = new Map<string, InventoryItem>();
  const newLocationsMap = new Map<string, WarehouseLocation>();
  const allLocationCodesSet = new Set<string>();

  const now = Date.now();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sku = (row[effectiveSkuIdx] || '').trim().toUpperCase();
    const name = (row[effectiveNameIdx] || '').trim();
    const locRaw = (row[effectiveLocIdx] || '').trim();

    if (!sku && !name) continue;
    if (!sku) {
      warnings.push(`Ligne ${i + 1} ignorée : SKU vide (${name || 'sans nom'}).`);
      continue;
    }

    const location = locRaw || 'ZONE_STOCK_GENERAL';
    const qtyRaw = (row[effectiveQtyIdx] || '1').replace(',', '.').replace(/[^0-9.-]/g, '');
    const parsedQty = Math.max(0, Math.round(Number(qtyRaw) || 1));

    const lrCode =
      (colLr !== -1 && row[colLr] ? row[colLr].trim().toUpperCase() : '') ||
      makeSafeLrCode(sku, 'ART');
    const category = (colCat !== -1 && row[colCat] ? row[colCat].trim() : '') || 'Pièces Techniques';
    const unit = (colUnit !== -1 && row[colUnit] ? row[colUnit].trim() : '') || 'pcs';
    const gestionnaire = colGest !== -1 && row[colGest] ? row[colGest].trim() : undefined;
    const machinePdt = colMachine !== -1 && row[colMachine] ? row[colMachine].trim() : undefined;
    const refEquipementier = colRefEq !== -1 && row[colRefEq] ? row[colRefEq].trim() : undefined;
    const aliases =
      colAlias !== -1 && row[colAlias]
        ? row[colAlias]
            .split(/[|,]/)
            .map((a) => a.trim().toUpperCase())
            .filter(Boolean)
        : [];

    const finalName = name || sku;
    const item: InventoryItem = {
      id: `imp-${sku.replace(/[^A-Z0-9]/g, '').toLowerCase()}-${now}-${i}`,
      sku,
      name: finalName,
      category,
      itemType: 'article',
      location,
      quantity: parsedQty,
      nominalQuantity: parsedQty,
      onTableQty: 0,
      unit,
      critical: parsedQty <= 2,
      batch: `LOT-${new Date().getFullYear()}`,
      description: `${finalName} (${location})`,
      lrCode,
      crLabel: finalName.toUpperCase().slice(0, 42),
      gestionnaire,
      machinePdt,
      refEquipementier,
      aliases
    };

    if (itemsBySku.has(sku)) {
      warnings.push(`Doublon SKU "${sku}" (ligne ${i + 1}) : la dernière ligne a été conservée.`);
    }
    itemsBySku.set(sku, item);

    const locKey = location.toUpperCase();
    allLocationCodesSet.add(location);
    if (!existingLocMap.has(locKey) && !newLocationsMap.has(locKey)) {
      const zoneGuess = location.includes('-')
        ? location.split('-')[0].trim()
        : 'Magasin Principal';
      newLocationsMap.set(locKey, {
        id: `loc-imp-${makeSafeLrCode(location, 'LOC').toLowerCase()}-${now}-${i}`,
        barcode: location,
        label: location,
        lrCode: makeSafeLrCode(location, 'LOC'),
        crLabel: location.toUpperCase().slice(0, 42),
        zone: zoneGuess || 'Magasin Principal',
        description: `Emplacement créé automatiquement lors de l'import Excel`,
        aliases: [],
        sortOrder: existingLocations.length + newLocationsMap.size
      });
    }
  }

  return {
    items: Array.from(itemsBySku.values()),
    newLocations: Array.from(newLocationsMap.values()),
    allLocationCodes: Array.from(allLocationCodesSet),
    warnings,
    detectedColumns: rawHeaders
  };
}

// =========================================================================
// 3. CUSTOM MISSIONS TEMPLATE DOWNLOAD & PARSER
// =========================================================================

export const MISSIONS_TEMPLATE_HEADERS = [
  'Code_Mission',
  'Titre_Mission',
  'Client',
  'Sens_Stock',
  'Type_Etape',
  'Code_Barre',
  'Libelle_Etape',
  'Quantite',
  'Instruction'
];

export function downloadMissionsTemplateCsv() {
  const sampleRows = [
    MISSIONS_TEMPLATE_HEADERS,
    [
      'LIV-01',
      'Livraison Urgente Bât. 41',
      'CEA LETI',
      'out',
      'location',
      'BAT 41 - MB - D04 / D',
      'Bac D04 / D',
      1,
      'Rendez-vous au bac D04 / D et scannez l\'emplacement.'
    ],
    [
      'LIV-01',
      'Livraison Urgente Bât. 41',
      'CEA LETI',
      'out',
      'article',
      'REF191000004264',
      'WIRE ASSY PBN-NF RF 350',
      1,
      'Prélevez et scannez la pièce WIRE ASSY.'
    ],
    [
      'LIV-01',
      'Livraison Urgente Bât. 41',
      'CEA LETI',
      'out',
      'dock',
      'LOC-ETAGERE-LIVRAISON',
      'Table de Livraison Client',
      1,
      'Déposez la commande sur la Table de Livraison et validez.'
    ],
    [
      'COL-02',
      'Collecte & Réintégration Stock',
      'Retour Client → Magasin',
      'in',
      'location',
      'LOC-ETAGERE-COLLECTE',
      'Table de Collecte',
      1,
      'Rendez-vous à la Table de Collecte et scannez l\'emplacement.'
    ],
    [
      'COL-02',
      'Collecte & Réintégration Stock',
      'Retour Client → Magasin',
      'in',
      'article',
      'REF191000004264',
      'WIRE ASSY PBN-NF RF 350',
      1,
      'Récupérez la pièce sur la table et scannez-la.'
    ],
    [
      'COL-02',
      'Collecte & Réintégration Stock',
      'Retour Client → Magasin',
      'in',
      'location',
      'BAT 41 - MB - D04 / D',
      'Bac D04 / D',
      1,
      'Rangez la pièce dans son bac d\'origine et scannez l\'emplacement.'
    ]
  ];
  triggerCsvDownload('MODELE_MISSIONS_GT_25ANS.csv', sampleRows);
}

export interface ParsedMissionsImportResult {
  missions: Mission[];
  warnings: string[];
}

export function parseSmartMissionsText(
  rawText: string,
  inventory: InventoryItem[],
  locations: WarehouseLocation[]
): ParsedMissionsImportResult {
  const rows = parseDelimitedRows(rawText);
  if (rows.length < 2) {
    return {
      missions: [],
      warnings: ['Aucune mission détectée (il faut un en-tête et au moins une ligne d\'étape).']
    };
  }

  const normHeaders = rows[0].map(stripAccents);
  const findCol = (candidates: string[], fallback: number): number => {
    for (const c of candidates) {
      const idx = normHeaders.findIndex((h) => h === c || h.includes(c));
      if (idx !== -1) return idx;
    }
    return fallback;
  };

  const colCode = findCol(['code_mission', 'code', 'mission_id'], 0);
  const colTitle = findCol(['titre_mission', 'titre', 'title', 'mission'], 1);
  const colClient = findCol(['client', 'destinataire'], 2);
  const colDir = findCol(['sens_stock', 'direction', 'sens'], 3);
  const colType = findCol(['type_etape', 'type'], 4);
  const colBarcode = findCol(['code_barre', 'barcode', 'sku', 'code_attendu'], 5);
  const colLabel = findCol(['libelle_etape', 'libelle', 'cible', 'label'], 6);
  const colQty = findCol(['quantite', 'qte', 'qty'], 7);
  const colInstr = findCol(['instruction', 'consigne', 'action'], 8);

  const warnings: string[] = [];
  const missionsMap = new Map<string, Mission>();
  const now = Date.now();

  const invBySku = new Map(inventory.map((it) => [it.sku.trim().toUpperCase(), it]));
  const locByCode = new Map(locations.map((l) => [l.barcode.trim().toUpperCase(), l]));

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const mCode = (r[colCode] || '').trim().toUpperCase();
    const mTitle = (r[colTitle] || '').trim();
    const barcode = (r[colBarcode] || '').trim();

    if (!mCode && !mTitle && !barcode) continue;
    if (!barcode) {
      warnings.push(`Ligne ${i + 1} ignorée : Code_Barre manquant.`);
      continue;
    }

    const groupKey = mCode || mTitle || `MISSION-${i}`;
    if (!missionsMap.has(groupKey)) {
      const dirRaw = (r[colDir] || 'out').trim().toLowerCase();
      const stockDirection: 'out' | 'in' | 'none' =
        dirRaw === 'in' || dirRaw === 'collecte' || dirRaw === 'entree'
          ? 'in'
          : dirRaw === 'none' || dirRaw === 'aucun' || dirRaw === 'controle'
            ? 'none'
            : 'out';

      missionsMap.set(groupKey, {
        id: `mission-imp-${makeSafeLrCode(groupKey, 'MIS').toLowerCase()}-${now}-${missionsMap.size}`,
        code: mCode || `MIS-${missionsMap.size + 1}`,
        title: mTitle || mCode || `Mission #${missionsMap.size + 1}`,
        client: (r[colClient] || 'GT Logistics • 25 Ans').trim(),
        priority: stockDirection === 'out' ? 'URGENCE CRITIQUE' : 'STANDARD',
        description: `Mission importée depuis Excel (${mTitle || mCode})`,
        timeLimitSeconds: 180,
        basePoints: 1200,
        stockDirection,
        isActive: true,
        sortOrder: missionsMap.size,
        steps: []
      });
    }

    const mission = missionsMap.get(groupKey)!;
    const rawType = (r[colType] || 'article').trim().toLowerCase();
    const barcodeType: MissionStep['barcodeType'] =
      rawType === 'location' || rawType === 'emplacement' || rawType === 'bac'
        ? 'location'
        : rawType === 'dock' || rawType === 'quai' || rawType === 'table'
          ? 'dock'
          : rawType === 'package' || rawType === 'colis'
            ? 'package'
            : rawType === 'seal' || rawType === 'scelle'
              ? 'seal'
              : 'article';

    const qty = Math.max(1, Math.round(Number((r[colQty] || '1').replace(/[^0-9]/g, '')) || 1));
    const matchedInv = invBySku.get(barcode.toUpperCase());
    const matchedLoc = locByCode.get(barcode.toUpperCase());

    const label = (r[colLabel] || '').trim() || matchedInv?.name || matchedLoc?.label || barcode;
    const instruction =
      (r[colInstr] || '').trim() ||
      (barcodeType === 'location'
        ? `Rendez-vous à l'emplacement ${label} et scannez son étiquette.`
        : barcodeType === 'dock'
          ? `Validez l'opération sur ${label}.`
          : `Scannez ${label} (${barcode}).`);

    mission.steps.push({
      id: `step-imp-${now}-${i}`,
      instruction,
      expectedBarcode: barcode,
      barcodeType,
      targetLabel: label,
      lrCode: matchedInv?.lrCode || matchedLoc?.lrCode || makeSafeLrCode(barcode, 'STP'),
      crLabel: (matchedInv?.crLabel || matchedLoc?.crLabel || label).toUpperCase().slice(0, 42),
      quantity: qty,
      scannedCount: 0,
      completed: false,
      hint: `Scannez le code-barres ${barcode}.`
    });
  }

  return {
    missions: Array.from(missionsMap.values()).filter((m) => m.steps.length > 0),
    warnings
  };
}
